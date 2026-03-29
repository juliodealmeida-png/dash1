import { useEffect, useState, useCallback } from 'react'
import { api, daysSince } from '../lib/api'
import Topbar from '../components/Topbar'
import { Loader2, AlertCircle, AlertTriangle, Info, Zap } from 'lucide-react'

interface Signal {
  id: string; title: string; description?: string; severity: string
  type?: string; source?: string; createdAt: string; read: boolean
  deal?: { companyName: string; value: number }
}

function SeverityIcon({ s }: { s: string }) {
  if (s === 'critical') return <AlertCircle size={14} className="text-accent-red shrink-0" />
  if (s === 'warning')  return <AlertTriangle size={14} className="text-accent-amber shrink-0" />
  return <Info size={14} className="text-accent-cyan shrink-0" />
}

export default function Signals() {
  const [signals, setSignals] = useState<Signal[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get<{ data: Signal[] }>('/signals?perPage=50')
      setSignals(res.data ?? [])
    } catch { } finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  return (
    <div className="flex flex-col min-h-full">
      <Topbar title="Signal Radar" subtitle={`${signals.length} sinais`} onRefresh={load} />
      <div className="p-5 space-y-3 animate-fade-in">
        <div className="flex gap-2 mb-2">
          {['critical','warning','info'].map(s => (
            <span key={s} className={`badge ${s === 'critical' ? 'badge-red' : s === 'warning' ? 'badge-amber' : 'badge-cyan'}`}>
              {signals.filter(sg => sg.severity === s).length} {s}
            </span>
          ))}
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-accent-purple" /></div>
        ) : signals.map(s => (
          <div key={s.id} className={`alert-item border ${s.severity === 'critical' ? 'border-accent-red/20 bg-accent-red/5' : s.severity === 'warning' ? 'border-accent-amber/20 bg-accent-amber/5' : 'border-border-subtle'}`}>
            <SeverityIcon s={s.severity} />
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium text-text-primary">{s.title}</div>
              {s.description && <div className="text-[10px] text-text-muted mt-0.5 line-clamp-2">{s.description}</div>}
              {s.deal && <div className="text-[10px] text-accent-cyan mt-0.5">{s.deal.companyName}</div>}
            </div>
            <div className="text-[10px] text-text-muted shrink-0">{daysSince(s.createdAt)}d</div>
          </div>
        ))}
        {!loading && !signals.length && (
          <div className="flex items-center justify-center gap-2 py-16 text-text-muted">
            <Zap size={20} /><span>Nenhum sinal detectado</span>
          </div>
        )}
      </div>
    </div>
  )
}
