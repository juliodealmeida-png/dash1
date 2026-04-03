import { useEffect, useState } from 'react'
import api from '../lib/api'
import { useI18n } from '../contexts/I18nContext'

interface Deal {
  id: string
  deal_name?: string
  companyName?: string
  title?: string
  deal_stage?: string
  stage?: string
  deal_amount?: number
  value?: number
  deal_probability?: number
  riskScore?: number
  risk_score?: number
  daysSinceContact?: number
  days_since_contact?: number
}

interface DashboardMetrics {
  pipeline_total?: number
  healthScore?: number
  health_score?: number
  winRate?: number
  win_rate?: number
  coverageRatio?: number
  coverage_ratio?: number
  forecast_90d?: number
  active_deals?: number
  at_risk_count?: number
  kpis?: Record<string, number>
  health?: Record<string, number>
}

function fmt(n?: number, prefix = '') {
  if (n === undefined || n === null) return '—'
  if (n >= 1_000_000) return `${prefix}${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${prefix}${(n / 1_000).toFixed(0)}K`
  return `${prefix}${n}`
}

function stagePt(s?: string) {
  const map: Record<string, string> = {
    prospecting: 'Prospecção', qualification: 'Qualificação', proposal: 'Proposta',
    negotiation: 'Negociação', scope_validate: 'Escopo', active_pursuit: 'Pursuit',
    contract: 'Contrato', won: 'Ganho', lost: 'Perdido',
  }
  return map[s || ''] || s || '—'
}

function riskColor(score: number) {
  if (score >= 75) return '#f87171'
  if (score >= 50) return '#fbbf24'
  return '#34d399'
}

export default function PipelineHealth() {
  const { t } = useI18n()
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null)
  const [deals, setDeals] = useState<Deal[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([
      api.get<DashboardMetrics>('/api/home/dashboard'),
      api.get<Deal[] | { deals?: Deal[] }>('/api/deals'),
    ])
      .then(([m, d]) => {
        setMetrics(m)
        setDeals(Array.isArray(d) ? d : (d.deals ?? []))
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  const openDeals = deals.filter((d) => {
    const st = d.deal_stage || d.stage || ''
    return st !== 'won' && st !== 'lost'
  })
  const atRisk = openDeals.filter((d) => (d.riskScore || d.risk_score || 0) >= 75)
  const stale = openDeals.filter((d) => (d.daysSinceContact || d.days_since_contact || 0) >= 7)

  const byStage: Record<string, { count: number; value: number }> = {}
  openDeals.forEach((d) => {
    const st = d.deal_stage || d.stage || 'unknown'
    if (!byStage[st]) byStage[st] = { count: 0, value: 0 }
    byStage[st].count++
    byStage[st].value += d.deal_amount || d.value || 0
  })

  const kpis = metrics?.kpis || metrics || {}
  const healthScore = (metrics?.health as Record<string, number>)?.health_score ?? metrics?.healthScore ?? metrics?.health_score ?? (kpis as Record<string, number>).health_score ?? 0
  const winRate = metrics?.winRate ?? metrics?.win_rate ?? (kpis as Record<string, number>).win_rate ?? 0
  const coverage = metrics?.coverageRatio ?? metrics?.coverage_ratio ?? 0

  const hColor = healthScore >= 70 ? '#34d399' : healthScore >= 40 ? '#fbbf24' : '#f87171'

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#f1f5f9' }}>Saúde do Pipeline</h1>
        <div style={{ fontSize: 13, color: '#94a3b8' }}>Visão completa de saúde e riscos</div>
      </div>

      {loading && <div style={{ color: '#94a3b8' }}>{t('common.loading')}</div>}
      {error && <div style={{ color: '#f87171' }}>{error}</div>}

      {!loading && !error && (
        <>
          {/* KPI strip */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, marginBottom: 20 }}>
            {[
              { label: 'Health Score', value: String(healthScore), color: hColor },
              { label: 'Coverage', value: coverage ? `${Number(coverage).toFixed(1)}×` : '—', color: '#06b6d4' },
              { label: 'Em Risco', value: String(atRisk.length), color: '#f87171' },
              { label: 'Stale (≥7d)', value: String(stale.length), color: '#fbbf24' },
              { label: 'Win Rate', value: `${winRate}%`, color: '#34d399' },
            ].map((k) => (
              <div key={k.label} style={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: 16, textAlign: 'center' }}>
                <div style={{ fontSize: 10, color: '#64748b', textTransform: 'uppercase', marginBottom: 4 }}>{k.label}</div>
                <div style={{ fontSize: 28, fontWeight: 700, color: k.color }}>{k.value}</div>
              </div>
            ))}
          </div>

          {/* Two column layout */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {/* Stage distribution */}
            <div style={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: 18 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#f1f5f9', marginBottom: 14 }}>Distribuição por Estágio</div>
              {Object.entries(byStage).map(([st, data]) => (
                <div key={st} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: 13 }}>
                  <span style={{ color: '#f1f5f9' }}>{stagePt(st)}</span>
                  <span style={{ color: '#94a3b8' }}>
                    <strong style={{ color: '#f1f5f9' }}>{data.count}</strong> deals · <span style={{ color: '#06b6d4' }}>{fmt(data.value, '$')}</span>
                  </span>
                </div>
              ))}
              {Object.keys(byStage).length === 0 && <div style={{ color: '#64748b', fontSize: 13 }}>Nenhum deal ativo.</div>}
            </div>

            {/* At-risk deals */}
            <div style={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: 18 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#f1f5f9', marginBottom: 14 }}>Deals em Risco (score ≥75)</div>
              {atRisk.length === 0 && <div style={{ color: '#64748b', fontSize: 13, padding: '12px 0' }}>Nenhum deal em risco crítico.</div>}
              {atRisk.sort((a, b) => (b.riskScore || b.risk_score || 0) - (a.riskScore || a.risk_score || 0)).slice(0, 8).map((d) => {
                const rs = d.riskScore || d.risk_score || 0
                return (
                  <div key={d.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: 13 }}>
                    <div>
                      <div style={{ fontWeight: 600, color: '#f1f5f9' }}>{d.deal_name || d.companyName || d.title || '—'}</div>
                      <div style={{ fontSize: 11, color: '#64748b' }}>{stagePt(d.deal_stage || d.stage)} · {fmt(d.deal_amount || d.value, '$')}</div>
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: riskColor(rs), background: `${riskColor(rs)}15`, padding: '2px 10px', borderRadius: 8 }}>{rs}</div>
                  </div>
                )
              })}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
