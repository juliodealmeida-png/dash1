import { useEffect, useState } from 'react'
import Section from '../components/Section'
import { Table } from '../components/Table'
import { api } from '../lib/api'
import { useAuth } from '../contexts/AuthContext'

export default function Campaigns() {
  const { getAccessToken } = useAuth()
  const [stats, setStats] = useState<any>(null)
  const [rows, setRows] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)

  const refresh = async () => {
    setLoading(true)
    setErr(null)
    try {
      const token = await getAccessToken()
      if (!token) throw new Error('Sem token')
      const [s, list] = await Promise.all([api.campaigns.stats(token), api.campaigns.list(token, { page: 1, perPage: 50 })])
      setStats(s)
      setRows(list)
    } catch (e: any) {
      setErr(e?.message || 'Erro ao carregar campaigns')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refresh()
  }, [])

  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <Section title="Campaigns" right={<button className="btn" onClick={refresh}>Refresh</button>}>
        {loading ? <div style={{ color: '#94a3b8' }}>Carregando…</div> : null}
        {err ? <div style={{ color: '#fca5a5', marginBottom: 10 }}>{err}</div> : null}
      </Section>

      <Section title="Stats">
        <pre style={{ margin: 0, whiteSpace: 'pre-wrap', color: '#cbd5e1', fontSize: 12 }}>{JSON.stringify(stats, null, 2)}</pre>
      </Section>

      <Section title="List">
        <Table
          columns={[
            { key: 'name', label: 'Name' },
            { key: 'type', label: 'Type' },
            { key: 'status', label: 'Status' },
            { key: 'active', label: 'Active', render: (c: any) => (c.active ? 'yes' : 'no') },
            { key: 'startDate', label: 'Start', render: (c: any) => (c.startDate || '').slice(0, 10) },
            { key: 'createdAt', label: 'Created', render: (c: any) => (c.createdAt || '').slice(0, 10) },
          ]}
          rows={rows}
        />
      </Section>
    </div>
  )
}

