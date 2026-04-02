import { useEffect, useState } from 'react'
import api from '../lib/api'

interface LeadDrawerProps {
  leadId: string | null
  onClose: () => void
}

export default function LeadDrawer({ leadId, onClose }: LeadDrawerProps) {
  const [lead, setLead] = useState<Record<string, unknown> | null>(null)
  const [loading, setLoading] = useState(false)
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!leadId) return
    setLoading(true)
    // leads are in the list; fetch from leads endpoint
    api.get<{ success: boolean; data: Record<string, unknown>[] }>('/api/leads')
      .then(res => {
        const list = res?.data ?? (Array.isArray(res) ? res : [])
        const found = list.find((l) => String(l.id) === leadId)
        setLead(found ?? null)
        setNote(String(found?.notes ?? found?.next_action ?? ''))
      })
      .catch(() => setLead(null))
      .finally(() => setLoading(false))
  }, [leadId])

  async function saveNote() {
    if (!leadId) return
    setSaving(true)
    await api.patch(`/api/leads/${leadId}`, { notes: note, next_action: note })
      .catch(() => {})
      .finally(() => setSaving(false))
  }

  const open = !!leadId

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 7999, opacity: open ? 1 : 0, pointerEvents: open ? 'all' : 'none', transition: 'opacity 0.3s' }} />
      <div style={{ position: 'fixed', right: 0, top: 0, height: '100vh', width: 440, maxWidth: '95vw', background: '#1e293b', borderLeft: '1px solid rgba(255,255,255,0.08)', zIndex: 8000, transform: open ? 'translateX(0)' : 'translateX(100%)', transition: 'transform 0.3s cubic-bezier(0.4,0,0.2,1)', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontWeight: 700, fontSize: 16 }}>{lead ? String(lead.company_name ?? lead.companyName ?? 'Lead') : 'Lead'}</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: 20 }}>×</button>
        </div>
        <div style={{ padding: '20px 24px', flex: 1 }}>
          {loading && <div style={{ color: '#94a3b8' }}>Loading...</div>}
          {lead && !loading && (
            <>
              <Row label="Score" value={String(lead.lead_score ?? lead.score ?? 0)} />
              <Row label="Contact" value={String(lead.contact_name ?? '—')} />
              <Row label="Email" value={String(lead.contact_email ?? '—')} />
              <Row label="Source" value={String(lead.primary_solution ?? lead.source ?? '—')} />
              <Row label="Temperature" value={String(lead.lead_temperature ?? '—')} />
              <Row label="Stage" value={String(lead.pipeline_stage ?? '—')} />
              <div style={{ marginTop: 20 }}>
                <div style={{ fontSize: 11, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Next Action</div>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={3}
                  style={{ width: '100%', background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '8px 12px', color: '#f1f5f9', fontSize: 13, resize: 'vertical', outline: 'none' }}
                />
                <button onClick={saveNote} disabled={saving} style={{ marginTop: 8, background: 'rgba(124,58,237,0.2)', border: '1px solid #7c3aed', color: '#a78bfa', borderRadius: 8, padding: '6px 14px', fontSize: 12, cursor: 'pointer' }}>
                  {saving ? 'Saving...' : 'Save'}
                </button>
              </div>

              {/* Lead Activation Hub */}
              <div style={{ marginTop: 24, padding: '16px', background: 'rgba(30,41,59,0.5)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ fontSize: 11, color: '#34d399', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12, fontWeight: 700 }}>n8n / AI Activation Hub</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <button 
                    onClick={() => {
                        api.post('/api/n8n/webhook', { workflowId: 'enrichment', leadId: lead.id })
                          .then(() => alert(`Lead ${lead.company_name || 'seleccionado'} enviado a n8n para enriquecimiento.`))
                          .catch(() => alert('Simulación: Trigger enviado a n8n (Enrichment).'))
                    }}
                    style={{ background: 'rgba(52,211,153,0.15)', border: '1px solid rgba(52,211,153,0.4)', borderRadius: 8, padding: '10px', color: '#6ee7b7', fontSize: 12, fontWeight: 600, cursor: 'pointer', textAlign: 'left', display: 'flex', justifyContent: 'space-between' }}>
                    <span>Enriquecer Data (Clearbit/Apollo)</span>
                    <span style={{ opacity: 0.5 }}>⚡</span>
                  </button>
                  <button 
                    onClick={() => {
                        api.post('/api/ai/julio/chat', { message: `Genera un icebreaker email para el lead: ${lead.contact_name || lead.company_name}.` })
                          .then(() => alert('Icebreaker generado. Revisa la consola de Júlio en el War Room.'))
                          .catch(() => alert('Simulación: Solicitud enviada a Júlio.'))
                    }}
                    style={{ background: 'linear-gradient(135deg,#7c3aed,#5b21b6)', border: 'none', borderRadius: 8, padding: '10px', color: '#f1f5f9', fontSize: 12, fontWeight: 600, cursor: 'pointer', textAlign: 'left', display: 'flex', justifyContent: 'space-between' }}>
                    <span>Generar Icebreaker (Júlio)</span>
                    <span style={{ opacity: 0.5 }}>→</span>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  )
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.04)', fontSize: 13 }}>
      <span style={{ color: '#94a3b8' }}>{label}</span>
      <span style={{ color: '#f1f5f9' }}>{value}</span>
    </div>
  )
}
