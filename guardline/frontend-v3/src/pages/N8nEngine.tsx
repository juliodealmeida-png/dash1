import { useEffect, useState } from 'react'
import api from '../lib/api'
import { useI18n } from '../contexts/I18nContext'

interface Workflow {
  id: string
  name: string
  status: 'active' | 'paused' | 'error' | string
  runs_today?: number
  last_run?: string
  description?: string
  trigger?: string
}

interface Execution {
  id: string
  workflow_name?: string
  workflow_id?: string
  status: 'success' | 'error' | 'running' | string
  started_at?: string
  finished_at?: string
  duration_ms?: number
  error_message?: string
}

const STATUS_COLORS: Record<string, string> = {
  active: '#34d399',
  paused: '#fbbf24',
  error: '#f87171',
  success: '#34d399',
  running: '#06b6d4',
}

export default function N8nEngine() {
  const { t } = useI18n()
  const [workflows, setWorkflows] = useState<Workflow[]>([])
  const [executions, setExecutions] = useState<Execution[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [tab, setTab] = useState<'workflows' | 'executions'>('workflows')

  useEffect(() => {
    Promise.all([
      api.get<Workflow[] | { workflows?: Workflow[]; data?: Workflow[] }>('/api/automations'),
      api.get<Execution[] | { executions?: Execution[]; data?: Execution[] }>('/api/automations/executions'),
    ])
      .then(([wf, ex]) => {
        setWorkflows(Array.isArray(wf) ? wf : ((wf as Record<string, unknown>).workflows ?? (wf as Record<string, unknown>).data ?? []) as Workflow[])
        setExecutions(Array.isArray(ex) ? ex : ((ex as Record<string, unknown>).executions ?? (ex as Record<string, unknown>).data ?? []) as Execution[])
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  const activeCount = workflows.filter((w) => w.status === 'active').length
  const errorCount = workflows.filter((w) => w.status === 'error').length
  const totalRuns = workflows.reduce((s, w) => s + (w.runs_today || 0), 0)

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#f1f5f9' }}>n8n Engine</h1>
          <div style={{ fontSize: 13, color: '#94a3b8' }}>Workflows e execuções de automação</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {(['workflows', 'executions'] as const).map((tb) => (
            <button
              key={tb}
              onClick={() => setTab(tb)}
              style={{
                background: tab === tb ? 'rgba(124,58,237,0.2)' : 'transparent',
                border: `1px solid ${tab === tb ? '#7c3aed' : 'rgba(255,255,255,0.1)'}`,
                color: tab === tb ? '#a78bfa' : '#64748b',
                borderRadius: 8, padding: '6px 16px', fontSize: 13, cursor: 'pointer', textTransform: 'capitalize',
              }}
            >
              {tb}
            </button>
          ))}
        </div>
      </div>

      {/* KPI strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Workflows', value: workflows.length, color: '#f1f5f9' },
          { label: 'Ativos', value: activeCount, color: '#34d399' },
          { label: 'Com Erro', value: errorCount, color: '#f87171' },
          { label: 'Runs Hoje', value: totalRuns, color: '#06b6d4' },
        ].map((k) => (
          <div key={k.label} style={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: 14, textAlign: 'center' }}>
            <div style={{ fontSize: 10, color: '#64748b', textTransform: 'uppercase', marginBottom: 4 }}>{k.label}</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: k.color }}>{k.value}</div>
          </div>
        ))}
      </div>

      {loading && <div style={{ color: '#94a3b8' }}>{t('common.loading')}</div>}
      {error && <div style={{ color: '#f87171' }}>{error}</div>}

      {/* Workflows tab */}
      {tab === 'workflows' && !loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {workflows.length === 0 && <div style={{ color: '#64748b' }}>{t('common.empty')}</div>}
          {workflows.map((wf) => (
            <div key={wf.id} style={{
              background: '#1e293b', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '14px 20px',
              display: 'flex', alignItems: 'center', gap: 16,
            }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: STATUS_COLORS[wf.status] || '#64748b', flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#f1f5f9' }}>{wf.name}</div>
                {wf.description && <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{wf.description}</div>}
              </div>
              {wf.trigger && <div style={{ fontSize: 11, color: '#94a3b8', background: 'rgba(255,255,255,0.06)', padding: '2px 8px', borderRadius: 8 }}>{wf.trigger}</div>}
              <div style={{ textAlign: 'right', minWidth: 80 }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: '#f1f5f9' }}>{wf.runs_today ?? 0}</div>
                <div style={{ fontSize: 10, color: '#64748b' }}>runs hoje</div>
              </div>
              <div style={{ fontSize: 11, color: '#64748b', minWidth: 80, textAlign: 'right' }}>{wf.last_run || '—'}</div>
              <div style={{ fontSize: 11, padding: '2px 8px', borderRadius: 8, background: 'rgba(255,255,255,0.06)', color: STATUS_COLORS[wf.status] || '#94a3b8', textTransform: 'capitalize' }}>{wf.status}</div>
            </div>
          ))}
        </div>
      )}

      {/* Executions tab */}
      {tab === 'executions' && !loading && (
        <div style={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                {['Workflow', 'Status', 'Início', 'Duração', 'Erro'].map((h) => (
                  <th key={h} style={{ textAlign: 'left', padding: '10px 14px', color: '#64748b', fontSize: 11, textTransform: 'uppercase' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {executions.length === 0 && (
                <tr><td colSpan={5} style={{ padding: 24, textAlign: 'center', color: '#64748b' }}>Nenhuma execução encontrada.</td></tr>
              )}
              {executions.map((ex) => (
                <tr key={ex.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <td style={{ padding: '10px 14px', fontWeight: 600, color: '#f1f5f9' }}>{ex.workflow_name || ex.workflow_id || '—'}</td>
                  <td style={{ padding: '10px 14px' }}>
                    <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 8, background: 'rgba(255,255,255,0.06)', color: STATUS_COLORS[ex.status] || '#94a3b8', textTransform: 'capitalize' }}>{ex.status}</span>
                  </td>
                  <td style={{ padding: '10px 14px', color: '#94a3b8', fontSize: 12 }}>{ex.started_at || '—'}</td>
                  <td style={{ padding: '10px 14px', color: '#94a3b8', fontSize: 12 }}>{ex.duration_ms ? `${ex.duration_ms}ms` : '—'}</td>
                  <td style={{ padding: '10px 14px', color: '#f87171', fontSize: 12, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ex.error_message || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
