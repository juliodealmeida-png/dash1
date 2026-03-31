import { useEffect, useState, useCallback } from 'react'
import {
  AreaChart, Area, ResponsiveContainer, Tooltip,
  FunnelChart, Funnel, LabelList,
} from 'recharts'
import {
  TrendingUp, DollarSign, Target, Clock, AlertTriangle,
  CheckCircle2, AlertCircle, Info, ArrowRight, RefreshCw,
  Loader2, Activity,
} from 'lucide-react'
import { api, fmtCurrency, daysSince } from '../lib/api'
import Topbar from '../components/Topbar'
import { useSocket } from '../context/SocketContext'

// ── Types ────────────────────────────────────────────────
interface DashboardData {
  pipeline: { total: number; count: number; atRisk: number }
  winRate: number
  forecastCommitted: number
  forecastBestCase: number
  leadsThisMonth: number
  criticalSignals: number
  recentSignals: Array<{
    id: string
    title: string
    severity: string
    createdAt: string
    deal?: { companyName: string; value: number }
  }>
}

interface Deal {
  id: string
  title: string
  companyName: string
  value: number
  stage: string
  riskScore: number
  updatedAt: string
  stageChangedAt: string
  probability: number
}

interface KpiCard {
  label: string
  value: string
  icon: React.ReactNode
  color: string
  trend?: number
}

// ── Sparkline mock data ──────────────────────────────────
const sparkData = Array.from({ length: 8 }, (_, i) => ({
  v: 40 + Math.random() * 60,
}))

// ── Stage funnel config ──────────────────────────────────
const STAGES = [
  { key: 'prospecting', label: 'Prospecção',   fill: '#7c3aed' },
  { key: 'qualified',   label: 'Qualificado',  fill: '#9d5cf5' },
  { key: 'presentation',label: 'Apresentação', fill: '#06b6d4' },
  { key: 'proposal',    label: 'Proposta',     fill: '#0891b2' },
  { key: 'negotiation', label: 'Negociação',   fill: '#10b981' },
  { key: 'won',         label: 'Fechado',      fill: '#059669' },
]

// ── Alert severity style ──────────────────────────────────
function alertStyle(severity: string) {
  if (severity === 'critical' || severity === 'high')
    return { border: 'border-accent-red/20 bg-accent-red/5', icon: <AlertCircle size={14} className="text-accent-red shrink-0 mt-0.5" /> }
  if (severity === 'warning' || severity === 'medium')
    return { border: 'border-accent-amber/20 bg-accent-amber/5', icon: <AlertTriangle size={14} className="text-accent-amber shrink-0 mt-0.5" /> }
  return { border: 'border-border-subtle bg-transparent', icon: <Info size={14} className="text-accent-cyan shrink-0 mt-0.5" /> }
}

// ── KPI Card component ────────────────────────────────────
function KpiCardItem({ label, value, icon, color }: KpiCard) {
  return (
    <div className="kpi-card flex-1 min-w-0">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-text-muted font-medium">{label}</span>
        <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${color}`}>
          {icon}
        </div>
      </div>
      <div className="text-lg font-bold text-text-primary leading-none">{value}</div>
      <div className="mt-2 h-8">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={sparkData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
            <Area
              type="monotone"
              dataKey="v"
              stroke="#7c3aed"
              strokeWidth={1.5}
              fill="rgba(124,58,237,0.08)"
              dot={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

export default function CommandCenter() {
  const { socket } = useSocket()
  const [dashboard, setDashboard] = useState<DashboardData | null>(null)
  const [deals, setDeals] = useState<Deal[]>([])
  const [funnelData, setFunnelData] = useState<{ name: string; value: number; fill: string }[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [dashRes, dealsRes] = await Promise.all([
        api.get<{ data: DashboardData }>('/metrics/dashboard'),
        api.get<{ data: Deal[] }>('/deals?perPage=100'),
      ])
      setDashboard(dashRes.data)
      const ds = dealsRes.data ?? []
      setDeals(ds)

      // Build funnel
      const stageCounts: Record<string, number> = {}
      ds.forEach((d) => { stageCounts[d.stage] = (stageCounts[d.stage] ?? 0) + d.value })
      setFunnelData(
        STAGES.map((s) => ({
          name: s.label,
          value: Math.round((stageCounts[s.key] ?? 0) / 1000),
          fill: s.fill,
        })).filter((s) => s.value > 0)
      )
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    if (!socket) return

    socket.on('deal:updated', () => load())
    socket.on('deal:created', () => load())
    socket.on('signal:new', () => load())
    socket.on('metrics:refresh', () => load())

    return () => {
      socket.off('deal:updated')
      socket.off('deal:created')
      socket.off('signal:new')
      socket.off('metrics:refresh')
    }
  }, [socket, load])

  // Derived data
  const staleDeals = deals.filter((d) => d.stage !== 'won' && d.stage !== 'lost' && daysSince(d.stageChangedAt ?? d.updatedAt) > 14)
  const hotDeals = deals
    .filter((d) => d.stage !== 'won' && d.stage !== 'lost')
    .sort((a, b) => b.probability - a.probability)
    .slice(0, 3)

  const kpis: KpiCard[] = dashboard
    ? [
        {
          label: 'Pipeline Total',
          value: fmtCurrency(dashboard.pipeline.total),
          icon: <DollarSign size={14} />,
          color: 'bg-accent-purple/10 text-accent-purple-light',
        },
        {
          label: 'Win Rate 90d',
          value: `${dashboard.winRate}%`,
          icon: <Target size={14} />,
          color: 'bg-accent-green/10 text-accent-green',
        },
        {
          label: 'Forecast Q',
          value: fmtCurrency(dashboard.forecastBestCase),
          icon: <TrendingUp size={14} />,
          color: 'bg-accent-cyan/10 text-accent-cyan',
        },
        {
          label: 'Deals Ativos',
          value: String(dashboard.pipeline.count),
          icon: <Activity size={14} />,
          color: 'bg-accent-amber/10 text-accent-amber',
        },
        {
          label: 'Em Risco',
          value: String(dashboard.pipeline.atRisk),
          icon: <AlertTriangle size={14} />,
          color: 'bg-accent-red/10 text-accent-red',
        },
      ]
    : []

  return (
    <div className="flex flex-col min-h-full">
      <Topbar
        title="Command Center"
        subtitle={new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
        onRefresh={load}
      />

      <div className="p-5 space-y-5 animate-fade-in">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-accent-purple" />
          </div>
        ) : (
          <>
            {/* KPI Row */}
            <div className="flex gap-3">
              {kpis.map((k) => (
                <KpiCardItem key={k.label} {...k} />
              ))}
            </div>

            {/* Forecast + Alerts + Funnel */}
            <div className="grid grid-cols-3 gap-4">
              {/* AI Forecast */}
              <div className="card col-span-1">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-6 h-6 rounded-lg bg-accent-purple/10 flex items-center justify-center">
                    <TrendingUp size={12} className="text-accent-purple-light" />
                  </div>
                  <span className="text-xs font-semibold text-text-primary">AI Forecast</span>
                  <span className="badge badge-purple ml-auto">IA</span>
                </div>
                <div className="space-y-3">
                  <div>
                    <div className="text-xs text-text-muted mb-0.5">Pipeline Ponderado</div>
                    <div className="text-2xl font-bold text-gradient-purple">
                      {dashboard ? fmtCurrency(dashboard.forecastBestCase) : '—'}
                    </div>
                  </div>
                  <div className="h-px bg-border-subtle" />
                  <div className="text-xs font-semibold text-text-secondary mb-2">Top deals para fechar</div>
                  {hotDeals.map((d) => (
                    <div key={d.id} className="flex items-center justify-between gap-2 py-1">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="health-dot green" />
                        <span className="text-xs text-text-primary truncate">{d.companyName}</span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="text-xs text-text-muted">{fmtCurrency(d.value)}</span>
                        <span className="badge badge-green">{d.probability}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Alerts */}
              <div className="card col-span-1">
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle size={14} className="text-accent-amber" />
                  <span className="text-xs font-semibold text-text-primary">Alertas Inteligentes</span>
                  {staleDeals.length > 0 && (
                    <span className="badge badge-red ml-auto">{staleDeals.length}</span>
                  )}
                </div>
                <div className="space-y-2">
                  {staleDeals.length > 0 && (
                    <div className={`alert-item border border-accent-red/20 bg-accent-red/5`}>
                      <AlertCircle size={14} className="text-accent-red shrink-0 mt-0.5" />
                      <div>
                        <div className="text-xs font-medium text-text-primary">
                          {staleDeals.length} deals parados &gt;14 dias
                        </div>
                        <div className="text-[10px] text-text-muted mt-0.5">Ação: revisar ou arquivar</div>
                      </div>
                    </div>
                  )}
                  {dashboard && dashboard.pipeline.atRisk > 0 && (
                    <div className="alert-item border border-accent-amber/20 bg-accent-amber/5">
                      <AlertTriangle size={14} className="text-accent-amber shrink-0 mt-0.5" />
                      <div>
                        <div className="text-xs font-medium text-text-primary">
                          {dashboard.pipeline.atRisk} deals em risco alto
                        </div>
                        <div className="text-[10px] text-text-muted mt-0.5">Risk score &gt;75</div>
                      </div>
                    </div>
                  )}
                  {dashboard?.recentSignals?.slice(0, 2).map((s) => {
                    const { border, icon } = alertStyle(s.severity)
                    return (
                      <div key={s.id} className={`alert-item border ${border}`}>
                        {icon}
                        <div className="min-w-0">
                          <div className="text-xs font-medium text-text-primary truncate">{s.title}</div>
                          {s.deal && (
                            <div className="text-[10px] text-text-muted mt-0.5">
                              {s.deal.companyName} · {fmtCurrency(s.deal.value)}
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                  {(!staleDeals.length && !dashboard?.pipeline.atRisk) && (
                    <div className="flex items-center gap-2 text-xs text-text-muted py-2">
                      <CheckCircle2 size={14} className="text-accent-green" />
                      Pipeline saudável — sem alertas críticos
                    </div>
                  )}
                </div>
              </div>

              {/* Funnel */}
              <div className="card col-span-1">
                <div className="flex items-center gap-2 mb-3">
                  <Target size={14} className="text-accent-cyan" />
                  <span className="text-xs font-semibold text-text-primary">Funil de Conversão</span>
                </div>
                {funnelData.length > 0 ? (
                  <>
                    <ResponsiveContainer width="100%" height={180}>
                      <FunnelChart>
                        <Tooltip
                          formatter={(v: number) => [`$${v}K`, 'Pipeline']}
                          contentStyle={{
                            background: '#131728',
                            border: '1px solid #1e2540',
                            borderRadius: 8,
                            fontSize: 11,
                          }}
                        />
                        <Funnel
                          dataKey="value"
                          data={funnelData}
                          isAnimationActive
                        >
                          <LabelList
                            position="right"
                            fill="#94a3b8"
                            stroke="none"
                            dataKey="name"
                            style={{ fontSize: 10 }}
                          />
                        </Funnel>
                      </FunnelChart>
                    </ResponsiveContainer>
                  </>
                ) : (
                  <div className="text-xs text-text-muted text-center py-8">Sem dados de pipeline</div>
                )}
              </div>
            </div>

            {/* Recent Activity + Signal Feed */}
            <div className="grid grid-cols-2 gap-4">
              {/* Recent Activity */}
              <div className="card">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Clock size={14} className="text-text-muted" />
                    <span className="text-xs font-semibold text-text-primary">Atividade Recente</span>
                  </div>
                  <a href="/pipeline" className="text-[10px] text-accent-cyan flex items-center gap-1 hover:underline">
                    Ver pipeline <ArrowRight size={10} />
                  </a>
                </div>
                <div className="space-y-2">
                  {deals.slice(0, 6).map((d) => (
                    <div key={d.id} className="flex items-center gap-2.5 py-1">
                      <div className={`health-dot ${d.riskScore >= 75 ? 'red' : d.riskScore >= 50 ? 'yellow' : 'green'}`} />
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium text-text-primary truncate">{d.companyName}</div>
                        <div className="text-[10px] text-text-muted">{d.stage} · {daysSince(d.updatedAt)}d atrás</div>
                      </div>
                      <div className="text-xs font-semibold text-text-secondary shrink-0">
                        {fmtCurrency(d.value)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Signal Feed */}
              <div className="card">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Activity size={14} className="text-accent-cyan" />
                    <span className="text-xs font-semibold text-text-primary">Sinais Recentes</span>
                  </div>
                  <a href="/signals" className="text-[10px] text-accent-cyan flex items-center gap-1 hover:underline">
                    Ver todos <ArrowRight size={10} />
                  </a>
                </div>
                <div className="space-y-2">
                  {dashboard?.recentSignals?.slice(0, 6).map((s) => {
                    const { border, icon } = alertStyle(s.severity)
                    return (
                      <div key={s.id} className={`alert-item border ${border}`}>
                        {icon}
                        <div className="flex-1 min-w-0">
                          <div className="text-xs text-text-primary truncate">{s.title}</div>
                          {s.deal && (
                            <div className="text-[10px] text-text-muted">{s.deal.companyName}</div>
                          )}
                        </div>
                        <span className={`badge ${s.severity === 'critical' ? 'badge-red' : s.severity === 'warning' ? 'badge-amber' : 'badge-cyan'} shrink-0`}>
                          {s.severity}
                        </span>
                      </div>
                    )
                  })}
                  {!dashboard?.recentSignals?.length && (
                    <div className="text-xs text-text-muted text-center py-6">Nenhum sinal recente</div>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
