import { Outlet, NavLink } from 'react-router-dom'
import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useI18n } from '../contexts/I18nContext'
import { useCelebration } from '../contexts/CelebrationContext'
import NotificationDrawer from './NotificationDrawer'

// ── Sidebar hierarchy (Revenue OS v2) ────────────────────────────────────────
interface NavItem { path: string; label: string; icon: string; end?: boolean; adminOnly?: boolean }
interface NavSection { title: string; items: NavItem[] }

const NAV_SECTIONS: NavSection[] = [
  {
    title: 'Command Center',
    items: [
      { path: '/',         label: 'Dashboard',      icon: '⚡', end: true },
      { path: '/inbox',    label: 'Inbox & Chat',   icon: '✉️' },
      { path: '/meetings', label: 'Reuniões',        icon: '📅' },
    ],
  },
  {
    title: 'Revenue & Pipeline',
    items: [
      { path: '/pipeline',       label: 'Pipeline 360',      icon: '🧩' },
      { path: '/forecast',       label: 'Forecast 90d',      icon: '📈' },
      { path: '/accounts',       label: 'Contas & Contatos', icon: '🏢' },
      { path: '/pipeline-health',label: 'Saúde & Risco',     icon: '🩺' },
    ],
  },
  {
    title: 'Inteligência B2B',
    items: [
      { path: '/meddpicc',     label: 'MEDDPICC Tracker', icon: '🎯' },
      { path: '/market-intel', label: 'Market Intel',     icon: '🛡' },
      { path: '/arsenal',      label: 'Arsenal de Vendas',icon: '🤖' },
    ],
  },
  {
    title: 'Motor Autônomo',
    items: [
      { path: '/n8n',          label: 'n8n Engine',       icon: '🛠' },
      { path: '/julio-copilot',label: 'Julio AI Copilot', icon: '🧠' },
    ],
  },
  {
    title: 'Operações',
    items: [
      { path: '/reports',      label: 'Relatórios CEO',   icon: '📊' },
      { path: '/admin',        label: 'User Admin',       icon: '🔒', adminOnly: true },
      { path: '/integrations', label: 'Integrações',      icon: '🔌' },
    ],
  },
]

const ACCENT   = '#7c3aed'
const CYAN     = '#06b6d4'
const ACTIVE_C = '#a78bfa'
const ACTIVE_BG = 'rgba(124,58,237,0.14)'

type Lang = 'PT' | 'EN' | 'ES'

export default function Layout() {
  const { user, logout } = useAuth()
  const { t, lang, setLang } = useI18n()
  const { banners } = useCelebration()
  const [notifOpen, setNotifOpen] = useState(false)
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})

  const toggleSection = (title: string) =>
    setCollapsed(c => ({ ...c, [title]: !c[title] }))

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: '#0f172a' }}>

      {/* ── SIDEBAR ───────────────────────────────────────────────────────── */}
      <nav style={{
        width: 228, minWidth: 228,
        background: '#0f1623',
        borderRight: '1px solid rgba(255,255,255,0.06)',
        display: 'flex', flexDirection: 'column', flexShrink: 0,
        overflowY: 'auto',
      }}>
        {/* Logo */}
        <div style={{ padding: '22px 20px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{
            fontSize: 17, fontWeight: 900, letterSpacing: '0.03em',
            background: `linear-gradient(135deg,${ACCENT},${CYAN})`,
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          }}>GUARDLINE</div>
          <div style={{ fontSize: 10, color: '#475569', letterSpacing: '0.12em', textTransform: 'uppercase', marginTop: 2 }}>
            Revenue OS v2
          </div>
        </div>

        {/* Celebration banners (birthday / IWD) */}
        {banners.length > 0 && (
          <div style={{ padding: '8px 12px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            {banners.map((b, i) => (
              <div key={i} style={{
                background: `linear-gradient(135deg,${b.color}18,${b.color}08)`,
                border: `1px solid ${b.color}40`,
                borderRadius: 8, padding: '7px 10px', marginBottom: i < banners.length - 1 ? 6 : 0,
                fontSize: 11, color: '#f1f5f9', lineHeight: 1.4,
              }}>
                <span style={{ marginRight: 5 }}>{b.emoji}</span>{b.message}
              </div>
            ))}
          </div>
        )}

        {/* Nav sections */}
        <div style={{ flex: 1, padding: '10px 8px' }}>
          {NAV_SECTIONS.map(section => {
            const visibleItems = section.items.filter(i => !i.adminOnly || user?.role === 'admin')
            if (visibleItems.length === 0) return null
            const isOpen = !collapsed[section.title]
            return (
              <div key={section.title} style={{ marginBottom: 4 }}>
                {/* Section header */}
                <button
                  onClick={() => toggleSection(section.title)}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '6px 10px', borderRadius: 6, border: 'none',
                    background: 'none', cursor: 'pointer',
                    fontSize: 10, fontWeight: 700, letterSpacing: '0.08em',
                    textTransform: 'uppercase', color: '#475569',
                    marginBottom: 2,
                  }}
                >
                  {section.title}
                  <span style={{ fontSize: 9, opacity: 0.7, transition: 'transform 0.2s', transform: isOpen ? 'rotate(0)' : 'rotate(-90deg)' }}>▼</span>
                </button>

                {/* Items */}
                {isOpen && visibleItems.map(item => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    end={item.end}
                    style={({ isActive }) => ({
                      display: 'flex', alignItems: 'center', gap: 9,
                      padding: '7px 10px', borderRadius: 7, marginBottom: 1,
                      textDecoration: 'none', fontSize: 13,
                      fontWeight: isActive ? 600 : 400,
                      color: isActive ? ACTIVE_C : '#94a3b8',
                      background: isActive ? ACTIVE_BG : 'transparent',
                      borderLeft: isActive ? `2px solid ${ACCENT}` : '2px solid transparent',
                      transition: 'all 0.12s',
                    })}
                  >
                    <span style={{ fontSize: 13, width: 18, textAlign: 'center' }}>{item.icon}</span>
                    {item.label}
                  </NavLink>
                ))}
              </div>
            )
          })}
        </div>

        {/* Footer: lang + user */}
        <div style={{ padding: '12px 14px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ display: 'flex', gap: 4, marginBottom: 12 }}>
            {(['PT', 'EN', 'ES'] as Lang[]).map(l => (
              <button
                key={l}
                onClick={() => setLang(l)}
                style={{
                  flex: 1, padding: '4px 0', borderRadius: 5, fontSize: 10, fontWeight: 700,
                  cursor: 'pointer', border: 'none',
                  background: lang === l ? 'rgba(124,58,237,0.2)' : 'rgba(255,255,255,0.04)',
                  color: lang === l ? ACTIVE_C : '#64748b',
                  transition: 'all 0.12s',
                }}
              >{l}</button>
            ))}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              width: 30, height: 30, borderRadius: '50%',
              background: `linear-gradient(135deg,${ACCENT},${CYAN})`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 12, fontWeight: 800, color: '#fff', flexShrink: 0,
            }}>
              {(user?.name?.[0] ?? user?.email?.[0] ?? 'U').toUpperCase()}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 11, color: '#f1f5f9', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {user?.name ?? user?.email ?? 'User'}
              </div>
              <div style={{ fontSize: 10, color: '#64748b', textTransform: 'capitalize' }}>{user?.role ?? 'user'}</div>
            </div>
            <button onClick={logout} title="Sair" style={{ background: 'none', border: 'none', color: '#475569', cursor: 'pointer', fontSize: 15, padding: 2 }}>↩</button>
          </div>
        </div>
      </nav>

      {/* ── MAIN AREA ─────────────────────────────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Topbar */}
        <header style={{
          height: 52, background: '#0f1623',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 24px', gap: 12, flexShrink: 0,
        }}>
          <div style={{ fontSize: 11, color: '#475569', letterSpacing: '0.06em' }}>
            {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {/* Live pulse */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: '#34d399' }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#34d399', display: 'inline-block', boxShadow: '0 0 6px #34d399' }} />
              Live Intelligence
            </div>
            <button
              onClick={() => setNotifOpen(true)}
              style={{
                background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)',
                color: '#94a3b8', borderRadius: 8, padding: '5px 14px', fontSize: 12, cursor: 'pointer',
              }}
            >🔔</button>
          </div>
        </header>

        {/* Page content */}
        <main style={{ flex: 1, overflowY: 'auto', padding: 24, background: '#0f172a' }}>
          <Outlet />
        </main>
      </div>

      <NotificationDrawer open={notifOpen} onClose={() => setNotifOpen(false)} />
    </div>
  )
}
