import { useEffect, useMemo, useState } from 'react'
import { Doughnut, Bar } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  ArcElement,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
} from 'chart.js'
import Section from '../components/Section'
import KpiCard from '../components/KpiCard'
import { Table } from '../components/Table'
import { api } from '../lib/api'
import type { MetricsDashboard, PipelineStats, Signal } from '../lib/types'
import { useAuth } from '../contexts/AuthContext'

ChartJS.register(ArcElement, BarElement, CategoryScale, LinearScale, Tooltip, Legend)

function money(n: number) {
  return n.toLocaleString(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
}

export default function CommandCenter() {
  const { getAccessToken } = useAuth()
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)
  const [metrics, setMetrics] = useState<MetricsDashboard | null>(null)
  const [pipeline, setPipeline] = useState<PipelineStats | null>(null)
  const [signals, setSignals] = useState<Signal[]>([])

  useEffect(() => {
    let on = true
    ;(async () => {
      setLoading(true)
      setErr(null)
      try {
        const token = await getAccessToken()
        if (!token) throw new Error('Sem token')
        const [m, p, s] = await Promise.all([
          api.metrics.dashboard(token),
          api.deals.pipelineStats(token),
          api.signals.list(token, 20, true),
        ])
        if (!on) return
        setMetrics(m)
        setPipeline(p)
        setSignals(s)
      } catch (e: any) {
        if (!on) return
        setErr(e?.message || 'Erro ao carregar métricas')
      } finally {
        if (!on) return
        setLoading(false)
      }
    })()
    return () => {
      on = false
    }
  }, [getAccessToken])

  const kpis = useMemo(() => {
    if (!metrics) return []
    return [
      { label: 'Pipeline Total', value: money(metrics.pipelineTotal), tone: 'info' as const },
      { label: 'Active Deals', value: metrics.activeDeals, tone: 'neutral' as const },
      { label: 'At Risk', value: metrics.atRiskDeals, tone: metrics.atRiskDeals > 0 ? ('warn' as const) : ('good' as const) },
      { label: 'Win Rate', value: `${Math.round(metrics.winRate)}%`, tone: metrics.winRate >= 35 ? ('good' as const) : ('warn' as const) },
      { label: 'Forecast (Committed)', value: money(metrics.forecast.committed), tone: 'info' as const },
      { label: 'Critical Alerts', value: metrics.criticalAlerts, tone: metrics.criticalAlerts > 0 ? ('bad' as const) : ('good' as const) },
      { label: 'Leads (Month)', value: metrics.leadsThisMonth, tone: 'neutral' as const },
      { label: 'Fraud Today', value: metrics.fraudToday, tone: metrics.fraudToday > 0 ? ('bad' as const) : ('good' as const) },
      { label: 'Health Score', value: `${Math.round(metrics.healthScore)}/100`, tone: metrics.healthScore >= 70 ? ('good' as const) : ('warn' as const) },
      { label: 'Coverage Ratio', value: `${Math.round(metrics.coverageRatio * 100)}%`, tone: metrics.coverageRatio >= 1 ? ('good' as const) : ('warn' as const) },
    ]
  }, [metrics])

  const pipelineChart = useMemo(() => {
    if (!pipeline) return null
    const labels = pipeline.byStage.map(s => s.label || s.stage)
    const values = pipeline.byStage.map(s => s.valueSum)
    return {
      labels,
      datasets: [
        {
          label: 'Pipeline Value',
          data: values,
          backgroundColor: 'rgba(99,102,241,0.35)',
          borderColor: 'rgba(99,102,241,0.65)',
          borderWidth: 1,
        },
      ],
    }
  }, [pipeline])

  const forecastChart = useMemo(() => {
    if (!metrics) return null
    return {
      labels: ['Committed', 'Best Case'],
      datasets: [
        {
          label: 'Forecast',
          data: [metrics.forecast.committed, metrics.forecast.bestCase],
          backgroundColor: ['rgba(34,211,238,0.25)', 'rgba(167,139,250,0.25)'],
          borderColor: ['rgba(34,211,238,0.6)', 'rgba(167,139,250,0.6)'],
          borderWidth: 1,
        },
      ],
    }
  }, [metrics])

  if (loading) return <div style={{ color: '#94a3b8' }}>Carregando…</div>
  if (err) return <div style={{ color: '#fca5a5' }}>{err}</div>

  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0, 1fr))', gap: 12 }}>
        {kpis.map(k => (
          <KpiCard key={k.label} label={k.label} value={k.value} tone={k.tone} />
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 14 }}>
        <Section title="Pipeline por Stage">
          {pipelineChart ? <Bar data={pipelineChart} options={{ responsive: true, plugins: { legend: { display: false } } }} /> : null}
        </Section>
        <Section title="Forecast">
          {forecastChart ? <Doughnut data={forecastChart} options={{ responsive: true, plugins: { legend: { position: 'bottom' } } }} /> : null}
        </Section>
      </div>

      <Section title="Signals (unread)" right={<span style={{ color: '#94a3b8', fontSize: 12 }}>{signals.length} itens</span>}>
        <Table
          columns={[
            { key: 'severity', label: 'Severity' },
            { key: 'title', label: 'Title' },
            { key: 'deal', label: 'Deal', render: (s: Signal) => s.deal?.companyName || '' },
            { key: 'createdAt', label: 'Created', render: (s: Signal) => (s.createdAt || '').slice(0, 19).replace('T', ' ') },
          ]}
          rows={signals}
        />
      </Section>
    </div>
  )
}

