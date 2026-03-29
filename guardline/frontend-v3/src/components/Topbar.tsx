import { useState } from 'react'
import { Search, Bell, RefreshCw } from 'lucide-react'

interface TopbarProps {
  title: string
  subtitle?: string
  onRefresh?: () => void
}

export default function Topbar({ title, subtitle, onRefresh }: TopbarProps) {
  const [search, setSearch] = useState('')

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
          placeholder="Buscar deals, leads..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        {onRefresh && (
          <button
            onClick={onRefresh}
            className="btn-ghost p-2"
            title="Atualizar"
          >
            <RefreshCw size={14} />
          </button>
        )}
        <button className="btn-ghost p-2 relative" title="Notificações">
          <Bell size={14} />
          <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-accent-red rounded-full" />
        </button>
      </div>
    </header>
  )
}
