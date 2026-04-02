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
  meddpicc?: string | Record<string, string>
}

const MKEYS = ['metrics', 'economicBuyer', 'decisionCriteria', 'decisionProcess', 'paperProcess', 'identifyPain', 'champion', 'competition'] as const
const MLABELS = ['M', 'E', 'D', 'D', 'P', 'I', 'C', 'C']
const MFULL = ['Metrics', 'Economic Buyer', 'Decision Criteria', 'Decision Process', 'Paper Process', 'Identify Pain', 'Champion', 'Competition']

function parseMeddpicc(d: Deal): Record<string, string> {
  if (!d.meddpicc) return {}
  if (typeof d.meddpicc === 'string') {
    try { return JSON.parse(d.meddpicc) } catch { return {} }
  }
  return d.meddpicc as Record<string, string>
}

function pctColor(pct: number) {
  if (pct >= 75) return '#34d399'
  if (pct >= 50) return '#fbbf24'
  return '#f87171'
}

function stagePt(s?: string) {
  const map: Record<string, string> = {
    prospecting: 'Prospecção', qualification: 'Qualificação', proposal: 'Proposta',
    negotiation: 'Negociação', 'scope_validate': 'Escopo', 'active_pursuit': 'Pursuit',
    contract: 'Contrato', won: 'Ganho', lost: 'Perdido',
  }
  return map[s || ''] || s || '—'
}

export default function Meddpicc() {
  const { t } = useI18n()
  const [deals, setDeals] = useState<Deal[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    api.get<Deal[] | { deals?: Deal[] }>('/api/deals')
      .then((d) => setDeals(Array.isArray(d) ? d : (d.deals ?? [])))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  const openDeals = deals.filter((d) => {
    const st = d.deal_stage || d.stage || ''
    return st !== 'won' && st !== 'lost'
  })

  const parsed = openDeals.map((d) => {
    const m = parseMeddpicc(d)
    const filled = MKEYS.filter((k) => m[k] && m[k].trim().length > 0).length
    const pct = Math.round((filled / 8) * 100)
    return { deal: d, meddpicc: m, filled, pct }
  }).sort((a, b) => a.pct - b.pct)

  const avgPct = parsed.length > 0
    ? Math.round(parsed.reduce((s, p) => s + p.pct, 0) / parsed.length)
    : 0

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#f1f5f9' }}>MEDDPICC Compliance</h1>
        <div style={{ fontSize: 13, color: '#94a3b8' }}>
          {openDeals.length} deals ativos · Média: {avgPct}% preenchido
        </div>
      </div>

      {loading && <div style={{ color: '#94a3b8' }}>{t('common.loading')}</div>}
      {error && <div style={{ color: '#f87171' }}>{error}</div>}

      {!loading && !error && (
        <div style={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                <th style={{ textAlign: 'left', padding: '8px 12px', color: '#64748b', fontSize: 11 }}>Deal</th>
                <th style={{ textAlign: 'left', padding: '8px 12px', color: '#64748b', fontSize: 11 }}>Stage</th>
                <th style={{ textAlign: 'center', padding: '8px 12px', color: '#64748b', fontSize: 11 }}>Score</th>
                {MFULL.map((label, idx) => (
                  <th key={idx} style={{ textAlign: 'center', padding: '8px 6px', color: '#64748b', fontSize: 10 }} title={label}>{MLABELS[idx]}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {parsed.length === 0 && (
                <tr><td colSpan={11} style={{ padding: 24, textAlign: 'center', color: '#64748b' }}>Nenhum deal ativo encontrado.</td></tr>
              )}
              {parsed.map((p) => (
                <tr key={p.deal.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <td style={{ padding: '8px 12px', fontWeight: 600, color: '#f1f5f9', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {p.deal.deal_name || p.deal.companyName || p.deal.title || '—'}
                  </td>
                  <td style={{ padding: '8px 12px', fontSize: 11, color: '#94a3b8' }}>{stagePt(p.deal.deal_stage || p.deal.stage)}</td>
                  <td style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 700, color: pctColor(p.pct) }}>{p.pct}%</td>
                  {MKEYS.map((k, idx) => {
                    const has = !!(p.meddpicc[k] && p.meddpicc[k].trim().length > 0)
                    return (
                      <td key={idx} style={{ padding: '8px 6px', textAlign: 'center' }}>
                        <span style={{
                          display: 'inline-block', width: 20, height: 20, borderRadius: 4, lineHeight: '20px',
                          fontSize: 10, fontWeight: 700,
                          background: has ? 'rgba(52,211,153,0.2)' : 'rgba(248,113,113,0.15)',
                          color: has ? '#34d399' : '#f87171',
                        }}>
                          {has ? '✓' : '✗'}
                        </span>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
