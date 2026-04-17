import { useEffect, useState } from 'react'
import api from '../lib/api'
import RiskBadge from './RiskBadge'

interface DealDrawerProps {
  dealId: string | null
  onClose: () => void
  onStageChange?: () => void
}

const STAGES = [
  { key: 'prospecting', label: 'Prospecting' },
  { key: 'qualification', label: 'Qualification' },
  { key: 'proposal', label: 'Proposal' },
  { key: 'negotiation', label: 'Negotiation' },
  { key: 'won', label: 'Won' },
  { key: 'lost', label: 'Lost' },
]

export default function DealDrawer({ dealId, onClose, onStageChange }: DealDrawerProps) {
  const [deal, setDeal] = useState<Record<string, unknown> | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!dealId) return
    setLoading(true)
    api.get<Record<string, unknown>>(`/api/deals/${dealId}`)
      .then(setDeal)
      .catch(() => setDeal(null))
      .finally(() => setLoading(false))
  }, [dealId])

  async function moveStage(stage: string) {
    if (!dealId) return
    await api.patch(`/api/deals/${dealId}`, { deal_stage: stage })
    onStageChange?.()
    const updated = await api.get<Record<string, unknown>>(`/api/deals/${dealId}`)
    setDeal(updated)
  }

  const open = !!dealId

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 7999,
          opacity: open ? 1 : 0, pointerEvents: open ? 'all' : 'none', transition: 'opacity 0.3s',
        }}
      />
      <div style={{
        position: 'fixed', right: 0, top: 0, height: '100vh', width: 460,
        maxWidth: '95vw', background: '#1e293b', borderLeft: '1px solid rgba(255,255,255,0.08)',
        zIndex: 8000, transform: open ? 'translateX(0)' : 'translateX(100%)',
        transition: 'transform 0.3s cubic-bezier(0.4,0,0.2,1)', overflowY: 'auto',
        display: 'flex', flexDirection: 'column',
      }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontWeight: 700, fontSize: 16 }}>
            {deal ? String(deal.deal_name ?? 'Deal') : 'Deal'}
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: 20 }}>×</button>
        </div>

        <div style={{ padding: '20px 24px', flex: 1 }}>
          {loading && <div style={{ color: '#94a3b8' }}>Loading...</div>}
          {deal && !loading && (
            <>
              <Row label="Value" value={`$${Number(deal.deal_amount ?? 0).toLocaleString()}`} />
              <Row label="Stage" value={<RiskBadge probability={Number(deal.deal_probability ?? 0)} />} />
              <Row label="Probability" value={`${deal.deal_probability ?? 0}%`} />
              <Row label="Source" value={String(deal.source ?? '—')} />
              <Row label="Close Date" value={deal.deal_close_date ? String(deal.deal_close_date).slice(0,10) : '—'} />
              <Row label="Owner" value={String(deal.hubspot_owner_id ?? '—')} />

              <div style={{ marginTop: 24 }}>
                <div style={{ fontSize: 11, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>Move Stage</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {STAGES.map(s => (
                    <button
                      key={s.key}
                      onClick={() => moveStage(s.key)}
                      style={{
                        padding: '4px 12px', borderRadius: 20, fontSize: 12, cursor: 'pointer',
                        background: deal.deal_stage === s.key ? 'rgba(124,58,237,0.2)' : 'rgba(255,255,255,0.05)',
                        border: deal.deal_stage === s.key ? '1px solid #7c3aed' : '1px solid rgba(255,255,255,0.1)',
                        color: deal.deal_stage === s.key ? '#a78bfa' : '#94a3b8',
                      }}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Revenue OS Actions */}
              <div style={{ marginTop: 24, padding: '16px', background: 'rgba(30,41,59,0.5)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ fontSize: 11, color: '#a78bfa', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12, fontWeight: 700 }}>Revenue OS Actions</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <button 
                    onClick={() => {
                        api.post('/api/ai/julio/chat', { message: `Escala el deal ${deal.deal_name} para revisión profunda.` })
                          .then(() => alert(`Júlio ha sido notificado sobre ${deal.deal_name}. Puedes ver la revisión en el War Room.`))
                          .catch(() => alert('Simulación: Acción enviada a Júlio'))
                    }}
                    style={{ background: 'linear-gradient(135deg,#7c3aed,#5b21b6)', border: 'none', borderRadius: 8, padding: '10px', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer', textAlign: 'left', display: 'flex', justifyContent: 'space-between' }}>
                    <span>Escalar a Júlio AI</span>
                    <span style={{ opacity: 0.5 }}>→</span>
                  </button>
                  <button 
                    onClick={() => {
                        // We simulate an n8n webhook notification for Risk Alert
                        api.post('/api/n8n/webhook', { workflowId: 'wf07', dealId: deal.id })
                          .then(() => alert('Alerta enviada a Slack / n8n con éxito.'))
                          .catch(() => alert('Simulación: Alerta de riesgo disparada por n8n.'))
                    }}
                    style={{ background: 'rgba(248,113,113,0.15)', border: '1px solid rgba(248,113,113,0.4)', borderRadius: 8, padding: '10px', color: '#fca5a5', fontSize: 12, fontWeight: 600, cursor: 'pointer', textAlign: 'left', display: 'flex', justifyContent: 'space-between' }}>
                    <span>Notificar Alerta de Riesgo (Slack)</span>
                    <span style={{ opacity: 0.5 }}>⚡</span>
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
      <span style={{ color: '#f1f5f9', textAlign: 'right' }}>{value}</span>
    </div>
  )
}
