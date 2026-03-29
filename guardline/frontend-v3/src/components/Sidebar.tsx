import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
  LayoutDashboard,
  Kanban,
  Target,
  Users,
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
} from 'lucide-react'

interface NavItem {
  to: string
  icon: React.ReactNode
  label: string
}

const REVENUE: NavItem[] = [
  { to: '/',           icon: <LayoutDashboard size={16} />, label: 'Command Center' },
  { to: '/pipeline',   icon: <Kanban size={16} />,          label: 'Pipeline' },
  { to: '/deals',      icon: <Target size={16} />,          label: 'Deal Room' },
  { to: '/leads',      icon: <Users size={16} />,           label: 'Leads' },
]

const OUTREACH: NavItem[] = [
  { to: '/prospecting', icon: <Rocket size={16} />,    label: 'Prospecting Hub' },
  { to: '/composer',    icon: <Mail size={16} />,      label: 'Composer' },
  { to: '/sequences',   icon: <GitBranch size={16} />, label: 'Sequences' },
]

const INTELLIGENCE: NavItem[] = [
  { to: '/signals',  icon: <Zap size={16} />,          label: 'Signal Radar' },
  { to: '/news',     icon: <Newspaper size={16} />,    label: 'News & RegTech' },
  { to: '/meetings', icon: <CalendarDays size={16} />, label: 'Meeting Prep' },
]

const SYSTEM: NavItem[] = [
  { to: '/analytics', icon: <BarChart3 size={16} />, label: 'Analytics' },
  { to: '/settings',  icon: <Settings size={16} />,  label: 'Settings' },
]

function NavSection({ label, items }: { label: string; items: NavItem[] }) {
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
          {item.icon}
          <span className="flex-1">{item.label}</span>
          {/* active chevron */}
          <ChevronRight size={12} className="opacity-0 group-[.active]:opacity-100 text-accent-purple-light" />
        </NavLink>
      ))}
    </div>
  )
}

export default function Sidebar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  function handleLogout() {
    logout()
    navigate('/login')
  }

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
        <NavSection label="Revenue"      items={REVENUE} />
        <NavSection label="Outreach"     items={OUTREACH} />
        <NavSection label="Intelligence" items={INTELLIGENCE} />
        <NavSection label="System"       items={SYSTEM} />
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
            title="Sair"
          >
            <LogOut size={14} />
          </button>
        </div>
      </div>
    </aside>
  )
}
