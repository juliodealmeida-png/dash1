import { useEffect, useState } from 'react'
import Section from '../components/Section'
import { api } from '../lib/api'
import type { InvestorDeal } from '../lib/types'
import { useAuth } from '../contexts/AuthContext'

export default function Investor() {
  const { getAccessToken } = useAuth()
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)
  const [kanban, setKanban] = useState<{ stages: string[]; columns: Record<string, InvestorDeal[]> } | null>(null)

  const refresh = async () => {
    setLoading(true)
    setErr(null)
    try {
      const token = await getAccessToken()
      if (!token) throw new Error('Sem token')
      const k = await api.investor.kanban(token)
      setKanban(k)
    } catch (e: any) {
      setErr(e?.message || 'Erro ao carregar investor')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refresh()
  }, [])

  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <Section title="Investor Pipeline" right={<button className="btn" onClick={refresh}>Refresh</button>}>
        {loading ? <div style={{ color: '#94a3b8' }}>Carregando…</div> : null}
        {err ? <div style={{ color: '#fca5a5', marginBottom: 10 }}>{err}</div> : null}
        {kanban ? (
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${kanban.stages.length}, minmax(260px, 1fr))`, gap: 12, overflowX: 'auto' }}>
            {kanban.stages.map(stage => (
              <div key={stage} style={{ border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, background: 'rgba(255,255,255,0.02)', padding: 10, minHeight: 220 }}>
                <div style={{ fontWeight: 900, marginBottom: 8 }}>{stage}</div>
                <div style={{ display: 'grid', gap: 8 }}>
                  {(kanban.columns[stage] || []).map(d => (
                    <div key={d.id} style={{ border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: 10, background: 'rgba(0,0,0,0.14)' }}>
                      <div style={{ fontWeight: 800 }}>{d.investorName}</div>
                      <div style={{ color: '#94a3b8', fontSize: 12, marginTop: 4 }}>
                        {d.firm ? `${d.firm} • ` : ''}{d.type} • {d.status} • {d.probability}%
                      </div>
                      <div style={{ color: '#cbd5e1', fontSize: 12, marginTop: 6 }}>
                        Ticket: {d.ticketMin ?? '-'} - {d.ticketMax ?? '-'}
                      </div>
                    </div>
                  ))}
                  {(kanban.columns[stage] || []).length === 0 ? <div style={{ color: '#64748b', fontSize: 12 }}>Vazio</div> : null}
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </Section>
    </div>
  )
}

