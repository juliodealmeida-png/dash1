import { useEffect, useState } from 'react'
import Section from '../components/Section'
import { Table } from '../components/Table'
import { api } from '../lib/api'
import { useAuth } from '../contexts/AuthContext'

export default function Meetings() {
  const { getAccessToken } = useAuth()
  const [rows, setRows] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)
  const [title, setTitle] = useState('Discovery Call')
  const [startsAt, setStartsAt] = useState(new Date().toISOString().slice(0, 16))

  const refresh = async () => {
    setLoading(true)
    setErr(null)
    try {
      const token = await getAccessToken()
      if (!token) throw new Error('Sem token')
      const list = await api.meetings.list(token)
      setRows(list)
    } catch (e: any) {
      setErr(e?.message || 'Erro ao carregar meetings')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refresh()
  }, [])

  const onCreate = async () => {
    try {
      const token = await getAccessToken()
      if (!token) return
      await api.meetings.create(token, { title, startsAt: new Date(startsAt).toISOString() })
      await refresh()
    } catch (e: any) {
      setErr(e?.message || 'Falha ao criar')
    }
  }

  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <Section title="Meetings" right={<button className="btn" onClick={refresh}>Refresh</button>}>
        {loading ? <div style={{ color: '#94a3b8' }}>Carregando…</div> : null}
        {err ? <div style={{ color: '#fca5a5', marginBottom: 10 }}>{err}</div> : null}
        <Table
          columns={[
            { key: 'title', label: 'Title' },
            { key: 'startsAt', label: 'Starts', render: (m: any) => (m.startsAt || '').slice(0, 19).replace('T', ' ') },
            { key: 'status', label: 'Status', render: (m: any) => m.status ?? '' },
          ]}
          rows={rows}
        />
      </Section>

      <Section title="Create meeting" right={<button className="btn" onClick={onCreate}>Create</button>}>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 10 }}>
          <input value={title} onChange={e => setTitle(e.target.value)} style={inputStyle} />
          <input type="datetime-local" value={startsAt} onChange={e => setStartsAt(e.target.value)} style={inputStyle} />
        </div>
      </Section>
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  height: 40,
  borderRadius: 12,
  border: '1px solid rgba(255,255,255,0.12)',
  background: 'rgba(255,255,255,0.04)',
  color: '#e5e7eb',
  padding: '0 12px',
  outline: 'none',
  width: '100%',
}
