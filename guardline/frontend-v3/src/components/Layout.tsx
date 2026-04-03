import { Outlet, NavLink } from 'react-router-dom'
import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useI18n } from '../contexts/I18nContext'
import NotificationDrawer from './NotificationDrawer'

const NAV: Array<{ path: string; label: string; icon: string; end?: boolean; adminOnly?: boolean }> = [
  { path: '/', label: 'sidebar.commandCenter', icon: '⚡', end: true },
  { path: '/pipeline', label: 'sidebar.pipeline', icon: '🧩' },
  { path: '/leads', label: 'sidebar.leads', icon: '🧲' },
  { path: '/forecast', label: 'sidebar.forecast', icon: '📈' },
  { path: '/loss-intelligence', label: 'sidebar.lossIntelligence', icon: '🧠' },
  { path: '/signals', label: 'sidebar.signals', icon: '📡' },
  { path: '/battlecard', label: 'sidebar.battlecard', icon: '🤖' },
  { path: '/hubspot', label: 'sidebar.hubspot', icon: '🟠' },
  { path: '/sdr-hub', label: 'sidebar.sdrHub', icon: '🎯' },
  { path: '/pipeline-health', label: 'sidebar.pipelineHealth', icon: '🩺' },
  { path: '/automations', label: 'sidebar.automations', icon: '🧬' },
  { path: '/n8n', label: 'sidebar.n8n', icon: '🛠' },
  { path: '/analytics', label: 'sidebar.analytics', icon: '📊' },
  { path: '/inbox', label: 'sidebar.inbox', icon: '✉️' },
  { path: '/meetings', label: 'sidebar.meetings', icon: '📅' },
  { path: '/accounts', label: 'sidebar.accounts', icon: '🏢' },
  { path: '/contacts', label: 'sidebar.contacts', icon: '👤' },
  { path: '/campaigns', label: 'sidebar.campaigns', icon: '📣' },
  { path: '/channel-deals', label: 'sidebar.channelDeals', icon: '🤝' },
  { path: '/documents', label: 'sidebar.documents', icon: '📄' },
  { path: '/product-intelligence', label: 'sidebar.productIntelligence', icon: '🧪' },
  { path: '/investor', label: 'sidebar.investor', icon: '💼' },
  { path: '/fraud', label: 'sidebar.fraud', icon: '🛡' },
  { path: '/admin', label: 'sidebar.admin', icon: '🔒', adminOnly: true },
]

type Lang = 'PT' | 'EN' | 'ES'

export default function Layout() {
  const { user, logout } = useAuth()
  const { t, lang, setLang } = useI18n()
  const [notifOpen, setNotifOpen] = useState(false)

  const visibleNav = NAV.filter(n => !n.adminOnly || user?.role === 'admin')
  const activeColor = '#60a5fa'
  const activeBg = 'rgba(59,130,246,0.15)'
  const activeBgStrong = 'rgba(59,130,246,0.22)'

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: 'var(--bg-base)' }}>
      {/* Sidebar */}
      <nav style={{ width: 220, background: 'var(--bg-surface)', borderRight: '1px solid var(--border-default)', display: 'flex', flexDirection: 'column', flexShrink: 0, overflowY: 'auto' }}>
        {/* Logo */}
        <div style={{ padding: '24px 20px 20px', borderBottom: '1px solid var(--border-subtle)' }}>
          <div style={{ fontSize: 16, fontWeight: 800, background: 'linear-gradient(135deg,#7c3aed,#06b6d4)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            GUARDLINE
          </div>
          <div style={{ fontSize: 10, color: '#64748b', letterSpacing: '0.08em', textTransform: 'uppercase', marginTop: 2 }}>Revenue OS</div>
        </div>

        {/* Nav items */}
        <div style={{ flex: 1, padding: '12px 10px' }}>
          {visibleNav.map(item => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.end}
              style={({ isActive }) => ({
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '8px 10px', borderRadius: 8, marginBottom: 2,
                textDecoration: 'none', fontSize: 13, fontWeight: isActive ? 600 : 400,
                color: isActive ? activeColor : '#94a3b8',
                background: isActive ? activeBg : 'transparent',
                transition: 'all 0.15s',
              })}
            >
              <span style={{ fontSize: 14 }}>{item.icon}</span>
              {t(item.label)}
            </NavLink>
          ))}
        </div>

        {/* Language selector */}
        <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border-subtle)' }}>
          <div style={{ display: 'flex', gap: 4, marginBottom: 12 }}>
            {(['PT', 'EN', 'ES'] as Lang[]).map(l => (
              <button
                key={l}
                onClick={() => setLang(l)}
                style={{
                  flex: 1, padding: '4px 0', borderRadius: 6, fontSize: 11, fontWeight: 600,
                  cursor: 'pointer', border: 'none',
                  background: lang === l ? activeBgStrong : 'rgba(255,255,255,0.05)',
                  color: lang === l ? activeColor : '#64748b',
                }}
              >
                {l}
              </button>
            ))}
          </div>
          {/* User */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'linear-gradient(135deg,#7c3aed,#06b6d4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
              {(user?.email?.[0] ?? 'U').toUpperCase()}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 11, color: '#f1f5f9', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.email ?? 'User'}</div>
              <div style={{ fontSize: 10, color: '#64748b' }}>{user?.role ?? 'user'}</div>
            </div>
            <button onClick={logout} title="Sign out" style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: 14 }}>↩</button>
          </div>
        </div>
      </nav>

      {/* Main area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Topbar */}
        <header style={{ height: 52, background: 'var(--bg-surface)', borderBottom: '1px solid var(--border-default)', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', padding: '0 20px', gap: 12, flexShrink: 0 }}>
          <button
            onClick={() => setNotifOpen(true)}
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: '#94a3b8', borderRadius: 8, padding: '5px 12px', fontSize: 12, cursor: 'pointer' }}
          >
            🔔 Notifications
          </button>
        </header>

        {/* Content */}
        <main style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
          <Outlet />
        </main>
      </div>

      <NotificationDrawer open={notifOpen} onClose={() => setNotifOpen(false)} />
    </div>
  )
}
