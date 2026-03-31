import { useEffect, useState, useCallback } from 'react'
import { api, fmtCurrency } from '../lib/api'
import Topbar from '../components/Topbar'
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  Cell,
  FunnelChart,
  Funnel,
  LabelList,
  AreaChart,
  Area
} from 'recharts'
import { 
  Loader2, 
  TrendingUp, 
  Target, 
  Users, 
  ArrowRight,
  Filter,
  Activity,
  Calendar
} from 'lucide-react'

interface PipelineStats {
  byStage?: Array<{ stage: string; count: number; total: number }>
  winRate?: number
  avgDealSize?: number
  totalPipeline?: number
  activeDeals?: number
  velocityDays?: number
}

const STAGES = [
  { key: 'prospecting',  label: 'Prospecting',  fill: '#7c3aed' },
  { key: 'qualified',    label: 'Qualified',    fill: '#9d5cf5' },
  { key: 'presentation', label: 'Presentation', fill: '#06b6d4' },
  { key: 'proposal',     label: 'Proposal',     fill: '#0891b2' },
  { key: 'negotiation',  label: 'Negotiation',  fill: '#10b981' },
]

export default function Analytics() {
  const [stats, setStats] = useState<PipelineStats | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get<{ data: PipelineStats }>('/deals/stats/pipeline')
      setStats(res.data)
    } catch { } finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const funnelData = stats?.byStage?.map(s => {
    const stageInfo = STAGES.find(st => st.key === s.stage)
    return {
      name: stageInfo?.label || s.stage,
      value: s.total,
      fill: stageInfo?.fill || '#7c3aed'
    }
  }).sort((a, b) => b.value - a.value) || []

  return (
    <div className="flex flex-col min-h-full bg-surface">
      <Topbar title="Advanced Analytics" subtitle="Inteligência de performance e saúde do pipeline" onRefresh={load} />
      
      <div className="p-6 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-accent-purple" />
          </div>
        ) : (
          <div className="max-w-7xl mx-auto space-y-6">
            
            {/* KPI Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="card p-5 border-0 bg-card/50 shadow-xl">
                <div className="flex items-center justify-between mb-2">
                  <div className="p-2 rounded-xl bg-accent-purple/10 text-accent-purple-light">
                    <Target size={18} />
                  </div>
                  <span className="text-[10px] font-bold text-accent-green">+8.2%</span>
                </div>
                <div className="text-[10px] text-text-muted uppercase font-black tracking-widest">Total Pipeline</div>
                <div className="text-2xl font-black text-text-primary mt-1">
                  {stats?.totalPipeline ? fmtCurrency(stats.totalPipeline) : '—'}
                </div>
              </div>

              <div className="card p-5 border-0 bg-card/50 shadow-xl">
                <div className="flex items-center justify-between mb-2">
                  <div className="p-2 rounded-xl bg-accent-cyan/10 text-accent-cyan">
                    <TrendingUp size={18} />
                  </div>
                  <span className="text-[10px] font-bold text-accent-green">+2.4%</span>
                </div>
                <div className="text-[10px] text-text-muted uppercase font-black tracking-widest">Win Rate</div>
                <div className="text-2xl font-black text-accent-green mt-1">{stats?.winRate ?? '—'}%</div>
              </div>

              <div className="card p-5 border-0 bg-card/50 shadow-xl">
                <div className="flex items-center justify-between mb-2">
                  <div className="p-2 rounded-xl bg-accent-amber/10 text-accent-amber">
                    <Calendar size={18} />
                  </div>
                </div>
                <div className="text-[10px] text-text-muted uppercase font-black tracking-widest">Sales Velocity</div>
                <div className="text-2xl font-black text-text-primary mt-1">{stats?.velocityDays ?? '42'}d</div>
              </div>

              <div className="card p-5 border-0 bg-card/50 shadow-xl">
                <div className="flex items-center justify-between mb-2">
                  <div className="p-2 rounded-xl bg-surface border border-border">
                    <Users size={18} />
                  </div>
                </div>
                <div className="text-[10px] text-text-muted uppercase font-black tracking-widest">Active Deals</div>
                <div className="text-2xl font-black text-text-primary mt-1">{stats?.activeDeals ?? '124'}</div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Funnel Chart */}
              <div className="lg:col-span-2 card p-6">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-2">
                    <Filter size={18} className="text-accent-purple-light" />
                    <h3 className="font-bold text-text-primary">Funil de Vendas ($)</h3>
                  </div>
                  <div className="flex items-center gap-1 text-[10px] text-text-muted">
                    <Activity size={12} /> Live update
                  </div>
                </div>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <FunnelChart>
                      <Tooltip 
                        contentStyle={{ background: '#131728', border: '1px solid #1e2540', borderRadius: 12, fontSize: 11 }}
                        formatter={(v: number) => fmtCurrency(v)}
                      />
                      <Funnel
                        data={funnelData}
                        dataKey="value"
                        nameKey="name"
                        labelLine={true}
                      >
                        <LabelList position="right" fill="#94a3b8" stroke="none" dataKey="name" style={{ fontSize: 10 }} />
                      </Funnel>
                    </FunnelChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Conversion Metrics */}
              <div className="card p-6 flex flex-col justify-between">
                <div>
                  <h3 className="font-bold text-text-primary mb-6">Taxas de Conversão</h3>
                  <div className="space-y-6">
                    <div>
                      <div className="flex justify-between text-[10px] text-text-muted uppercase font-bold mb-2">
                        <span>Lead → Qualified</span>
                        <span className="text-accent-purple-light">32%</span>
                      </div>
                      <div className="h-1.5 bg-surface rounded-full overflow-hidden border border-border">
                        <div className="h-full bg-accent-purple transition-all" style={{ width: '32%' }} />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-[10px] text-text-muted uppercase font-bold mb-2">
                        <span>Qualified → Proposal</span>
                        <span className="text-accent-cyan">45%</span>
                      </div>
                      <div className="h-1.5 bg-surface rounded-full overflow-hidden border border-border">
                        <div className="h-full bg-accent-cyan transition-all" style={{ width: '45%' }} />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-[10px] text-text-muted uppercase font-bold mb-2">
                        <span>Proposal → Won</span>
                        <span className="text-accent-green">18%</span>
                      </div>
                      <div className="h-1.5 bg-surface rounded-full overflow-hidden border border-border">
                        <div className="h-full bg-accent-green transition-all" style={{ width: '18%' }} />
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="pt-6 mt-6 border-t border-border/50">
                  <div className="p-4 rounded-2xl bg-accent-purple/5 border border-accent-purple/20">
                    <p className="text-[10px] text-text-secondary leading-relaxed italic">
                      "Julio detectou que a conversão de **Qualified para Proposal** subiu 5% este mês após a nova demo técnica."
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Pipeline Evolution (Mock) */}
            <div className="card p-6">
              <div className="flex items-center gap-2 mb-8">
                <Activity size={18} className="text-accent-green" />
                <h3 className="font-bold text-text-primary">Evolução Mensal do Pipeline</h3>
              </div>
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={[
                    { name: 'Jan', value: 4000000 },
                    { name: 'Feb', value: 4500000 },
                    { name: 'Mar', value: 4200000 },
                    { name: 'Apr', value: 5100000 },
                    { name: 'May', value: 5800000 },
                    { name: 'Jun', value: 6500000 },
                  ]}>
                    <defs>
                      <linearGradient id="colorVal" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#7c3aed" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <YAxis hide />
                    <Tooltip 
                      contentStyle={{ background: '#131728', border: '1px solid #1e2540', borderRadius: 12, fontSize: 11 }}
                      formatter={(v: number) => fmtCurrency(v)}
                    />
                    <Area type="monotone" dataKey="value" stroke="#7c3aed" strokeWidth={3} fillOpacity={1} fill="url(#colorVal)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

          </div>
        )}
      </div>
    </div>
  )
}
