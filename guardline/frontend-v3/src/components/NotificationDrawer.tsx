import { useEffect, useState } from 'react'
import api from '../lib/api'
import { useSocket } from '../contexts/SocketContext'

interface Signal {
  id: string
  severity: string
  title: string
  message?: string
  description?: string
  read?: boolean
  is_read?: boolean
  createdAt?: string
  created_at?: string
}

interface NotificationDrawerProps {
  open: boolean
  onClose: () => void
}

const SEV_COLOR: Record<string, string> = {
  critical: '#f87171',
  warning: '#fbbf24',
  info: '#60a5fa',
}

export default function NotificationDrawer({ open, onClose }: NotificationDrawerProps) {
  const [signals, setSignals] = useState<Signal[]>([])
  const { on } = useSocket()

  useEffect(() => {
    api.get<{ success: boolean; data: Signal[] } | Signal[]>('/api/signals?take=30')
      .then(res => {
        const list = (res as { data: Signal[] })?.data ?? (Array.isArray(res) ? res : [])
        setSignals(list)
      })
      .catch(() => {})
  }, [open])

  useEffect(() => {
    return on('signal.new', (data) => {
      setSignals(prev => [data as Signal, ...prev].slice(0, 30))
    })
  }, [on])

  async function markRead(id: string) {
    await api.patch(`/api/signals/${id}/read`, {}).catch(() => {})
    setSignals(prev => prev.map(s => s.id === id ? { ...s, is_read: true, read: true } : s))
  }

  const unread = signals.filter(s => !s.is_read && !s.read)

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 7998, opacity: open ? 1 : 0, pointerEvents: open ? 'all' : 'none', background: 'rgba(0,0,0,0.4)', transition: 'opacity 0.3s' }} />
      <div style={{ position: 'fixed', right: 0, top: 0, height: '100vh', width: 380, maxWidth: '95vw', background: '#1e293b', borderLeft: '1px solid rgba(255,255,255,0.08)', zIndex: 7999, transform: open ? 'translateX(0)' : 'translateX(100%)', transition: 'transform 0.3s cubic-bezier(0.4,0,0.2,1)', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '20px 20px', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontWeight: 700 }}>Notifications {unread.length > 0 && <span style={{ background: '#f87171', color: '#fff', borderRadius: 20, padding: '1px 7px', fontSize: 11, marginLeft: 6 }}>{unread.length}</span>}</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: 20 }}>×</button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {signals.length === 0 && <div style={{ padding: 20, color: '#64748b', fontSize: 13 }}>No notifications</div>}
          {signals.map(s => (
            <div
              key={s.id}
              onClick={() => markRead(s.id)}
              style={{ padding: '12px 20px', borderBottom: '1px solid rgba(255,255,255,0.04)', cursor: 'pointer', borderLeft: `3px solid ${SEV_COLOR[s.severity] ?? '#64748b'}`, opacity: (s.is_read || s.read) ? 0.5 : 1, background: !(s.is_read || s.read) ? 'rgba(255,255,255,0.02)' : 'transparent' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.04)')}
              onMouseLeave={e => (e.currentTarget.style.background = !(s.is_read || s.read) ? 'rgba(255,255,255,0.02)' : 'transparent')}
            >
              <div style={{ fontSize: 12, fontWeight: 600, color: '#f1f5f9' }}>{s.title}</div>
              <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 3 }}>{s.message ?? s.description ?? ''}</div>
              <div style={{ fontSize: 10, color: '#64748b', marginTop: 4 }}>{(s.createdAt ?? s.created_at ?? '').slice(0, 16).replace('T', ' ')}</div>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}
