import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useI18n } from '../context/I18nContext'
import { useSocket } from '../context/SocketContext'
import { useState, useEffect } from 'react'
import {
  LayoutDashboard,
  Kanban,
  Target,
  Users,
  Megaphone,
  Workflow,
  Swords,
  MapPinned,
  Rocket,
  Mail,
  GitBranch,
  Zap,
  Newspaper,
  CalendarDays,
  BarChart3,
  Settings,
  Shield,
  LogOut,
  ChevronRight,
  TrendingUp,
  FileSignature,
  Lock,
  Share2,
  Cpu,
} from 'lucide-react'

interface NavItem {
  to: string
  icon: React.ReactNode
  labelKey: string
  hasAlert?: boolean
}

function NavSection({ label, items, alerts }: { label: string; items: NavItem[]; alerts: string[] }) {
  const { t } = useI18n()
  return (
    <div>
      <div className="nav-section-label">{label}</div>
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.to === '/'}
          className={({ isActive }) =>
            `nav-item ${isActive ? 'active' : ''}`
          }
        >
          <div className="relative">
            {item.icon}
            {alerts.includes(item.to) && (
              <span className="absolute -top-1 -right-1 w-2 h-2 bg-accent-purple rounded-full ring-2 ring-card animate-pulse" />
            )}
          </div>
          <span className="flex-1">{t(item.labelKey)}</span>
          <ChevronRight size={12} className="opacity-0 group-[.active]:opacity-100 text-accent-purple-light" />
        </NavLink>
      ))}
    </div>
  )
}

export default function Sidebar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const { t } = useI18n()
  const { socket } = useSocket()
  const [activeAlerts, setActiveAlerts] = useState<string[]>([])

  useEffect(() => {
    if (!socket) return
    
    socket.on('signal:new', () => {
      setActiveAlerts(prev => Array.from(new Set([...prev, '/signals', '/'])))
    })
    
    socket.on('deal:updated', () => {
      setActiveAlerts(prev => Array.from(new Set([...prev, '/pipeline'])))
    })

    return () => {
      socket.off('signal:new')
      socket.off('deal:updated')
    }
  }, [socket])

  // Clear alerts when navigating
  useEffect(() => {
    const path = window.location.pathname
    setActiveAlerts(prev => prev.filter(p => p !== path))
  }, [window.location.pathname])

  function handleLogout() {
    logout()
    navigate('/login')
  }

  let allowedRoutes: string[] | null = null
  try {
    const raw = (user as any)?.modules
    if (Array.isArray(raw)) allowedRoutes = raw.map(String)
    else if (typeof raw === 'string' && raw.trim()) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) allowedRoutes = parsed.map(String)
    }
  } catch {
    allowedRoutes = null
  }

  const filterItems = (items: NavItem[]) => {
    if (!user) return []
    if (user.role === 'admin') return items
    if (!allowedRoutes || allowedRoutes.length === 0) return items.filter(i => i.to !== '/admin')
    return items.filter(i => allowedRoutes!.includes(i.to))
  }

  const REVENUE: NavItem[] = filterItems([
    { to: '/',           icon: <LayoutDashboard size={16} />, labelKey: 'nav.command_center' },
    { to: '/pipeline',   icon: <Kanban size={16} />,          labelKey: 'nav.pipeline' },
    { to: '/deals',      icon: <Target size={16} />,          labelKey: 'nav.deal_room' },
    { to: '/leads',      icon: <Users size={16} />,           labelKey: 'nav.leads' },
    { to: '/campaigns',  icon: <Megaphone size={16} />,       labelKey: 'nav.campaigns' },
    { to: '/automations', icon: <Workflow size={16} />,       labelKey: 'nav.automations' },
    { to: '/battlecard', icon: <Swords size={16} />,          labelKey: 'nav.battlecard' },
    { to: '/fraud-map',  icon: <MapPinned size={16} />,       labelKey: 'nav.fraud_map' },
    { to: '/investor',   icon: <TrendingUp size={16} />,      labelKey: 'nav.investor_pipeline' },
    { to: '/documents',  icon: <FileSignature size={16} />,   labelKey: 'nav.documents' },
    { to: '/channel',    icon: <Share2 size={16} />,          labelKey: 'nav.channel_deals' },
    { to: '/product',    icon: <Cpu size={16} />,             labelKey: 'nav.product_intel' },
  ])

  const OUTREACH: NavItem[] = filterItems([
    { to: '/prospecting', icon: <Rocket size={16} />,    labelKey: 'nav.prospecting' },
    { to: '/composer',    icon: <Mail size={16} />,      labelKey: 'nav.composer' },
    { to: '/sequences',   icon: <GitBranch size={16} />, labelKey: 'nav.sequences' },
  ])

  const INTELLIGENCE: NavItem[] = filterItems([
    { to: '/signals',  icon: <Zap size={16} />,          labelKey: 'nav.signals' },
    { to: '/news',     icon: <Newspaper size={16} />,    labelKey: 'nav.news' },
    { to: '/meetings', icon: <CalendarDays size={16} />, labelKey: 'nav.meetings' },
  ])

  const SYSTEM: NavItem[] = filterItems([
    { to: '/analytics', icon: <BarChart3 size={16} />, labelKey: 'nav.analytics' },
    { to: '/forecast',  icon: <TrendingUp size={16} />, labelKey: 'nav.forecast_loss' },
    { to: '/admin',     icon: <Lock size={16} />,       labelKey: 'nav.admin_logs' },
    { to: '/settings',  icon: <Settings size={16} />,  labelKey: 'nav.settings' },
  ])

  return (
    <aside className="w-56 shrink-0 bg-card border-r border-border flex flex-col h-screen sticky top-0">
      {/* Logo */}
      <div className="px-4 py-4 border-b border-border flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-accent-purple/10 border border-accent-purple/20 flex items-center justify-center shrink-0">
          <Shield size={16} className="text-accent-purple-light" />
        </div>
        <div>
          <div className="text-sm font-bold text-text-primary leading-none">Guardline</div>
          <div className="text-[10px] text-text-muted mt-0.5">Revenue OS v3</div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-2 py-2 space-y-0.5">
        <NavSection label={t('section.revenue')}      items={REVENUE}      alerts={activeAlerts} />
        <NavSection label={t('section.outreach')}     items={OUTREACH}     alerts={activeAlerts} />
        <NavSection label={t('section.intelligence')} items={INTELLIGENCE} alerts={activeAlerts} />
        <NavSection label={t('section.system')}       items={SYSTEM}       alerts={activeAlerts} />
      </nav>

      {/* User */}
      <div className="px-3 py-3 border-t border-border">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-accent-purple/20 flex items-center justify-center text-xs font-bold text-accent-purple-light shrink-0">
            {user?.name?.[0]?.toUpperCase() ?? 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-medium text-text-primary truncate">{user?.name}</div>
            <div className="text-[10px] text-text-muted truncate">{user?.role}</div>
          </div>
          <button
            onClick={handleLogout}
            className="text-text-muted hover:text-accent-red transition-colors p-1 rounded"
            title={t('common.logout')}
          >
            <LogOut size={14} />
          </button>
        </div>
      </div>
    </aside>
  )
}
