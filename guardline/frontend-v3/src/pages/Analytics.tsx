import { useEffect, useState } from 'react'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js'
import { Bar, Line } from 'react-chartjs-2'
import api from '../lib/api'
import { useI18n } from '../contexts/I18nContext'

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, Title, Tooltip, Legend, ArcElement)

interface AnalyticsData {
  revenue_by_month?: Array<{ month: string; value: number }>
  pipeline_by_stage?: Array<{ stage: string; count: number; value: number }>
  win_loss_ratio?: { won: number; lost: number }
}

const CHART_OPTS = {
  responsive: true,
  plugins: { legend: { labels: { color: '#94a3b8', font: { size: 11 } } } },
  scales: {
    x: { ticks: { color: '#64748b' }, grid: { color: 'rgba(255,255,255,0.05)' } },
    y: { ticks: { color: '#64748b' }, grid: { color: 'rgba(255,255,255,0.05)' } },
  },
}

export default function Analytics() {
  const { t } = useI18n()
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get<AnalyticsData>('/api/analytics')
      .then(setData)
      .catch(() => setData({}))
      .finally(() => setLoading(false))
  }, [])

  const revenueChart = data?.revenue_by_month ? {
    labels: data.revenue_by_month.map((r) => r.month),
    datasets: [{
      label: 'Revenue',
      data: data.revenue_by_month.map((r) => r.value),
      borderColor: '#7c3aed',
      backgroundColor: 'rgba(124,58,237,0.15)',
      tension: 0.4,
      fill: true,
    }],
  } : null

  const pipelineChart = data?.pipeline_by_stage ? {
    labels: data.pipeline_by_stage.map((s) => s.stage),
    datasets: [{
      label: 'Deals',
      data: data.pipeline_by_stage.map((s) => s.count),
      backgroundColor: ['#7c3aed', '#06b6d4', '#fbbf24', '#34d399', '#f87171'],
    }],
  } : null

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#f1f5f9' }}>{t('sidebar.analytics')}</h1>
      </div>
      {loading && <div style={{ color: '#94a3b8' }}>{t('common.loading')}</div>}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {revenueChart && (
          <div style={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: 20 }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, color: '#94a3b8', marginBottom: 16 }}>Revenue by Month</h3>
            <Line data={revenueChart} options={CHART_OPTS as any} />
          </div>
        )}
        {pipelineChart && (
          <div style={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: 20 }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, color: '#94a3b8', marginBottom: 16 }}>Pipeline by Stage</h3>
            <Bar data={pipelineChart} options={CHART_OPTS as any} />
          </div>
        )}
        {data?.win_loss_ratio && (
          <div style={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: 20 }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, color: '#94a3b8', marginBottom: 16 }}>Win / Loss</h3>
            <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 36, fontWeight: 800, color: '#34d399' }}>{data.win_loss_ratio.won}</div>
                <div style={{ fontSize: 12, color: '#64748b' }}>Won</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 36, fontWeight: 800, color: '#f87171' }}>{data.win_loss_ratio.lost}</div>
                <div style={{ fontSize: 12, color: '#64748b' }}>Lost</div>
              </div>
            </div>
          </div>
        )}
      </div>
      {!loading && !data && <div style={{ color: '#64748b' }}>{t('common.empty')}</div>}
    </div>
  )
}
