import { useEffect, useState } from 'react'
import api from '../lib/api'
import { useI18n } from '../contexts/I18nContext'

interface InvestorMetrics {
  arr?: number
  mrr?: number
  pipeline_value?: number
  win_rate?: number
  avg_deal_size?: number
  sales_cycle_days?: number
  churn_rate?: number
  nrr?: number
}

function MetricRow({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
      <div>
        <div style={{ fontSize: 13, color: '#94a3b8' }}>{label}</div>
        {sub && <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>{sub}</div>}
      </div>
      <div style={{ fontSize: 20, fontWeight: 700, color: '#f1f5f9' }}>{value}</div>
    </div>
  )
}

function fmt(n?: number, prefix = '', suffix = '') {
  if (n === undefined || n === null) return '—'
  if (n >= 1_000_000) return `${prefix}${(n / 1_000_000).toFixed(2)}M${suffix}`
  if (n >= 1_000) return `${prefix}${(n / 1_000).toFixed(1)}K${suffix}`
  return `${prefix}${n}${suffix}`
}

export default function InvestorPipeline() {
  const { t } = useI18n()
  const [metrics, setMetrics] = useState<InvestorMetrics | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get<InvestorMetrics>('/api/investor/metrics')
      .then(setMetrics)
      .catch(() => setMetrics({}))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#f1f5f9' }}>{t('sidebar.investor')}</h1>
        <p style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>Key metrics for investor reporting</p>
      </div>
      {loading && <div style={{ color: '#94a3b8' }}>{t('common.loading')}</div>}
      {metrics && (
        <div style={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '0 24px' }}>
          <MetricRow label="ARR" value={fmt(metrics.arr, '$')} sub="Annual Recurring Revenue" />
          <MetricRow label="MRR" value={fmt(metrics.mrr, '$')} sub="Monthly Recurring Revenue" />
          <MetricRow label="Pipeline Value" value={fmt(metrics.pipeline_value, '$')} />
          <MetricRow label="Win Rate" value={metrics.win_rate !== undefined ? `${metrics.win_rate}%` : '—'} />
          <MetricRow label="Avg Deal Size" value={fmt(metrics.avg_deal_size, '$')} />
          <MetricRow label="Sales Cycle" value={metrics.sales_cycle_days !== undefined ? `${metrics.sales_cycle_days}d` : '—'} />
          <MetricRow label="NRR" value={metrics.nrr !== undefined ? `${metrics.nrr}%` : '—'} sub="Net Revenue Retention" />
          <MetricRow label="Churn Rate" value={metrics.churn_rate !== undefined ? `${metrics.churn_rate}%` : '—'} />
        </div>
      )}
    </div>
  )
}
