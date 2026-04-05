import { useEffect, useState } from 'react'
import api from '../lib/api'
import { useI18n } from '../contexts/I18nContext'

interface Document {
  id: string
  name: string
  type?: string
  deal?: string
  created_at?: string
  url?: string
}

export default function Documents() {
  const { t } = useI18n()
  const [docs, setDocs] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get<Document[] | { documents?: Document[] }>('/api/documents')
      .then((d) => setDocs(Array.isArray(d) ? d : (d.documents ?? [])))
      .catch(() => setDocs([]))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#f1f5f9' }}>Documents</h1>
      </div>
      {loading && <div style={{ color: '#94a3b8' }}>{t('common.loading')}</div>}
      {!loading && docs.length === 0 && <div style={{ color: '#64748b' }}>{t('common.empty')}</div>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {docs.map((d) => (
          <div key={d.id} style={{
            background: '#1e293b',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 10,
            padding: '14px 20px',
            display: 'flex',
            alignItems: 'center',
            gap: 16,
          }}>
            <div style={{ fontSize: 20 }}>📄</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#f1f5f9' }}>{d.name}</div>
              <div style={{ fontSize: 12, color: '#64748b' }}>{d.type}{d.deal ? ` · ${d.deal}` : ''}</div>
            </div>
            {d.created_at && <div style={{ fontSize: 12, color: '#64748b' }}>{d.created_at}</div>}
            {d.url && (
              <a href={d.url} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: '#06b6d4', textDecoration: 'none' }}>
                {t('common.open')}
              </a>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
