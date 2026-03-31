import { useEffect, useState, useCallback } from 'react'
import { api, fmtCurrency } from '../lib/api'
import Topbar from '../components/Topbar'
import { 
  Cpu, 
  Database, 
  TrendingUp, 
  Loader2, 
  Box,
  Layers,
  BarChart3,
  Search,
  Filter
} from 'lucide-react'
import { useI18n } from '../context/I18nContext'
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  Cell 
} from 'recharts'

interface ProductStat {
  solution: string
  leadsCount: number
  dealsCount: number
  totalValue: number
  conversionRate: number
}

export default function ProductIntelligence() {
  const { t } = useI18n()
  const [stats, setStats] = useState<ProductStat[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      // Fetch stats from analytics or product-intelligence endpoint
      // Logic from V2: Group leads/deals by solution
      const res = await api.get<{ data: ProductStat[] }>('/analytics/product-stats').catch(() => ({ data: [] }))
      const items = res.data || []
      
      // Mock if empty for demo
      if (items.length === 0) {
        setStats([
          { solution: 'AML / PLD', leadsCount: 450, dealsCount: 12, totalValue: 850000, conversionRate: 2.6 },
          { solution: 'Fraud Prevention', leadsCount: 1200, dealsCount: 45, totalValue: 2450000, conversionRate: 3.7 },
          { solution: 'Onboarding / KYC / KYB', leadsCount: 890, dealsCount: 32, totalValue: 1250000, conversionRate: 3.5 },
          { solution: 'Decision Engine', leadsCount: 320, dealsCount: 8, totalValue: 650000, conversionRate: 2.5 },
          { solution: 'Orchestration', leadsCount: 150, dealsCount: 4, totalValue: 450000, conversionRate: 2.6 },
        ])
      } else {
        setStats(items)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const chartData = stats.map(s => ({
    name: s.solution,
    value: s.totalValue
  }))

  const COLORS = ['#7c3aed', '#06b6d4', '#f59e0b', '#ef4444', '#10b981']

  return (
    <div className="flex flex-col h-full bg-surface">
      <Topbar 
        title={t('nav.product_intel')} 
        subtitle="Inteligência de produto e performance por solução"
        onRefresh={load}
      />

      <div className="p-6 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-accent-purple" />
          </div>
        ) : (
          <div className="max-w-7xl mx-auto space-y-8">
            {/* KPI Row */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="card p-5 bg-card/50">
                <div className="text-[10px] font-bold text-text-muted uppercase mb-1">Total Solutions</div>
                <div className="text-2xl font-black text-text-primary">{stats.length}</div>
              </div>
              <div className="card p-5 bg-card/50">
                <div className="text-[10px] font-bold text-text-muted uppercase mb-1">Top Performer</div>
                <div className="text-lg font-black text-accent-green truncate">Fraud Prevention</div>
              </div>
              <div className="card p-5 bg-card/50">
                <div className="text-[10px] font-bold text-text-muted uppercase mb-1">Leads Ativos</div>
                <div className="text-2xl font-black text-text-primary">3,010</div>
              </div>
              <div className="card p-5 bg-card/50">
                <div className="text-[10px] font-bold text-text-muted uppercase mb-1">Avg Conversion</div>
                <div className="text-2xl font-black text-accent-cyan">3.1%</div>
              </div>
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Product Distribution Chart */}
              <div className="card p-6 min-h-[400px]">
                <div className="flex items-center gap-2 mb-8">
                  <BarChart3 size={18} className="text-accent-purple-light" />
                  <h3 className="font-bold text-text-primary">Pipeline por Solução</h3>
                </div>
                <div className="flex-1 min-h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} layout="vertical">
                      <XAxis type="number" hide />
                      <YAxis dataKey="name" type="category" width={150} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#131728', borderColor: '#1e2540', borderRadius: '12px', fontSize: '11px' }}
                        itemStyle={{ color: '#e2e8f0' }}
                        formatter={(val: number) => fmtCurrency(val)}
                      />
                      <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                        {chartData.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Product Stats Table */}
              <div className="card p-6 overflow-hidden">
                <div className="flex items-center gap-2 mb-8">
                  <Layers size={18} className="text-accent-cyan" />
                  <h3 className="font-bold text-text-primary">Detalhamento de Conversão</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="text-[10px] uppercase font-bold text-text-muted border-b border-border pb-3">
                        <th className="pb-4">Solução</th>
                        <th className="pb-4">Leads</th>
                        <th className="pb-4">Deals</th>
                        <th className="pb-4">Conversão</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/50">
                      {stats.map(s => (
                        <tr key={s.solution} className="hover:bg-surface/30 transition-colors">
                          <td className="py-4 text-xs font-bold text-text-primary">{s.solution}</td>
                          <td className="py-4 text-xs text-text-secondary">{s.leadsCount}</td>
                          <td className="py-4 text-xs text-text-secondary">{s.dealsCount}</td>
                          <td className="py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-16 h-1.5 bg-surface rounded-full overflow-hidden border border-border">
                                <div 
                                  className="h-full bg-accent-cyan"
                                  style={{ width: `${s.conversionRate * 10}%` }}
                                />
                              </div>
                              <span className="text-xs font-bold text-accent-cyan">{s.conversionRate}%</span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
