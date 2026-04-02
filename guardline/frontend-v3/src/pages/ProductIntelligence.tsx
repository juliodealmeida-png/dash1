import { useEffect, useState } from 'react'
import api from '../lib/api'
import { useI18n } from '../contexts/I18nContext'

interface ProductMetric {
  product: string
  revenue?: number
  deals?: number
  win_rate?: number
  avg_deal_size?: number
  top_objections?: string[]
}

function fmt(n?: number, prefix = '') {
  if (n === undefined) return '—'
  if (n >= 1_000_000) return `${prefix}${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${prefix}${(n / 1_000).toFixed(0)}K`
  return `${prefix}${n}`
}

export default function ProductIntelligence() {
  const { t } = useI18n()
  const [products, setProducts] = useState<ProductMetric[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get<ProductMetric[] | { products?: ProductMetric[] }>('/api/products/intelligence')
      .then((d) => setProducts(Array.isArray(d) ? d : (d.products ?? [])))
      .catch(() => setProducts([]))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#f1f5f9' }}>Product Intelligence</h1>
      </div>
      {loading && <div style={{ color: '#94a3b8' }}>{t('common.loading')}</div>}
      {!loading && products.length === 0 && <div style={{ color: '#64748b' }}>{t('common.empty')}</div>}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
        {products.map((p) => (
          <div key={p.product} style={{
            background: '#1e293b',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 12,
            padding: 20,
          }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: '#f1f5f9', marginBottom: 16 }}>{p.product}</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {p.revenue !== undefined && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                  <span style={{ color: '#64748b' }}>Revenue</span>
                  <span style={{ color: '#a78bfa', fontWeight: 600 }}>{fmt(p.revenue, '$')}</span>
                </div>
              )}
              {p.deals !== undefined && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                  <span style={{ color: '#64748b' }}>Deals</span>
                  <span style={{ color: '#f1f5f9', fontWeight: 600 }}>{p.deals}</span>
                </div>
              )}
              {p.win_rate !== undefined && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                  <span style={{ color: '#64748b' }}>Win Rate</span>
                  <span style={{ color: '#34d399', fontWeight: 600 }}>{p.win_rate}%</span>
                </div>
              )}
              {p.avg_deal_size !== undefined && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                  <span style={{ color: '#64748b' }}>Avg Deal</span>
                  <span style={{ color: '#06b6d4', fontWeight: 600 }}>{fmt(p.avg_deal_size, '$')}</span>
                </div>
              )}
            </div>
            {p.top_objections && p.top_objections.length > 0 && (
              <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ fontSize: 11, color: '#64748b', marginBottom: 6 }}>TOP OBJECTIONS</div>
                {p.top_objections.map((obj, i) => (
                  <div key={i} style={{ fontSize: 12, color: '#94a3b8', padding: '3px 0' }}>• {obj}</div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
