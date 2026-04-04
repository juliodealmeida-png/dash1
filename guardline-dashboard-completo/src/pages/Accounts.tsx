import { useEffect, useState } from 'react'
import Section from '../components/Section'
import { Table } from '../components/Table'
import { api } from '../lib/api'
import { useAuth } from '../contexts/AuthContext'

export default function Accounts() {
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
      const list = await api.accounts.list(token)
      setRows(list)
    } catch (e: any) {
      setErr(e?.message || 'Erro ao carregar accounts')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refresh()
  }, [])

  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <Section title="Accounts" right={<button className="btn" onClick={refresh}>Refresh</button>}>
        {loading ? <div style={{ color: '#94a3b8' }}>Carregando…</div> : null}
        {err ? <div style={{ color: '#fca5a5', marginBottom: 10 }}>{err}</div> : null}
        <Table
          columns={[
            { key: 'company', label: 'Company', render: (a: any) => a.company ?? a.name ?? '' },
            { key: 'sector', label: 'Sector', render: (a: any) => a.sector ?? '' },
            { key: 'leadCount', label: 'Leads', render: (a: any) => a.leadCount ?? '' },
            { key: 'avgScore', label: 'Avg Score', render: (a: any) => a.avgScore ?? '' },
            { key: 'totalValue', label: 'Total Value', render: (a: any) => a.totalValue ?? '' },
            { key: 'lastActivity', label: 'Last Activity', render: (a: any) => (a.lastActivity || '').slice(0, 19).replace('T', ' ') },
          ]}
          rows={rows}
        />
      </Section>
    </div>
  )
}

