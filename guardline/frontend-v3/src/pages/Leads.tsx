import { useEffect, useState } from 'react'
import api from '../lib/api'
import { useI18n } from '../contexts/I18nContext'

interface Lead {
  id: string
  name: string
  email?: string
  company?: string
  score?: number
  status?: string
  source?: string
  created_at?: string
}

const SCORE_COLOR = (s?: number) => {
  if (!s) return '#64748b'
  if (s >= 80) return '#34d399'
  if (s >= 50) return '#fbbf24'
  return '#f87171'
}

import LeadDrawer from '../components/LeadDrawer'

export default function Leads() {
  const { t } = useI18n()
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [selectedLead, setSelectedLead] = useState<string | null>(null)

  useEffect(() => {
    api.get<Lead[] | { leads?: Lead[] }>('/api/leads')
      .then((data) => setLeads(Array.isArray(data) ? data : (data.leads ?? [])))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  const filtered = leads.filter((l) =>
    !search || l.name?.toLowerCase().includes(search.toLowerCase()) || l.company?.toLowerCase().includes(search.toLowerCase())
  )

  const hotLeads = leads.filter(l => (l.score || 0) >= 80)
  const newLeads = leads.filter(l => !l.status || l.status.toLowerCase() === 'new' || l.status.toLowerCase() === 'nuevo')

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#f1f5f9' }}>{t('leads.title') || 'Gestión de Leads'}</h1>
          <div style={{ fontSize: 13, color: '#94a3b8' }}>Prioriza y enriquece contactos vía la inteligencia de n8n.</div>
        </div>
        <div style={{ display: 'flex', gap: 16 }}>
          <div style={{ display: 'flex', gap: 12, background: 'rgba(255,255,255,0.03)', padding: '6px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.08)' }}>
            <div style={{ fontSize: 12, color: '#94a3b8' }}>Total: <strong style={{ color: '#f1f5f9' }}>{leads.length}</strong></div>
            <div style={{ fontSize: 12, color: '#94a3b8' }}>Nuevos: <strong style={{ color: '#06b6d4' }}>{newLeads.length}</strong></div>
            <div style={{ fontSize: 12, color: '#94a3b8' }}>Hot (&gt;80): <strong style={{ color: '#34d399' }}>{hotLeads.length}</strong></div>
          </div>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search leads..."
            style={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '8px 14px', color: '#f1f5f9', fontSize: 13, outline: 'none', width: 220 }}
          />
        </div>
      </div>
      {loading && <div style={{ color: '#94a3b8' }}>{t('common.loading') || 'Loading...'}</div>}
      {error && <div style={{ color: '#f87171' }}>{t('common.error') || 'Error'}: {error}</div>}
      {!loading && !error && filtered.length === 0 && <div style={{ color: '#64748b' }}>{t('common.empty') || 'No leads match the criteria.'}</div>}
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {filtered.map((lead) => (
          <div 
            key={lead.id} 
            onClick={() => setSelectedLead(lead.id)}
            style={{
              background: '#1e293b',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 10,
              padding: '14px 20px',
              display: 'flex',
              alignItems: 'center',
              gap: 16,
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(124,58,237,0.4)'; e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; e.currentTarget.style.background = '#1e293b'; }}
          >
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#f1f5f9' }}>{lead.name}</div>
              <div style={{ fontSize: 12, color: '#64748b' }}>{lead.email} {lead.company ? `· ${lead.company}` : ''}</div>
            </div>
            {lead.source && <div style={{ fontSize: 12, color: '#94a3b8' }}>{lead.source}</div>}
            {lead.status && (
              <div style={{ padding: '3px 8px', borderRadius: 12, fontSize: 11, background: 'rgba(255,255,255,0.06)', color: '#94a3b8' }}>
                {lead.status}
              </div>
            )}
            {lead.score !== undefined && (
              <div style={{ fontSize: 16, fontWeight: 700, color: SCORE_COLOR(lead.score), minWidth: 36, textAlign: 'right' }}>
                {lead.score}
              </div>
            )}
            <div style={{ width: 24, textAlign: 'right', color: '#64748b' }}>→</div>
          </div>
        ))}
      </div>

      <LeadDrawer leadId={selectedLead} onClose={() => setSelectedLead(null)} />
    </div>
  )
}

