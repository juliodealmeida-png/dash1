import { useEffect, useState } from 'react'
import api from '../lib/api'
import { useI18n } from '../contexts/I18nContext'

interface ChannelDeal {
  id: string
  channel: string
  partner?: string
  deal_name: string
  value?: number
  stage?: string
  commission?: number
}

function fmt(n?: number, prefix = '') {
  if (n === undefined) return '—'
  if (n >= 1_000_000) return `${prefix}${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${prefix}${(n / 1_000).toFixed(0)}K`
  return `${prefix}${n}`
}

export default function ChannelDeals() {
  const { t } = useI18n()
  const [deals, setDeals] = useState<ChannelDeal[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get<ChannelDeal[] | { deals?: ChannelDeal[] }>('/api/channels/deals')
      .then((d) => setDeals(Array.isArray(d) ? d : (d.deals ?? [])))
      .catch(() => setDeals([]))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#f1f5f9' }}>Channel Deals</h1>
      </div>
      {loading && <div style={{ color: '#94a3b8' }}>{t('common.loading')}</div>}
      {!loading && deals.length === 0 && <div style={{ color: '#64748b' }}>{t('common.empty')}</div>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {deals.map((d) => (
          <div key={d.id} style={{
            background: '#1e293b',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 10,
            padding: '14px 20px',
            display: 'flex',
            alignItems: 'center',
            gap: 16,
          }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#f1f5f9' }}>{d.deal_name}</div>
              <div style={{ fontSize: 12, color: '#64748b' }}>{d.channel}{d.partner ? ` · ${d.partner}` : ''}</div>
            </div>
            {d.stage && <div style={{ fontSize: 12, color: '#94a3b8' }}>{d.stage}</div>}
            <div style={{ fontSize: 14, fontWeight: 600, color: '#a78bfa' }}>{fmt(d.value, '$')}</div>
            {d.commission !== undefined && <div style={{ fontSize: 12, color: '#34d399' }}>Comm: {fmt(d.commission, '$')}</div>}
          </div>
        ))}
      </div>
    </div>
  )
}
