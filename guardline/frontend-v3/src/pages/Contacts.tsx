import { useEffect, useState } from 'react'
import api from '../lib/api'
import { useI18n } from '../contexts/I18nContext'

interface Contact {
  id: string
  name: string
  email?: string
  company?: string
  jobTitle?: string
  score?: number
  status?: string
  phone?: string
}

const SCORE_COLOR = (s?: number) => {
  if (!s) return '#64748b'
  if (s >= 70) return '#34d399'
  if (s >= 40) return '#fbbf24'
  return '#f87171'
}

const STATUS_COLOR: Record<string, string> = {
  hot: '#f87171',
  warm: '#fbbf24',
  cold: '#64748b',
  qualified: '#34d399',
  new: '#06b6d4',
}

export default function Contacts() {
  const { t } = useI18n()
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')

  useEffect(() => {
    api.get<Contact[] | { data?: Contact[] }>('/api/contacts')
      .then((d) => setContacts(Array.isArray(d) ? d : (d.data ?? [])))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  const filtered = contacts.filter((c) =>
    !search ||
    c.name?.toLowerCase().includes(search.toLowerCase()) ||
    c.email?.toLowerCase().includes(search.toLowerCase()) ||
    c.company?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#f1f5f9' }}>{t('sidebar.contacts') || 'Contatos'}</h1>
          <div style={{ fontSize: 13, color: '#94a3b8' }}>{contacts.length} contatos</div>
        </div>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar contato..."
          style={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '8px 14px', color: '#f1f5f9', fontSize: 13, outline: 'none', width: 220 }}
        />
      </div>

      {loading && <div style={{ color: '#94a3b8' }}>{t('common.loading')}</div>}
      {error && <div style={{ color: '#f87171' }}>{error}</div>}
      {!loading && !error && filtered.length === 0 && <div style={{ color: '#64748b' }}>{t('common.empty')}</div>}

      <div style={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
              {['Nome', 'Email', 'Empresa', 'Cargo', 'Score', 'Status'].map((h) => (
                <th key={h} style={{ textAlign: h === 'Score' || h === 'Status' ? 'center' : 'left', padding: '10px 14px', color: '#64748b', fontSize: 11, textTransform: 'uppercase', fontWeight: 600 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((c) => (
              <tr key={c.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <td style={{ padding: '10px 14px', fontWeight: 600, color: '#f1f5f9' }}>{c.name || '—'}</td>
                <td style={{ padding: '10px 14px', color: '#94a3b8', fontSize: 12 }}>{c.email || '—'}</td>
                <td style={{ padding: '10px 14px', color: '#f1f5f9' }}>{c.company || '—'}</td>
                <td style={{ padding: '10px 14px', color: '#64748b', fontSize: 12 }}>{c.jobTitle || '—'}</td>
                <td style={{ padding: '10px 14px', textAlign: 'center', fontWeight: 700, color: SCORE_COLOR(c.score) }}>{c.score ?? '—'}</td>
                <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                  {c.status ? (
                    <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 8, background: 'rgba(255,255,255,0.06)', color: STATUS_COLOR[c.status.toLowerCase()] || '#94a3b8', textTransform: 'capitalize' }}>{c.status}</span>
                  ) : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
