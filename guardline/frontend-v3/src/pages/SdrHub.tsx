import { useEffect, useState } from 'react'
import api from '../lib/api'

interface Lead { id: string; name: string; company: string; score: number; created_at: string; email: string }
interface Deal { id: string; deal_name: string; deal_amount: number; deal_stage: string; deal_probability: number }
interface Action { id: string; title: string; type: 'priority' | 'warning' | 'info' | 'success' }

export default function SdrHub() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [deals, setDeals] = useState<Deal[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      api.get<Lead[]>('/api/leads').catch(() => []),
      api.get<Deal[]>('/api/pipeline/deals').catch(() => [])
    ]).then(([l, d]) => {
      setLeads(l.filter(x => x.score && x.score > 80))
      setDeals((d as any[]).slice(0, 3)) // just top 3 for risk
      setLoading(false)
    })
  }, [])

  const actions: Action[] = [
    { id: '1', title: 'Ligar para ' + (leads[0]?.name || 'Tony Stark') + ' — sem contato há 8 dias', type: 'priority' },
    { id: '2', title: 'Avançar negociação com ' + (deals[0]?.deal_name || 'Acme Corp'), type: 'warning' },
    { id: '3', title: 'Revisar qualificação de novos leads Inbound', type: 'info' }
  ]

  if (loading) return <div style={{ color: 'var(--text-muted)' }}>Cargando SDR Hub...</div>

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)' }}>SDR Hub</h1>
        <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Priorización Diaria de Leads y Riesgos (Design System Sync)</div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 24, marginBottom: 24 }}>
        {/* Left Column: Leads Quentes */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <h2 style={{ fontSize: 14, color: 'var(--accent-green)', textTransform: 'uppercase', letterSpacing: 1, fontWeight: 700 }}>Leads Quentes (&gt;80)</h2>
          {leads.map(lead => (
            <div key={lead.id} className="deal-row">
              <div className="risk-badge risk-healthy" style={{ background: 'var(--accent-green-dim)' }}>
                {lead.score}
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-primary)' }}>{lead.name}</div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{lead.company} · {lead.email}</div>
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Hoje</div>
              <button style={{ background: 'var(--accent-purple)', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: 6, fontSize: 12, cursor: 'pointer' }}>
                Ver Lead
              </button>
            </div>
          ))}
          {leads.length === 0 && <span style={{ color: 'var(--text-muted)' }}>Ningún lead caliente hoy.</span>}
        </div>

        {/* Right Column: Deals em Risco */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <h2 style={{ fontSize: 14, color: 'var(--accent-red)', textTransform: 'uppercase', letterSpacing: 1, fontWeight: 700 }}>Deals em Risco</h2>
          {deals.map(deal => (
            <div key={deal.id} className="deal-row critical" style={{ gridTemplateColumns: '1fr auto', padding: 12 }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)' }}>{deal.deal_name || (deal as any).name}</div>
                <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Falta de Follow-up</div>
              </div>
              <div className="risk-badge risk-critical">
                {deal.deal_probability || 20}%
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom Row */}
      <div className="card" style={{ padding: 20 }}>
        <h2 style={{ fontSize: 14, color: 'var(--accent-cyan)', textTransform: 'uppercase', letterSpacing: 1, fontWeight: 700, marginBottom: 16 }}>Próximas Ações (War Room)</h2>
        <div>
          {actions.map(act => (
            <div key={act.id} className={`brief-item ${act.type}`}>
              {act.title}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
