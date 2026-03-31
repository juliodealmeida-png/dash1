import { useEffect, useState, useCallback } from 'react'
import { api, fmtDate } from '../lib/api'
import { useSocket } from '../context/SocketContext'
import { 
  X, 
  Bell, 
  AlertTriangle, 
  Info, 
  CheckCircle2, 
  Clock,
  ArrowRight,
  ExternalLink,
  Loader2
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'

interface Signal {
  id: string
  type: string
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info'
  title: string
  message: string
  dealId?: string
  createdAt: string
  read: boolean
}

interface NotificationDrawerProps {
  open: boolean
  onClose: () => void
}

export default function NotificationDrawer({ open, onClose }: NotificationDrawerProps) {
  const { socket } = useSocket()
  const navigate = useNavigate()
  const [signals, setSignals] = useState<Signal[]>([])
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get<{ data: Signal[] }>('/signals?limit=20')
      setSignals(res.data ?? [])
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (open) load()
  }, [open, load])

  useEffect(() => {
    if (!socket) return
    socket.on('signal:new', (newSignal: Signal) => {
      setSignals(prev => [newSignal, ...prev].slice(0, 20))
    })
    return () => {
      socket.off('signal:new')
    }
  }, [socket])

  const markAsRead = async (id: string) => {
    try {
      await api.patch(`/signals/${id}/read`, {})
      setSignals(prev => prev.map(s => s.id === id ? { ...s, read: true } : s))
    } catch (e) {
      console.error(e)
    }
  }

  const handleAction = (signal: Signal) => {
    markAsRead(signal.id)
    if (signal.dealId) {
      navigate(`/deals/${signal.dealId}`)
    }
    onClose()
  }

  const getSeverityIcon = (sev: string) => {
    switch (sev) {
      case 'critical': return <AlertTriangle size={16} className="text-accent-red" />
      case 'high': return <AlertTriangle size={16} className="text-accent-amber" />
      case 'medium': return <Info size={16} className="text-accent-cyan" />
      case 'info': return <Info size={16} className="text-text-muted" />
      default: return <CheckCircle2 size={16} className="text-accent-green" />
    }
  }

  if (!open) return null

  return (
    <>
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] animate-fade-in" onClick={onClose} />
      <div className="fixed inset-y-0 right-0 w-[380px] bg-card border-l border-border shadow-2xl z-[101] flex flex-col animate-slide-in">
        <div className="p-5 border-b border-border flex items-center justify-between bg-surface/30">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-accent-purple/10 text-accent-purple-light">
              <Bell size={18} />
            </div>
            <h2 className="text-sm font-bold text-text-primary uppercase tracking-widest">Revenue Signals</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-surface rounded-xl text-text-muted hover:text-text-primary transition-all">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {loading && signals.length === 0 ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-6 h-6 animate-spin text-accent-purple" />
            </div>
          ) : signals.length === 0 ? (
            <div className="text-center py-20">
              <Bell size={40} className="mx-auto text-text-muted mb-4 opacity-10" />
              <p className="text-xs text-text-muted italic">Nenhum sinal detectado recentemente.</p>
            </div>
          ) : (
            signals.map(signal => (
              <div 
                key={signal.id} 
                className={`card p-4 transition-all hover:border-border-strong group cursor-pointer ${!signal.read ? 'border-l-2 border-l-accent-purple bg-accent-purple/5' : 'bg-surface/30'}`}
                onClick={() => handleAction(signal)}
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">{getSeverityIcon(signal.severity)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-text-primary truncate">{signal.title}</span>
                      {!signal.read && <div className="w-1.5 h-1.5 rounded-full bg-accent-purple" />}
                    </div>
                    <p className="text-[11px] text-text-secondary leading-relaxed mb-2 line-clamp-2">
                      {signal.message}
                    </p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-[10px] text-text-muted">
                        <Clock size={10} />
                        {fmtDate(signal.createdAt)}
                      </div>
                      {signal.dealId && (
                        <div className="text-[10px] font-bold text-accent-purple-light uppercase flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          Ver Deal <ArrowRight size={10} />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="p-4 border-t border-border bg-surface/30">
          <button 
            className="w-full btn-secondary text-[10px] font-bold uppercase tracking-widest py-2.5"
            onClick={() => { navigate('/signals'); onClose(); }}
          >
            Ver todos os sinais
          </button>
        </div>
      </div>
    </>
  )
}
