import { useEffect, useState } from 'react'
import api from '../lib/api'
import { useI18n } from '../contexts/I18nContext'
import { useAuth } from '../contexts/AuthContext'

interface LogEntry {
  id: string
  action: string
  user?: string
  resource?: string
  timestamp: string
  level?: 'info' | 'warn' | 'error'
  meta?: Record<string, unknown>
}

interface SystemStats {
  db_status?: string
  api_status?: string
  n8n_status?: string
  redis_status?: string
  users_total?: number
  active_sessions?: number
}

const LEVEL_COLORS = { info: '#06b6d4', warn: '#fbbf24', error: '#f87171' }

export default function AdminLogs() {
  const { t } = useI18n()
  const { user } = useAuth()
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [stats, setStats] = useState<SystemStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'logs' | 'system'>('logs')

  useEffect(() => {
    Promise.all([
      api.get<LogEntry[] | { logs?: LogEntry[] }>('/api/admin/logs'),
      api.get<SystemStats>('/api/admin/system'),
    ])
      .then(([logsData, sysData]) => {
        setLogs(Array.isArray(logsData) ? logsData : (logsData.logs ?? []))
        setStats(sysData)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (user?.role !== 'admin') {
    return (
      <div style={{ color: '#f87171', padding: 24, textAlign: 'center' }}>
        Access restricted to administrators.
      </div>
    )
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#f1f5f9' }}>{t('sidebar.admin')}</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          {(['logs', 'system'] as const).map((tb) => (
            <button
              key={tb}
              onClick={() => setTab(tb)}
              style={{
                background: tab === tb ? 'rgba(124,58,237,0.2)' : 'transparent',
                border: `1px solid ${tab === tb ? '#7c3aed' : 'rgba(255,255,255,0.1)'}`,
                color: tab === tb ? '#a78bfa' : '#64748b',
                borderRadius: 8,
                padding: '6px 16px',
                fontSize: 13,
                cursor: 'pointer',
                textTransform: 'capitalize',
              }}
            >
              {tb}
            </button>
          ))}
        </div>
      </div>

      {loading && <div style={{ color: '#94a3b8' }}>{t('common.loading')}</div>}

      {tab === 'system' && stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 }}>
          {[
            { label: 'Database', val: stats.db_status },
            { label: 'API', val: stats.api_status },
            { label: 'n8n', val: stats.n8n_status },
            { label: 'Redis', val: stats.redis_status },
          ].map((s) => (
            <div key={s.label} style={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: 20 }}>
              <div style={{ fontSize: 12, color: '#64748b', marginBottom: 8 }}>{s.label}</div>
              <div style={{
                fontSize: 14,
                fontWeight: 600,
                color: s.val === 'ok' || s.val === 'healthy' ? '#34d399' : s.val ? '#fbbf24' : '#64748b',
              }}>{s.val || '—'}</div>
            </div>
          ))}
          {stats.users_total !== undefined && (
            <div style={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: 20 }}>
              <div style={{ fontSize: 12, color: '#64748b', marginBottom: 8 }}>Total Users</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: '#f1f5f9' }}>{stats.users_total}</div>
            </div>
          )}
          {stats.active_sessions !== undefined && (
            <div style={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: 20 }}>
              <div style={{ fontSize: 12, color: '#64748b', marginBottom: 8 }}>Active Sessions</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: '#06b6d4' }}>{stats.active_sessions}</div>
            </div>
          )}
        </div>
      )}

      {tab === 'logs' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {logs.length === 0 && !loading && <div style={{ color: '#64748b' }}>{t('common.empty')}</div>}
          {logs.map((log) => (
            <div key={log.id} style={{
              background: '#1e293b',
              border: '1px solid rgba(255,255,255,0.06)',
              borderLeft: `3px solid ${log.level ? LEVEL_COLORS[log.level] : '#64748b'}`,
              borderRadius: 8,
              padding: '10px 16px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: 12,
            }}>
              <span style={{ fontSize: 11, color: '#64748b', minWidth: 150, flexShrink: 0 }}>{log.timestamp}</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: '#f1f5f9', flex: 1 }}>{log.action}</span>
              {log.user && <span style={{ fontSize: 11, color: '#94a3b8' }}>{log.user}</span>}
              {log.resource && <span style={{ fontSize: 11, color: '#64748b' }}>{log.resource}</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
