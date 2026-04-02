import { useEffect, useState } from 'react'
import Section from '../components/Section'
import { api } from '../lib/api'
import type { ForumMessage } from '../lib/types'
import { useAuth } from '../contexts/AuthContext'

export default function Forum() {
  const { getAccessToken, user } = useAuth()
  const [rows, setRows] = useState<ForumMessage[]>([])
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)

  const refresh = async () => {
    setLoading(true)
    setErr(null)
    try {
      const token = await getAccessToken()
      if (!token) throw new Error('Sem token')
      const list = await api.forum.list(token)
      setRows(list)
    } catch (e: any) {
      setErr(e?.message || 'Erro ao carregar forum')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refresh()
  }, [])

  const onSend = async () => {
    const msg = text.trim()
    if (!msg) return
    setErr(null)
    try {
      const token = await getAccessToken()
      if (!token) return
      const created = await api.forum.create(token, msg)
      setRows(prev => [created, ...prev])
      setText('')
    } catch (e: any) {
      setErr(e?.message || 'Falha ao enviar')
    }
  }

  const onDelete = async (id: string) => {
    setErr(null)
    try {
      const token = await getAccessToken()
      if (!token) return
      await api.forum.remove(token, id)
      setRows(prev => prev.filter(m => m.id !== id))
    } catch (e: any) {
      setErr(e?.message || 'Falha ao deletar')
    }
  }

  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <Section title="Forum" right={<button className="btn" onClick={refresh}>Refresh</button>}>
        {loading ? <div style={{ color: '#94a3b8' }}>Carregando…</div> : null}
        {err ? <div style={{ color: '#fca5a5', marginBottom: 10 }}>{err}</div> : null}

        <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
          <input value={text} onChange={e => setText(e.target.value)} placeholder="Mensagem…" style={inputStyle} />
          <button className="btn" onClick={onSend} disabled={!text.trim()}>
            Send
          </button>
        </div>

        <div style={{ display: 'grid', gap: 10 }}>
          {rows.map(m => (
            <div key={m.id} style={msgStyle}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                <div style={{ fontWeight: 800 }}>{m.user?.name || m.user?.email || m.userId}</div>
                <div style={{ color: '#94a3b8', fontSize: 12 }}>{(m.createdAt || '').slice(0, 19).replace('T', ' ')}</div>
              </div>
              <div style={{ marginTop: 6, whiteSpace: 'pre-wrap' }}>{m.text}</div>
              {user?.role === 'admin' ? (
                <div style={{ marginTop: 10 }}>
                  <button className="btn" onClick={() => onDelete(m.id)} style={{ height: 30, padding: '0 10px' }}>
                    Delete
                  </button>
                </div>
              ) : null}
            </div>
          ))}
          {rows.length === 0 ? <div style={{ color: '#64748b' }}>Sem mensagens.</div> : null}
        </div>
      </Section>
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  height: 40,
  flex: 1,
  borderRadius: 12,
  border: '1px solid rgba(255,255,255,0.12)',
  background: 'rgba(255,255,255,0.04)',
  color: '#e5e7eb',
  padding: '0 12px',
  outline: 'none',
}

const msgStyle: React.CSSProperties = {
  border: '1px solid rgba(255,255,255,0.06)',
  background: 'rgba(0,0,0,0.14)',
  borderRadius: 14,
  padding: '10px 12px',
}
