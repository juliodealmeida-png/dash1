import { useEffect, useState } from 'react'
import Section from '../components/Section'
import { Table } from '../components/Table'
import { api } from '../lib/api'
import type { Document, DocumentsStats } from '../lib/types'
import { useAuth } from '../contexts/AuthContext'

export default function Documents() {
  const { getAccessToken } = useAuth()
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)
  const [rows, setRows] = useState<Document[]>([])
  const [stats, setStats] = useState<DocumentsStats | null>(null)
  const [selected, setSelected] = useState<Document | null>(null)

  const refresh = async () => {
    setLoading(true)
    setErr(null)
    try {
      const token = await getAccessToken()
      if (!token) throw new Error('Sem token')
      const [list, s] = await Promise.all([api.documents.list(token, { page: 1, perPage: 100 }), api.documents.stats(token)])
      setRows(list)
      setStats(s)
    } catch (e: any) {
      setErr(e?.message || 'Erro ao carregar documentos')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refresh()
  }, [])

  const open = async (doc: Document) => {
    try {
      const token = await getAccessToken()
      if (!token) return
      const full = await api.documents.get(token, doc.id)
      setSelected(full)
    } catch (e: any) {
      setErr(e?.message || 'Erro ao abrir documento')
    }
  }

  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <Section title="Documents" right={<button className="btn" onClick={refresh}>Refresh</button>}>
        {loading ? <div style={{ color: '#94a3b8' }}>Carregando…</div> : null}
        {err ? <div style={{ color: '#fca5a5', marginBottom: 10 }}>{err}</div> : null}

        {stats ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, minmax(0, 1fr))', gap: 10, marginBottom: 12 }}>
            <div style={pill}>Total: <strong>{stats.total}</strong></div>
            <div style={pill}>Draft: <strong>{stats.draft}</strong></div>
            <div style={pill}>Sent: <strong>{stats.sent}</strong></div>
            <div style={pill}>In progress: <strong>{stats.in_progress}</strong></div>
            <div style={pill}>Completed: <strong>{stats.completed}</strong></div>
            <div style={pill}>Expired: <strong>{stats.expired}</strong></div>
          </div>
        ) : null}
      </Section>

      <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: 14 }}>
        <Section title="List">
          <Table
            columns={[
              { key: 'title', label: 'Title' },
              { key: 'status', label: 'Status' },
              { key: 'expiresAt', label: 'Expires', render: (d: Document) => (d.expiresAt || '').slice(0, 10) },
              { key: 'completedAt', label: 'Completed', render: (d: Document) => (d.completedAt || '').slice(0, 10) },
              { key: '_count', label: 'Fields', render: (d: Document) => d._count?.fields ?? '' },
              { key: 'createdAt', label: 'Created', render: (d: Document) => (d.createdAt || '').slice(0, 10) },
            ]}
            rows={rows}
            onRowClick={open}
          />
        </Section>

        <Section title="Details">
          {!selected ? (
            <div style={{ color: '#94a3b8' }}>Selecione um documento na tabela.</div>
          ) : (
            <div style={{ display: 'grid', gap: 10 }}>
              <div style={{ fontWeight: 900, fontSize: 16 }}>{selected.title}</div>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', fontSize: 12, color: '#94a3b8' }}>
                <div>Status: <strong style={{ color: '#e5e7eb' }}>{selected.status}</strong></div>
                <div>Order: <strong style={{ color: '#e5e7eb' }}>{selected.signerOrder}</strong></div>
              </div>
              <div style={{ fontSize: 12 }}>
                <a href={selected.fileUrl} target="_blank" rel="noreferrer">Open file</a>
                {selected.finalFileUrl ? (
                  <>
                    {' '}•{' '}
                    <a href={selected.finalFileUrl} target="_blank" rel="noreferrer">Open final</a>
                  </>
                ) : null}
              </div>

              <div>
                <div style={{ fontWeight: 800, marginBottom: 6 }}>Signers</div>
                <div style={{ display: 'grid', gap: 6 }}>
                  {(selected.signers || []).map(s => (
                    <div key={s.id} style={row}>
                      <div style={{ fontWeight: 700 }}>{s.name}</div>
                      <div style={{ color: '#94a3b8', fontSize: 12 }}>{s.email} • {s.role} • {s.status}</div>
                    </div>
                  ))}
                  {(selected.signers || []).length === 0 ? <div style={{ color: '#64748b', fontSize: 12 }}>Sem signers</div> : null}
                </div>
              </div>

              <div>
                <div style={{ fontWeight: 800, marginBottom: 6 }}>Fields</div>
                <div style={{ color: '#94a3b8', fontSize: 12 }}>{(selected.fields || []).length} campos</div>
              </div>

              <div>
                <div style={{ fontWeight: 800, marginBottom: 6 }}>Audit Log</div>
                <div style={{ display: 'grid', gap: 6, maxHeight: 180, overflow: 'auto' }}>
                  {(selected.auditLog || []).map(a => (
                    <div key={a.id} style={row}>
                      <div style={{ fontWeight: 700 }}>{a.action}</div>
                      <div style={{ color: '#94a3b8', fontSize: 12 }}>
                        {(a.createdAt || '').slice(0, 19).replace('T', ' ')} • {a.actorEmail || a.actorName || 'system'}
                      </div>
                    </div>
                  ))}
                  {(selected.auditLog || []).length === 0 ? <div style={{ color: '#64748b', fontSize: 12 }}>Sem audit</div> : null}
                </div>
              </div>
            </div>
          )}
        </Section>
      </div>
    </div>
  )
}

const pill: React.CSSProperties = {
  border: '1px solid rgba(255,255,255,0.08)',
  background: 'rgba(255,255,255,0.03)',
  padding: '10px 12px',
  borderRadius: 14,
  color: '#cbd5e1',
  fontSize: 13,
}

const row: React.CSSProperties = {
  border: '1px solid rgba(255,255,255,0.06)',
  background: 'rgba(0,0,0,0.14)',
  borderRadius: 12,
  padding: '8px 10px',
}
