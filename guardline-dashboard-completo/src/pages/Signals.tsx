import { useEffect, useState } from 'react'
import Section from '../components/Section'
import { Table } from '../components/Table'
import { api } from '../lib/api'
import type { Signal } from '../lib/types'
import { useAuth } from '../contexts/AuthContext'

export default function Signals() {
  const { getAccessToken } = useAuth()
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)
  const [rows, setRows] = useState<Signal[]>([])
  const [unreadOnly, setUnreadOnly] = useState(true)

  const refresh = async () => {
    setLoading(true)
    setErr(null)
    try {
      const token = await getAccessToken()
      if (!token) throw new Error('Sem token')
      const list = await api.signals.list(token, 200, unreadOnly ? true : undefined)
      setRows(list)
    } catch (e: any) {
      setErr(e?.message || 'Erro ao carregar signals')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refresh()
  }, [unreadOnly])

  const onRead = async (s: Signal) => {
    try {
      const token = await getAccessToken()
      if (!token) return
      await api.signals.read(token, s.id)
      setRows(prev => prev.map(x => (x.id === s.id ? { ...x, read: true } : x)))
    } catch (e: any) {
      setErr(e?.message || 'Falha ao marcar como lido')
    }
  }

  const onReadAll = async () => {
    try {
      const token = await getAccessToken()
      if (!token) return
      await api.signals.readAll(token)
      setRows(prev => prev.map(x => ({ ...x, read: true })))
    } catch (e: any) {
      setErr(e?.message || 'Falha ao marcar todos como lidos')
    }
  }

  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <Section
        title="Signals"
        right={
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 12, color: '#94a3b8' }}>
              <input type="checkbox" checked={unreadOnly} onChange={e => setUnreadOnly(e.target.checked)} />
              Unread only
            </label>
            <button className="btn" onClick={onReadAll}>
              Read all
            </button>
            <button className="btn" onClick={refresh}>
              Refresh
            </button>
          </div>
        }
      >
        {loading ? <div style={{ color: '#94a3b8' }}>Carregando…</div> : null}
        {err ? <div style={{ color: '#fca5a5', marginBottom: 10 }}>{err}</div> : null}
        <Table
          columns={[
            { key: 'severity', label: 'Severity' },
            { key: 'type', label: 'Type' },
            { key: 'title', label: 'Title' },
            { key: 'deal', label: 'Deal', render: (s: Signal) => s.deal?.companyName || '' },
            { key: 'read', label: 'Read', render: (s: Signal) => (s.read ? 'yes' : 'no') },
            { key: 'createdAt', label: 'Created', render: (s: Signal) => (s.createdAt || '').slice(0, 19).replace('T', ' ') },
            { key: 'action', label: 'Action', render: (s: Signal) => (
              <button className="btn" onClick={() => onRead(s)} style={{ height: 30, padding: '0 10px' }} disabled={s.read}>
                Mark read
              </button>
            ) },
          ]}
          rows={rows}
        />
      </Section>
    </div>
  )
}

