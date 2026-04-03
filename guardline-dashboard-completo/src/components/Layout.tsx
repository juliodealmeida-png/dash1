import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useFilters } from '../contexts/FiltersContext'
import { useRealtime } from '../contexts/RealtimeContext'
import './layout.css'

const NAV = [
  { to: '/', label: 'Command Center' },
  { to: '/deals', label: 'Deals' },
  { to: '/leads', label: 'Leads' },
  { to: '/signals', label: 'Signals' },
  { to: '/automations', label: 'Automations' },
  { to: '/fraud', label: 'Fraud' },
  { to: '/investor', label: 'Investor' },
  { to: '/documents', label: 'Documents' },
  { to: '/julio', label: 'Júlio AI' },
  { to: '/integrations', label: 'Integrations' },
  { to: '/connectors', label: 'Connectors' },
  { to: '/tools', label: 'Tools' },
  { to: '/campaigns', label: 'Campaigns' },
  { to: '/meetings', label: 'Meetings' },
  { to: '/accounts', label: 'Accounts' },
  { to: '/contacts', label: 'Contacts' },
  { to: '/forum', label: 'Forum' },
  { to: '/wf', label: 'WF Exec' },
  { to: '/profile', label: 'Profile' },
  { to: '/admin', label: 'Admin' },
]

export default function Layout() {
  const { user, logout } = useAuth()
  const { filters, setFilters } = useFilters()
  const { connected } = useRealtime()

  return (
    <div className="appShell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brandName">Guardline</div>
          <div className="brandMeta">{user?.email}</div>
        </div>
        <nav className="nav">
          {NAV.filter(i => i.to !== '/admin' || user?.role === 'admin').map(i => (
            <NavLink key={i.to} to={i.to} end={i.to === '/'} className={({ isActive }) => `navItem ${isActive ? 'active' : ''}`}>
              {i.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <main className="main">
        <header className="topbar">
          <div className="filters">
            <label>
              From
              <input
                type="date"
                value={filters.dateRange.from}
                onChange={e => setFilters(f => ({ ...f, dateRange: { ...f.dateRange, from: e.target.value } }))}
              />
            </label>
            <label>
              To
              <input
                type="date"
                value={filters.dateRange.to}
                onChange={e => setFilters(f => ({ ...f, dateRange: { ...f.dateRange, to: e.target.value } }))}
              />
            </label>
            <label className="grow">
              Search
              <input
                value={filters.search}
                onChange={e => setFilters(f => ({ ...f, search: e.target.value }))}
                placeholder="Company, deal, lead…"
              />
            </label>
          </div>
          <div className="topbarRight">
            <div className={`realtime ${connected ? 'on' : 'off'}`}>{connected ? 'Realtime ON' : 'Realtime OFF'}</div>
            <button className="btn" onClick={logout}>
              Logout
            </button>
          </div>
        </header>

        <div className="content">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
