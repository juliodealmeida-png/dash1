import { useEffect, useState } from 'react'
import api from '../lib/api'
import { useI18n } from '../contexts/I18nContext'

interface Campaign {
  id: string
  name: string
  status: string
  sent?: number
  opens?: number
  replies?: number
  created_at?: string
}

export default function Campaigns() {
  const { t } = useI18n()
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    api.get<Campaign[] | { campaigns?: Campaign[] }>('/api/campaigns')
      .then((data) => setCampaigns(Array.isArray(data) ? data : (data.campaigns ?? [])))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#f1f5f9' }}>Campaigns</h1>
      </div>
      {loading && <div style={{ color: '#94a3b8' }}>{t('common.loading')}</div>}
      {error && <div style={{ color: '#f87171' }}>{t('common.error')}: {error}</div>}
      {!loading && !error && campaigns.length === 0 && <div style={{ color: '#64748b' }}>{t('common.empty')}</div>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {campaigns.map((c) => (
          <div key={c.id} style={{
            background: '#1e293b',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 10,
            padding: '16px 20px',
            display: 'flex',
            alignItems: 'center',
            gap: 16,
          }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#f1f5f9' }}>{c.name}</div>
              {c.created_at && <div style={{ fontSize: 12, color: '#64748b' }}>{c.created_at}</div>}
            </div>
            <div style={{ padding: '3px 10px', borderRadius: 12, fontSize: 11, background: 'rgba(255,255,255,0.06)', color: '#94a3b8' }}>{c.status}</div>
            <div style={{ display: 'flex', gap: 20, fontSize: 13 }}>
              {c.sent !== undefined && <span style={{ color: '#64748b' }}>Sent: <strong style={{ color: '#f1f5f9' }}>{c.sent}</strong></span>}
              {c.opens !== undefined && <span style={{ color: '#64748b' }}>Opens: <strong style={{ color: '#06b6d4' }}>{c.opens}</strong></span>}
              {c.replies !== undefined && <span style={{ color: '#64748b' }}>Replies: <strong style={{ color: '#34d399' }}>{c.replies}</strong></span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
