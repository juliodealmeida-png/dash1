import { useEffect, useState } from 'react'
import Section from '../components/Section'
import { Table } from '../components/Table'
import { api } from '../lib/api'
import { useAuth } from '../contexts/AuthContext'

export default function WfExecutions() {
  const { getAccessToken } = useAuth()
  const [rows, setRows] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)

  const refresh = async () => {
    setLoading(true)
    setErr(null)
    try {
      const token = await getAccessToken()
      if (!token) throw new Error('Sem token')
      const list = await api.wfExecutions.list(token)
      setRows(list)
    } catch (e: any) {
      setErr(e?.message || 'Erro ao carregar wf executions')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refresh()
  }, [])

  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <Section title="Workflow Executions" right={<button className="btn" onClick={refresh}>Refresh</button>}>
        {loading ? <div style={{ color: '#94a3b8' }}>Carregando…</div> : null}
        {err ? <div style={{ color: '#fca5a5', marginBottom: 10 }}>{err}</div> : null}
        <Table
          columns={[
            { key: 'workflowId', label: 'Workflow', render: (e: any) => e.workflowId ?? e.workflow_name ?? '' },
            { key: 'status', label: 'Status' },
            { key: 'startedAt', label: 'Started', render: (e: any) => (e.startedAt || e.started_at || '').slice(0, 19).replace('T', ' ') },
            { key: 'duration', label: 'ms', render: (e: any) => e.durationMs ?? e.duration_ms ?? '' },
            { key: 'error', label: 'Error', render: (e: any) => e.errorMessage ?? e.error_message ?? '' },
          ]}
          rows={rows}
        />
      </Section>
    </div>
  )
}

