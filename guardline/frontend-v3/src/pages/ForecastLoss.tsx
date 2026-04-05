import { useEffect, useState } from 'react'
import api from '../lib/api'
import { useI18n } from '../contexts/I18nContext'

interface ForecastData {
  scenarios?: {
    pessimistic?: number
    base?: number
    optimistic?: number
  }
  at_risk_deals?: Array<{ id: string; name: string; value: number; reason: string }>
  committed?: number
  best_case?: number
}

function fmt(n?: number) {
  if (n === undefined || n === null) return '—'
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`
  return `$${n}`
}

export default function ForecastLoss() {
  const { t } = useI18n()
  const [data, setData] = useState<ForecastData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get<ForecastData>('/api/forecast')
      .then(setData)
      .catch(() => setData({}))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#f1f5f9' }}>{t('kpi.forecast')} & Loss Analysis</h1>
      </div>
      {loading && <div style={{ color: '#94a3b8' }}>{t('common.loading')}</div>}
      {data && (
        <>
          {data.scenarios && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
              {[
                { label: 'Pessimistic', value: data.scenarios.pessimistic, color: '#f87171' },
                { label: 'Base Case', value: data.scenarios.base, color: '#fbbf24' },
                { label: 'Optimistic', value: data.scenarios.optimistic, color: '#34d399' },
              ].map((s) => (
                <div key={s.label} style={{ background: '#1e293b', border: `1px solid ${s.color}30`, borderTop: `2px solid ${s.color}`, borderRadius: 12, padding: '20px 24px' }}>
                  <div style={{ fontSize: 12, color: '#64748b', marginBottom: 8 }}>{s.label}</div>
                  <div style={{ fontSize: 28, fontWeight: 700, color: s.color }}>{fmt(s.value)}</div>
                </div>
              ))}
            </div>
          )}

          {data.at_risk_deals && data.at_risk_deals.length > 0 && (
            <>
              <h2 style={{ fontSize: 16, fontWeight: 600, color: '#f1f5f9', marginBottom: 12 }}>{t('risk.atRisk')}</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {data.at_risk_deals.map((d) => (
                  <div key={d.id} style={{ background: '#1e293b', border: '1px solid rgba(248,113,113,0.2)', borderRadius: 10, padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 16 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: '#f1f5f9' }}>{d.name}</div>
                      <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>{d.reason}</div>
                    </div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: '#f87171' }}>{fmt(d.value)}</div>
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  )
}
