import { useEffect, useRef, useState } from 'react'
import api from '../lib/api'
import { useI18n } from '../contexts/I18nContext'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

interface BriefData {
  summary?: string
  top_actions?: string[]
  risks?: string[]
}

// Sidebar component
function ContextSidebar() {
  const sessions = [
    { title: 'Revisión MEDDPICC de Acme', date: 'Hoy' },
    { title: 'Forecast vs Commit de Marzo', date: 'Ayer' },
    { title: 'Análisis de Deals en Riesgo', date: 'Hace 3 días' }
  ]
  return (
    <aside style={{ width: 260, background: '#1e293b', borderRight: '1px solid rgba(255,255,255,0.08)', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: 20, borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
        <h2 style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#f1f5f9', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Sesiones y Contexto</h2>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: 12 }}>
        <div style={{ fontSize: 11, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 8, paddingLeft: 8 }}>Recientes</div>
        {sessions.map((s, i) => (
          <div key={i} style={{ padding: '10px 12px', borderRadius: 8, cursor: 'pointer', marginBottom: 4, transition: 'background 0.2s' }} 
               onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
               onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
            <div style={{ fontSize: 13, color: '#e2e8f0', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.title}</div>
            <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>{s.date}</div>
          </div>
        ))}
      </div>
    </aside>
  )
}

function BriefDashboard({ brief }: { brief: BriefData }) {
  return (
    <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.08)', background: 'linear-gradient(180deg, rgba(124,58,237,0.05) 0%, transparent 100%)' }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: '#a78bfa', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>Júlio AI Briefing</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.5fr) minmax(0, 1fr) minmax(0, 1fr)', gap: 16 }}>
        {/* Summary Card */}
        <div style={{ background: 'rgba(30,41,59,0.5)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 12, padding: 16 }}>
          <div style={{ fontSize: 11, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 8 }}>Resumen Operativo</div>
          <p style={{ fontSize: 13, color: '#cbd5e1', lineHeight: 1.5, margin: 0 }}>{brief.summary || 'Sin resumen disponible.'}</p>
        </div>
        {/* Actions Card */}
        <div style={{ background: 'rgba(30,41,59,0.5)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 12, padding: 16 }}>
          <div style={{ fontSize: 11, color: '#34d399', textTransform: 'uppercase', marginBottom: 8 }}>Top Actions</div>
          <ul style={{ margin: 0, paddingLeft: 16, color: '#f1f5f9', fontSize: 13, lineHeight: 1.5 }}>
            {(brief.top_actions || []).map((a, i) => <li key={i}>{a}</li>)}
            {!(brief.top_actions?.length) && <span style={{ color: '#64748b' }}>Nada prioritario</span>}
          </ul>
        </div>
        {/* Risks Card */}
        <div style={{ background: 'rgba(30,41,59,0.5)', border: '1px solid rgba(248,113,113,0.15)', borderRadius: 12, padding: 16 }}>
          <div style={{ fontSize: 11, color: '#f87171', textTransform: 'uppercase', marginBottom: 8 }}>Riesgos Críticos</div>
          <ul style={{ margin: 0, paddingLeft: 16, color: '#f1f5f9', fontSize: 13, lineHeight: 1.5 }}>
            {(brief.risks || []).map((r, i) => <li key={i}>{r}</li>)}
            {!(brief.risks?.length) && <span style={{ color: '#64748b' }}>No detectados</span>}
          </ul>
        </div>
      </div>
    </div>
  )
}

export default function Battlecard() {
  const { t } = useI18n()
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [brief, setBrief] = useState<BriefData | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    api.get<{ data?: { brief: BriefData }, brief?: BriefData, summary?: string, top_actions?: string[], risks?: string[] }>('/api/ai/julio/brief/latest')
      .then(res => {
        // Fallback for different API wrappers
        if (res.data?.brief) setBrief(res.data.brief)
        else if (res.brief) setBrief(res.brief)
        else if (res.summary || res.top_actions || res.risks) setBrief(res as BriefData)
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  async function send(textStr?: string) {
    const userMsg = (textStr || input).trim()
    if (!userMsg || loading) return
    setInput('')
    setMessages((prev) => [...prev, { role: 'user', content: userMsg }])
    setLoading(true)
    try {
      const data = await api.post<{ reply?: string; message?: string }>('/api/ai/julio/chat', { message: userMsg })
      setMessages((prev) => [...prev, { role: 'assistant', content: data.reply || data.message || '...' }])
    } catch (e) {
      setMessages((prev) => [...prev, { role: 'assistant', content: `Error: ${e instanceof Error ? e.message : 'Unknown'}` }])
    } finally {
      setLoading(false)
    }
  }

  const chiefOfStaffPrompts = [
    { label: 'Analiza mis Gaps de MEDDPICC', prompt: 'Revisa mis deals actuales y dime cuáles tienen Gaps críticos en MEDDPICC y qué preguntas me faltan hacer.' },
    { label: 'Plan para Deals en Riesgo', prompt: 'Genera un plan de acción de seguimiento para mis deals que están en mayor riesgo hoy.' },
    { label: 'Resumen de Señales', prompt: 'Resume las alertas y señales de intención y dame 3 acciones clave a ejecutar.' },
  ]

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 56px)', margin: '-24px', background: '#0f172a' }}>
      {/* Sidebar */}
      <ContextSidebar />

      {/* Main War Room */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>
        
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', borderBottom: '1px solid rgba(255,255,255,0.08)', background: '#1e293b' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg,#7c3aed,#06b6d4)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 14 }}>J</div>
            <div>
              <h1 style={{ fontSize: 16, fontWeight: 700, color: '#f1f5f9', margin: 0 }}>Júlio AI</h1>
              <div style={{ fontSize: 12, color: '#94a3b8' }}>Revenue Chief of Staff</div>
            </div>
          </div>
        </div>

        {/* Dashboard / Brief pinned */}
        {brief && Object.keys(brief).length > 0 && <BriefDashboard brief={brief} />}

        {/* Chat Scrollable Area */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {messages.length === 0 && (
            <div style={{ margin: 'auto', textAlign: 'center', color: '#64748b' }}>
              <div style={{ fontSize: 48, marginBottom: 16, opacity: 0.5 }}>⚡</div>
              <p style={{ fontSize: 14 }}>Júlio está listo para revisar tu pipeline y señales.</p>
            </div>
          )}

          {messages.map((m, i) => (
            <div key={i} style={{ display: 'flex', width: '100%', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
              <div style={{
                maxWidth: '75%',
                background: m.role === 'user' ? 'rgba(124,58,237,0.15)' : 'rgba(30,41,59,0.8)',
                border: `1px solid ${m.role === 'user' ? 'rgba(124,58,237,0.3)' : 'rgba(255,255,255,0.08)'}`,
                borderRadius: m.role === 'user' ? '12px 12px 0 12px' : '12px 12px 12px 0',
                padding: '16px',
                fontSize: 14,
                lineHeight: 1.6,
                color: '#e2e8f0',
                whiteSpace: 'pre-wrap',
                boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'
              }}>
                {m.content}
              </div>
            </div>
          ))}
          
          {loading && (
            <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
               <div style={{ background: 'rgba(30,41,59,0.8)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px 12px 12px 0', padding: '12px 16px', fontSize: 13, color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: '#7c3aed' }} />
                Júlio analizando contexto operativo...
               </div>
            </div>
          )}
          <div ref={bottomRef} style={{ height: 1 }} />
        </div>

        {/* Console Input Area */}
        <div style={{ padding: '0 24px 24px 24px', background: 'transparent' }}>
          
          {/* Quick Actions (Chief of Staff commands) */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
            {chiefOfStaffPrompts.map((qa) => (
              <button
                key={qa.label}
                onClick={() => send(qa.prompt)}
                disabled={loading}
                style={{ 
                  background: 'rgba(30,41,59,0.8)', 
                  border: '1px solid rgba(255,255,255,0.1)', 
                  color: '#94a3b8', 
                  borderRadius: 20, 
                  padding: '6px 14px', 
                  fontSize: 12, 
                  cursor: loading ? 'not-allowed' : 'pointer',
                  transition: 'background 0.2s, color 0.2s',
                }}
                onMouseEnter={e => { if(!loading) { e.currentTarget.style.background = 'rgba(124,58,237,0.1)'; e.currentTarget.style.color = '#a78bfa'; e.currentTarget.style.borderColor = 'rgba(124,58,237,0.3)'; } }}
                onMouseLeave={e => { if(!loading) { e.currentTarget.style.background = 'rgba(30,41,59,0.8)'; e.currentTarget.style.color = '#94a3b8'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; } }}
              >
                + {qa.label}
              </button>
            ))}
          </div>

          {/* Real Input */}
          <div style={{ display: 'flex', gap: 12, background: '#1e293b', padding: '8px', borderRadius: 16, border: '1px solid rgba(124,58,237,0.4)', boxShadow: '0 4px 12px rgba(0,0,0,0.2)' }}>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && send()}
              placeholder="Instruye a Júlio: Genera un plan, revisa gaps, resume riesgos..."
              style={{ flex: 1, background: 'transparent', border: 'none', padding: '8px 16px', color: '#f1f5f9', fontSize: 14, outline: 'none' }}
              disabled={loading}
            />
            <button
              onClick={() => send()}
              disabled={loading || !input.trim()}
              style={{ 
                background: (loading || !input.trim()) ? 'rgba(255,255,255,0.05)' : 'linear-gradient(135deg,#7c3aed,#06b6d4)', 
                border: 'none', color: '#fff', borderRadius: 12, padding: '0 24px', fontSize: 14, fontWeight: 600, 
                cursor: (loading || !input.trim()) ? 'not-allowed' : 'pointer' 
              }}
            >
              Consultar
            </button>
          </div>
          <div style={{ textAlign: 'center', fontSize: 10, color: '#64748b', marginTop: 12 }}>
            Júlio AI procesa intención comercial pero puede cometer errores. Verifica la data vital del CRM.
          </div>
        </div>
      </div>
    </div>
  )
}
