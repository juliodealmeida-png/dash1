import { useEffect, useState } from 'react'
import api from '../lib/api'
import { useI18n } from '../contexts/I18nContext'

interface FraudAlert {
  id: string
  type: string
  severity: 'critical' | 'high' | 'medium' | 'low'
  description: string
  entity?: string
  created_at?: string
  resolved?: boolean
}

const SEV_COLORS = { critical: '#f87171', high: '#fb923c', medium: '#fbbf24', low: '#34d399' }

export default function FraudMap() {
  const { t } = useI18n()
  const [alerts, setAlerts] = useState<FraudAlert[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>('all')

  useEffect(() => {
    api.get<FraudAlert[] | { alerts?: FraudAlert[] }>('/api/fraud/alerts')
      .then((data) => setAlerts(Array.isArray(data) ? data : (data.alerts ?? [])))
      .catch(() => setAlerts([]))
      .finally(() => setLoading(false))
  }, [])

  const filtered = filter === 'all' ? alerts : alerts.filter((a) => a.severity === filter)

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#f1f5f9' }}>{t('sidebar.fraud')}</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          {['all', 'critical', 'high', 'medium', 'low'].map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              style={{
                background: filter === s ? 'rgba(124,58,237,0.2)' : 'transparent',
                border: `1px solid ${filter === s ? '#7c3aed' : 'rgba(255,255,255,0.1)'}`,
                color: filter === s ? '#a78bfa' : '#64748b',
                borderRadius: 6,
                padding: '4px 12px',
                fontSize: 12,
                cursor: 'pointer',
                textTransform: 'capitalize',
              }}
            >
              {s}
            </button>
          ))}
        </div>
      </div>
      {loading && <div style={{ color: '#94a3b8' }}>{t('common.loading')}</div>}
      {!loading && filtered.length === 0 && <div style={{ color: '#64748b' }}>{t('common.empty')}</div>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {filtered.map((a) => (
          <div key={a.id} style={{
            background: '#1e293b',
            border: `1px solid ${SEV_COLORS[a.severity]}30`,
            borderLeft: `3px solid ${SEV_COLORS[a.severity]}`,
            borderRadius: 10,
            padding: '14px 20px',
            opacity: a.resolved ? 0.5 : 1,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
              <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 10, background: `${SEV_COLORS[a.severity]}20`, color: SEV_COLORS[a.severity] }}>
                {a.severity.toUpperCase()}
              </span>
              <span style={{ fontSize: 11, color: '#64748b', background: 'rgba(255,255,255,0.06)', padding: '2px 8px', borderRadius: 10 }}>{a.type}</span>
              {a.entity && <span style={{ fontSize: 12, color: '#94a3b8' }}>{a.entity}</span>}
              <span style={{ fontSize: 11, color: '#64748b', marginLeft: 'auto' }}>{a.created_at}</span>
            </div>
            <div style={{ fontSize: 13, color: '#f1f5f9' }}>{a.description}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
