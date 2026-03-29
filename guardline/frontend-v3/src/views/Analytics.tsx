import { useEffect, useState, useCallback } from 'react'
import { api, fmtCurrency } from '../lib/api'
import Topbar from '../components/Topbar'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { Loader2 } from 'lucide-react'

interface PipelineStats {
  byStage?: Array<{ stage: string; count: number; total: number }>
  winRate?: number
  avgDealSize?: number
}

const STAGE_COLORS: Record<string, string> = {
  prospecting: '#7c3aed', qualified: '#9d5cf5', presentation: '#06b6d4',
  proposal: '#0891b2', negotiation: '#10b981', won: '#059669', lost: '#ef4444',
}

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

  return (
    <div className="flex flex-col min-h-full">
      <Topbar title="Analytics" subtitle="Métricas de pipeline e performance" onRefresh={load} />
      <div className="p-5 space-y-5 animate-fade-in">
        {loading ? (
          <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-accent-purple" /></div>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-4">
              <div className="kpi-card"><div className="text-xs text-text-muted mb-1">Win Rate</div><div className="text-2xl font-bold text-accent-green">{stats?.winRate ?? '—'}%</div></div>
              <div className="kpi-card"><div className="text-xs text-text-muted mb-1">Avg Deal Size</div><div className="text-2xl font-bold text-text-primary">{stats?.avgDealSize ? fmtCurrency(stats.avgDealSize) : '—'}</div></div>
              <div className="kpi-card"><div className="text-xs text-text-muted mb-1">Stages Ativos</div><div className="text-2xl font-bold text-accent-cyan">{stats?.byStage?.length ?? '—'}</div></div>
            </div>
            {stats?.byStage && stats.byStage.length > 0 && (
              <div className="card">
                <div className="text-xs font-semibold text-text-primary mb-4">Pipeline por Estágio ($K)</div>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={stats.byStage.map(s => ({ ...s, totalK: Math.round(s.total / 1000) }))}>
                    <XAxis dataKey="stage" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <Tooltip
                      formatter={(v: number) => [`$${v}K`, 'Pipeline']}
                      contentStyle={{ background: '#131728', border: '1px solid #1e2540', borderRadius: 8, fontSize: 11 }}
                    />
                    <Bar dataKey="totalK" radius={[6, 6, 0, 0]}>
                      {stats.byStage.map((s) => (
                        <Cell key={s.stage} fill={STAGE_COLORS[s.stage] ?? '#7c3aed'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
