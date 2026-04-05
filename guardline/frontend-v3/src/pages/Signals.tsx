import { useEffect, useState } from 'react'
import api from '../lib/api'
import { useI18n } from '../contexts/I18nContext'

interface Signal {
  id: string
  type: string
  message: string
  deal_name?: string
  created_at?: string
  priority?: 'high' | 'medium' | 'low'
}

const PRIORITY_COLOR = { high: '#f87171', medium: '#fbbf24', low: '#34d399' }

export default function Signals() {
  const { t } = useI18n()
  const [signals, setSignals] = useState<Signal[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    api.get<Signal[] | { signals?: Signal[] }>('/api/signals')
      .then((data) => setSignals(Array.isArray(data) ? data : (data.signals ?? [])))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#f1f5f9' }}>{t('signals.title')}</h1>
      </div>
      {loading && <div style={{ color: '#94a3b8' }}>{t('common.loading')}</div>}
      {error && <div style={{ color: '#f87171' }}>{t('common.error')}: {error}</div>}
      {!loading && !error && signals.length === 0 && <div style={{ color: '#64748b' }}>{t('common.empty')}</div>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {signals.map((s) => (
          <div key={s.id} style={{
            background: '#1e293b',
            border: '1px solid rgba(255,255,255,0.08)',
            borderLeft: `3px solid ${s.priority ? PRIORITY_COLOR[s.priority] : '#94a3b8'}`,
            borderRadius: 10,
            padding: '14px 20px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
              <span style={{ fontSize: 11, color: '#64748b', background: 'rgba(255,255,255,0.06)', padding: '2px 8px', borderRadius: 10 }}>{s.type}</span>
              {s.deal_name && <span style={{ fontSize: 12, color: '#a78bfa' }}>{s.deal_name}</span>}
              <span style={{ fontSize: 11, color: '#64748b', marginLeft: 'auto' }}>{s.created_at}</span>
            </div>
            <div style={{ fontSize: 13, color: '#f1f5f9' }}>{s.message}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
