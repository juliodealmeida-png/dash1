import { useEffect, useState, useCallback } from 'react'
import { api, fmtCurrency } from '../lib/api'
import Topbar from '../components/Topbar'
import { 
  TrendingUp, 
  TrendingDown, 
  BarChart3, 
  Loader2, 
  Target, 
  AlertCircle,
  BrainCircuit,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react'
import { useI18n } from '../context/I18nContext'
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  Cell,
  PieChart,
  Pie
} from 'recharts'

interface ForecastData {
  pipelineTotal: number
  winRate: number
  forecast: {
    committed: number
    bestCase: number
  }
  healthScore: number
  coverageRatio: number
}

interface LossAnalysis {
  patterns: Array<{ reason: string; count: number; value: number }>
  recommendations: string[]
}

export default function ForecastLoss() {
  const { t } = useI18n()
  const [data, setData] = useState<ForecastData | null>(null)
  const [loss, setLoss] = useState<LossAnalysis | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [metricsRes, lossRes] = await Promise.all([
        api.get<ForecastData>('/metrics/dashboard'),
        api.get<LossAnalysis>('/julio/loss-analysis').catch(() => ({ patterns: [], recommendations: [] }))
      ])
      setData(metricsRes)
      setLoss(lossRes)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const lossChartData = loss?.patterns.map(p => ({
    name: p.reason,
    value: p.value
  })) || []

  const COLORS = ['#7c3aed', '#06b6d4', '#f59e0b', '#ef4444', '#10b981']

  return (
    <div className="flex flex-col h-full bg-surface">
      <Topbar 
        title={t('nav.forecast_loss')} 
        subtitle="Previsão de fechamento e análise de perdas com IA"
        onRefresh={load}
      />

      <div className="p-6 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-accent-purple" />
          </div>
        ) : (
          <div className="max-w-7xl mx-auto space-y-6">
            {/* Forecast Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Committed */}
              <div className="card p-6 border-accent-purple/20 bg-accent-purple/5">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 rounded-2xl bg-accent-purple/10 border border-accent-purple/20">
                    <Target size={24} className="text-accent-purple-light" />
                  </div>
                  <div className="flex items-center gap-1 text-accent-green text-xs font-bold">
                    <ArrowUpRight size={14} /> +12% vs last month
                  </div>
                </div>
                <h3 className="text-sm font-semibold text-text-muted uppercase tracking-wider">Committed (Ponderado)</h3>
                <div className="text-3xl font-black text-text-primary mt-1">
                  {data ? fmtCurrency(data.forecast.committed) : '—'}
                </div>
                <p className="text-[10px] text-text-muted mt-2">Baseado em deals na etapa de negociação</p>
              </div>

              {/* Best Case */}
              <div className="card p-6 border-accent-cyan/20 bg-accent-cyan/5">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 rounded-2xl bg-accent-cyan/10 border border-accent-cyan/20">
                    <TrendingUp size={24} className="text-accent-cyan-light" />
                  </div>
                </div>
                <h3 className="text-sm font-semibold text-text-muted uppercase tracking-wider">Best Case</h3>
                <div className="text-3xl font-black text-text-primary mt-1">
                  {data ? fmtCurrency(data.forecast.bestCase) : '—'}
                </div>
                <p className="text-[10px] text-text-muted mt-2">Pipeline total ponderado pela probabilidade</p>
              </div>

              {/* Health Score */}
              <div className="card p-6 border-border bg-card">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 rounded-2xl bg-surface border border-border">
                    <BarChart3 size={24} className="text-text-secondary" />
                  </div>
                  <div className={`text-lg font-black ${data && data.healthScore > 70 ? 'text-accent-green' : 'text-accent-amber'}`}>
                    {data?.healthScore}%
                  </div>
                </div>
                <h3 className="text-sm font-semibold text-text-muted uppercase tracking-wider">Saúde do Forecast</h3>
                <div className="w-full h-2 bg-surface rounded-full mt-4 overflow-hidden border border-border">
                  <div 
                    className="h-full bg-gradient-to-r from-accent-purple to-accent-cyan transition-all duration-1000"
                    style={{ width: `${data?.healthScore ?? 0}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-text-muted mt-2">
                  <span>Coverage: {data?.coverageRatio}x</span>
                  <span>Win Rate: {data?.winRate}%</span>
                </div>
              </div>
            </div>

            {/* Analysis Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Loss Reasons */}
              <div className="card p-6 flex flex-col min-h-[400px]">
                <div className="flex items-center gap-2 mb-6">
                  <TrendingDown size={18} className="text-accent-red" />
                  <h3 className="font-bold text-text-primary">Análise de Perdas (Last 90d)</h3>
                </div>
                <div className="flex-1 min-h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={lossChartData}
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {lossChartData.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#131728', borderColor: '#1e2540', borderRadius: '12px', fontSize: '12px' }}
                        itemStyle={{ color: '#e2e8f0' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="grid grid-cols-2 gap-2 mt-4">
                  {loss?.patterns.map((p, i) => (
                    <div key={p.reason} className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                      <span className="text-[10px] text-text-secondary truncate">{p.reason}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* AI Insights */}
              <div className="card p-6 border-accent-purple/30 bg-gradient-to-br from-accent-purple/10 to-transparent">
                <div className="flex items-center gap-2 mb-6">
                  <BrainCircuit size={18} className="text-accent-purple-light" />
                  <h3 className="font-bold text-text-primary">Julio AI: Insights de Forecast</h3>
                </div>
                <div className="space-y-4">
                  {loss?.recommendations.length ? loss.recommendations.map((rec, i) => (
                    <div key={i} className="flex gap-3 p-4 rounded-xl bg-card border border-border/50 hover:border-accent-purple/30 transition-colors">
                      <div className="w-6 h-6 rounded-lg bg-accent-purple/10 flex items-center justify-center shrink-0">
                        <span className="text-xs font-bold text-accent-purple-light">{i + 1}</span>
                      </div>
                      <p className="text-sm text-text-secondary leading-relaxed">{rec}</p>
                    </div>
                  )) : (
                    <div className="py-12 text-center">
                      <Loader2 size={24} className="mx-auto text-accent-purple animate-spin mb-4" />
                      <p className="text-sm text-text-muted italic">Julio está analisando os dados do pipeline...</p>
                    </div>
                  )}
                  
                  <div className="mt-8 p-4 rounded-xl border border-dashed border-accent-purple/30 text-center">
                    <p className="text-xs text-text-muted mb-3">Deseja uma análise detalhada por região ou SDR?</p>
                    <button className="text-xs font-bold text-accent-purple-light hover:underline uppercase tracking-wider">Solicitar Relatório IA</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
