import { useState, useEffect, useCallback } from 'react'
import { Search, Bell, RefreshCw } from 'lucide-react'
import { useI18n, type Lang } from '../context/I18nContext'
import NotificationDrawer from './NotificationDrawer'
import { useSocket } from '../context/SocketContext'
import { api } from '../lib/api'

interface TopbarProps {
  title: string
  subtitle?: string
  onRefresh?: () => void
}

export default function Topbar({ title, subtitle, onRefresh }: TopbarProps) {
  const [search, setSearch] = useState('')
  const [showNotifications, setShowNotifications] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const { lang, setLang, t } = useI18n()
  const { socket } = useSocket()

  const loadUnreadCount = useCallback(async () => {
    try {
      const res = await api.get<{ count: number }>('/signals/unread-count')
      setUnreadCount(res.count || 0)
    } catch (e) {
      console.error(e)
    }
  }, [])

  useEffect(() => {
    loadUnreadCount()
  }, [loadUnreadCount])

  useEffect(() => {
    if (!socket) return
    socket.on('signal:new', () => {
      setUnreadCount(prev => prev + 1)
    })
    return () => {
      socket.off('signal:new')
    }
  }, [socket])

  function pickLang(l: Lang) {
    setLang(l)
  }

  return (
    <header className="sticky top-0 z-30 bg-card/80 backdrop-blur border-b border-border px-5 py-3 flex items-center gap-4">
      {/* Title */}
      <div className="flex-1 min-w-0">
        <h1 className="text-sm font-semibold text-text-primary leading-none">{title}</h1>
        {subtitle && (
          <p className="text-xs text-text-muted mt-0.5">{subtitle}</p>
        )}
      </div>

      {/* Search */}
      <div className="relative w-56 hidden md:block">
        <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
        <input
          type="text"
          className="input pl-8 py-1.5 text-xs"
          placeholder={t('common.search_placeholder')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <div className="hidden sm:flex items-center gap-1 border border-border-subtle rounded-lg p-1">
          {(['pt', 'en', 'es'] as Lang[]).map((l) => (
            <button
              key={l}
              onClick={() => pickLang(l)}
              className={`px-2 py-1 text-[10px] rounded-md transition-colors ${
                lang === l ? 'bg-accent-purple/20 text-accent-purple-light' : 'text-text-muted hover:text-text-primary'
              }`}
              title={l.toUpperCase()}
            >
              {l.toUpperCase()}
            </button>
          ))}
        </div>
        {onRefresh && (
          <button
            onClick={onRefresh}
            className="btn-ghost p-2"
            title={t('common.refresh')}
          >
            <RefreshCw size={14} />
          </button>
        )}
        <button 
          className="btn-ghost p-2 relative" 
          title={t('common.notifications')}
          onClick={() => { setShowNotifications(true); setUnreadCount(0); }}
        >
          <Bell size={14} />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 w-2 h-2 bg-accent-red rounded-full ring-2 ring-card animate-pulse" />
          )}
        </button>
      </div>

      <NotificationDrawer 
        open={showNotifications} 
        onClose={() => setShowNotifications(false)} 
      />
    </header>
  )
}
