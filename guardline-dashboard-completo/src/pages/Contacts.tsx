import { useEffect, useState } from 'react'
import Section from '../components/Section'
import { Table } from '../components/Table'
import { api } from '../lib/api'
import { useAuth } from '../contexts/AuthContext'

export default function Contacts() {
  const { getAccessToken } = useAuth()
  const [rows, setRows] = useState<any[]>([])
  const [selected, setSelected] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)

  const refresh = async () => {
    setLoading(true)
    setErr(null)
    try {
      const token = await getAccessToken()
      if (!token) throw new Error('Sem token')
      const list = await api.contacts.list(token)
      setRows(list)
    } catch (e: any) {
      setErr(e?.message || 'Erro ao carregar contacts')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refresh()
  }, [])

  const open = async (row: any) => {
    try {
      const token = await getAccessToken()
      if (!token) return
      const c = await api.contacts.get(token, row.id)
      setSelected(c)
    } catch (e: any) {
      setErr(e?.message || 'Erro ao abrir contato')
    }
  }

  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: 14 }}>
        <Section title="Contacts" right={<button className="btn" onClick={refresh}>Refresh</button>}>
          {loading ? <div style={{ color: '#94a3b8' }}>Carregando…</div> : null}
          {err ? <div style={{ color: '#fca5a5', marginBottom: 10 }}>{err}</div> : null}
          <Table
            columns={[
              { key: 'name', label: 'Name' },
              { key: 'email', label: 'Email', render: (c: any) => c.email ?? '' },
              { key: 'company', label: 'Company', render: (c: any) => c.company ?? '' },
              { key: 'jobTitle', label: 'Title', render: (c: any) => c.jobTitle ?? '' },
              { key: 'score', label: 'Score', render: (c: any) => c.score ?? '' },
              { key: 'status', label: 'Status', render: (c: any) => c.status ?? '' },
            ]}
            rows={rows}
            onRowClick={open}
          />
        </Section>

        <Section title="Contact details">
          {!selected ? <div style={{ color: '#94a3b8' }}>Selecione um contato.</div> : (
            <pre style={{ margin: 0, whiteSpace: 'pre-wrap', color: '#cbd5e1', fontSize: 12 }}>{JSON.stringify(selected, null, 2)}</pre>
          )}
        </Section>
      </div>
    </div>
  )
}

