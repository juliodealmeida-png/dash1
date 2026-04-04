import { useEffect, useRef, useState } from 'react'
import api, { LLM, N8N } from '../lib/api'
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

const JULIO_BLUE = '#3b82f6'
const JULIO_BLUE_LIGHT = '#60a5fa'

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
    <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.08)', background: 'linear-gradient(180deg, rgba(59,130,246,0.06) 0%, transparent 100%)' }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: JULIO_BLUE_LIGHT, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>Júlio AI Briefing</div>
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
  const [deals, setDeals] = useState<any[]>([])
  const [leads, setLeads] = useState<any[]>([])
  const [signals, setSignals] = useState<any[]>([])
  const [forecast, setForecast] = useState<any | null>(null)
  const [dashboard, setDashboard] = useState<any | null>(null)
  const [ctxRefreshing, setCtxRefreshing] = useState(false)
  const [avatarTilt, setAvatarTilt] = useState({ x: 0, y: 0 })
  const [avatarBlink, setAvatarBlink] = useState(false)
  const [avatarMood, setAvatarMood] = useState<'idle' | 'listening' | 'thinking'>('idle')

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

  async function refreshOperationalContext() {
    setCtxRefreshing(true)
    try {
      const [d, l, s, f, h] = await Promise.all([
        api.get<any[] | { deals?: any[] }>('/api/deals').catch(() => []),
        api.get<any[] | { leads?: any[] }>('/api/leads').catch(() => []),
        api.get<any[] | { data?: any[] }>('/api/signals?take=20&unread=true').catch(() => []),
        api.get<any>('/api/forecast').catch(() => ({})),
        api.get<any>('/api/home/dashboard').catch(() => ({})),
      ])
      setDeals(Array.isArray(d) ? d : (d.deals ?? []))
      setLeads(Array.isArray(l) ? l : (l.leads ?? []))
      setSignals(Array.isArray(s) ? s : ((s as any).data ?? []))
      setForecast(f)
      setDashboard(h)
    } finally {
      setCtxRefreshing(false)
    }
  }

  useEffect(() => {
    refreshOperationalContext()
  }, [])

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setAvatarBlink(true)
      window.setTimeout(() => setAvatarBlink(false), 140)
    }, 4200)
    return () => window.clearInterval(intervalId)
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  function buildContextSummary() {
    const atRiskDeals = deals.filter((d) => {
      const p = Number(d.deal_probability ?? 0)
      return p > 0 && p <= 50
    }).slice(0, 5)
    const hotLeads = leads.filter((l) => {
      const s = Number(l.lead_score ?? l.score ?? 0)
      return s >= 70 || String(l.lead_temperature ?? '').toLowerCase() === 'hot'
    }).slice(0, 5)
    const unreadSignals = signals.filter((s) => !s.is_read && !s.read).slice(0, 8)
    const healthScore = dashboard?.health?.health_score ?? dashboard?.healthScore ?? 0
    const forecast90 = dashboard?.kpis?.forecast_90d ?? dashboard?.forecast_90d ?? forecast?.committed ?? 0
    const lines: string[] = []
    lines.push(`Saúde do Pipeline: ${healthScore}/100`)
    lines.push(`Forecast 90d: ${forecast90}`)
    lines.push(`Deals em risco (<=50%): ${atRiskDeals.length}`)
    atRiskDeals.forEach((d) => lines.push(`- ${String(d.deal_name ?? d.company_name ?? 'Deal')} · ${String(d.deal_stage ?? '')} · ${String(d.deal_amount ?? '')}`))
    lines.push(`Leads quentes: ${hotLeads.length}`)
    hotLeads.forEach((l) => lines.push(`- ${String(l.company_name ?? l.companyName ?? l.name ?? 'Lead')} · Score ${String(l.lead_score ?? l.score ?? '')}`))
    lines.push(`Signals não lidos: ${unreadSignals.length}`)
    unreadSignals.forEach((s) => lines.push(`- ${String(s.title ?? s.message ?? 'Signal')}`))
    return lines.join('\n')
  }

  function helpText() {
    return [
      'Comandos do Júlio (demo):',
      '/help — lista comandos',
      '/context — mostra o contexto operacional atual',
      '/refresh — atualiza Deals/Leads/Signals/Forecast',
      '/signal-refresh — aciona workflow de sinais e atualiza contexto',
      '/process-hot — aciona enrichment do lead mais quente',
      '',
      'Dica: você também pode pedir “Focar Hoje”, “MEDDPICC profundo”, “Plano de follow-up” ou “Forecast 90d” normalmente pelo chat.',
    ].join('\n')
  }

  function showHelp() {
    setMessages((prev) => [...prev, { role: 'assistant', content: helpText() }])
  }

  async function handleSlashCommand(cmd: string): Promise<boolean> {
    const [head] = cmd.trim().split(/\s+/)
    const key = head.toLowerCase()
    if (key === '/help') {
      showHelp()
      return true
    }
    if (key === '/context' || key === '/ctx') {
      setMessages((prev) => [...prev, { role: 'assistant', content: buildContextSummary() }])
      return true
    }
    if (key === '/refresh') {
      await refreshOperationalContext()
      setMessages((prev) => [...prev, { role: 'assistant', content: 'Contexto atualizado (deals, leads, signals e forecast).' }])
      return true
    }
    if (key === '/signal-refresh') {
      await N8N.signalRefresh()
      await refreshOperationalContext()
      setMessages((prev) => [...prev, { role: 'assistant', content: 'Sinais atualizados. Contexto operacional recarregado.' }])
      return true
    }
    if (key === '/process-hot') {
      const hot = [...leads].sort((a, b) => Number(b.lead_score ?? b.score ?? 0) - Number(a.lead_score ?? a.score ?? 0))[0]
      if (!hot?.id) {
        setMessages((prev) => [...prev, { role: 'assistant', content: 'Nenhum lead encontrado para processar.' }])
        return true
      }
      await N8N.processLead(String(hot.id))
      setMessages((prev) => [...prev, { role: 'assistant', content: `Lead acionado no workflow (enrichment/scoring): ${String(hot.company_name ?? hot.company ?? hot.name ?? hot.id)}` }])
      return true
    }
    return false
  }

  async function send(textStr?: string) {
    const userMsg = (textStr || input).trim()
    if (!userMsg || loading) return
    setInput('')
    setMessages((prev) => [...prev, { role: 'user', content: userMsg }])
    setLoading(true)
    try {
      if (userMsg.startsWith('/')) {
        const handled = await handleSlashCommand(userMsg)
        if (handled) return
      }
      const sys = 'Você é Júlio AI (Kimi K2.5), Chief of Staff do Guardline Revenue OS. Use capacidades de análise de pipeline, MEDDPICC, riscos, sinais, forecast 90d e automações n8n para gerar planos executáveis. Seja objetivo, operacional e cite passos acionáveis.'
      const ctx = buildContextSummary()
      const convo = [
        { role: 'system', content: sys },
        { role: 'system', content: `Contexto Operacional Atual:\n${ctx}` },
        ...messages.map(m => ({ role: m.role, content: m.content })),
        { role: 'user', content: userMsg },
      ]
      setAvatarMood('thinking')
      const reply = await LLM.chat(convo as any)
      setMessages((prev) => [...prev, { role: 'assistant', content: reply || '...' }])
    } catch (e) {
      setMessages((prev) => [...prev, { role: 'assistant', content: `Error: ${e instanceof Error ? e.message : 'Unknown'}` }])
    } finally {
      setAvatarMood('idle')
      setLoading(false)
    }
  }

  const chiefOfStaffPrompts = [
    { label: 'Analiza mis Gaps de MEDDPICC', prompt: 'Revisa mis deals actuales y dime cuáles tienen Gaps críticos en MEDDPICC y qué preguntas me faltan hacer.' },
    { label: 'Plan para Deals en Riesgo', prompt: 'Genera un plan de acción de seguimiento para mis deals que están en mayor riesgo hoy.' },
    { label: 'Resumen de Señales', prompt: 'Resume las alertas y señales de intención y dame 3 acciones clave a ejecutar.' },
    { label: 'Focar Hoje', prompt: 'Crie um plano “Focar Hoje”: 5 ações em ordem, com motivo, risco e próximo passo (deals e leads). Inclua 1 email curto e 1 mensagem LinkedIn para o deal mais em risco.' },
    { label: 'Forecast 90d', prompt: 'Explique o Forecast 90d (pessimista/base/otimista), riscos e o que mover hoje para subir o cenário base.' },
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
            <button
              type="button"
              onClick={() => showHelp()}
              onMouseEnter={() => setAvatarMood('listening')}
              onMouseLeave={() => { setAvatarMood('idle'); setAvatarTilt({ x: 0, y: 0 }) }}
              onMouseMove={(e) => {
                const r = e.currentTarget.getBoundingClientRect()
                const px = (e.clientX - r.left) / r.width
                const py = (e.clientY - r.top) / r.height
                const tiltX = (py - 0.5) * -10
                const tiltY = (px - 0.5) * 12
                setAvatarTilt({ x: tiltX, y: tiltY })
              }}
              style={{
                width: 36,
                height: 36,
                borderRadius: 12,
                border: `1px solid rgba(59,130,246,0.35)`,
                background: `linear-gradient(135deg, ${JULIO_BLUE}, #06b6d4)`,
                boxShadow: '0 10px 25px rgba(0,0,0,0.35)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 0,
                cursor: 'pointer',
                transform: `perspective(600px) rotateX(${avatarTilt.x}deg) rotateY(${avatarTilt.y}deg)`,
                transition: 'transform 0.08s ease, filter 0.2s ease',
                filter: avatarMood === 'thinking' ? 'saturate(1.3) brightness(1.05)' : 'none',
                animation: avatarMood === 'thinking' ? 'pulse-live 1.1s infinite' : 'pulse-live 1.8s infinite',
              }}
              aria-label="Júlio AI"
              title="Clique para ver comandos"
            >
              <svg width="26" height="26" viewBox="0 0 26 26" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="13" cy="13" r="10" fill="rgba(15,23,42,0.18)" />
                <circle cx="9.5" cy="12" r="2.2" fill="rgba(255,255,255,0.92)" />
                <circle cx="16.5" cy="12" r="2.2" fill="rgba(255,255,255,0.92)" />
                <circle cx="10.2" cy="12.4" r={avatarBlink ? 0.2 : 1} fill="rgba(15,23,42,0.9)" />
                <circle cx="17.2" cy="12.4" r={avatarBlink ? 0.2 : 1} fill="rgba(15,23,42,0.9)" />
                <path d={avatarMood === 'thinking' ? 'M8.5 17.2C10.8 19.3 15.3 19.3 17.5 17.2' : 'M8.5 17.5C10.9 18.8 15.2 18.8 17.5 17.5'} stroke="rgba(255,255,255,0.9)" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
            </button>
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
                background: m.role === 'user' ? 'rgba(59,130,246,0.16)' : 'rgba(30,41,59,0.8)',
                border: `1px solid ${m.role === 'user' ? 'rgba(59,130,246,0.32)' : 'rgba(255,255,255,0.08)'}`,
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
                <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: JULIO_BLUE }} />
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
                onMouseEnter={e => { if(!loading) { e.currentTarget.style.background = 'rgba(59,130,246,0.12)'; e.currentTarget.style.color = JULIO_BLUE_LIGHT; e.currentTarget.style.borderColor = 'rgba(59,130,246,0.32)'; } }}
                onMouseLeave={e => { if(!loading) { e.currentTarget.style.background = 'rgba(30,41,59,0.8)'; e.currentTarget.style.color = '#94a3b8'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; } }}
              >
                + {qa.label}
              </button>
            ))}
            <button
              onClick={async () => {
                if (loading) return
                setLoading(true)
                try {
                  await N8N.signalRefresh()
                  await refreshOperationalContext()
                  setMessages(prev => [...prev, { role: 'assistant', content: 'Workflow de sinais acionado e contexto atualizado.' }])
                } catch (e) {
                  setMessages(prev => [...prev, { role: 'assistant', content: 'Falha ao acionar workflow de sinais.' }])
                } finally {
                  setLoading(false)
                }
              }}
              disabled={loading}
              style={{
                background: `linear-gradient(135deg,${JULIO_BLUE},#06b6d4)`,
                border: 'none',
                color: '#fff',
                borderRadius: 20,
                padding: '6px 14px',
                fontSize: 12,
                cursor: loading ? 'not-allowed' : 'pointer'
              }}
            >
              ⚡ Atualizar Sinais
            </button>
            <button
              onClick={async () => {
                if (loading) return
                setLoading(true)
                try {
                  const hot = [...leads].sort((a, b) => Number(b.lead_score ?? b.score ?? 0) - Number(a.lead_score ?? a.score ?? 0))[0]
                  if (!hot?.id) {
                    setMessages(prev => [...prev, { role: 'assistant', content: 'Nenhum lead encontrado para processar.' }])
                    return
                  }
                  await N8N.processLead(String(hot.id))
                  setMessages(prev => [...prev, { role: 'assistant', content: `Workflow acionado para lead quente: ${String(hot.company_name ?? hot.company ?? hot.name ?? hot.id)}` }])
                } catch (e) {
                  setMessages(prev => [...prev, { role: 'assistant', content: 'Falha ao acionar workflow do lead.' }])
                } finally {
                  setLoading(false)
                }
              }}
              disabled={loading}
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: '#cbd5e1',
                borderRadius: 20,
                padding: '6px 14px',
                fontSize: 12,
                cursor: loading ? 'not-allowed' : 'pointer'
              }}
            >
              🧬 Enriquecer Lead Hot
            </button>
            <button
              onClick={async () => {
                if (loading) return
                setLoading(true)
                try {
                  await refreshOperationalContext()
                  setMessages(prev => [...prev, { role: 'assistant', content: 'Contexto recarregado.' }])
                } catch {
                  setMessages(prev => [...prev, { role: 'assistant', content: 'Falha ao recarregar contexto.' }])
                } finally {
                  setLoading(false)
                }
              }}
              disabled={loading}
              style={{
                background: 'transparent',
                border: '1px solid rgba(255,255,255,0.1)',
                color: '#94a3b8',
                borderRadius: 20,
                padding: '6px 14px',
                fontSize: 12,
                cursor: loading ? 'not-allowed' : 'pointer'
              }}
            >
              ↻ Atualizar Contexto {ctxRefreshing ? '…' : ''}
            </button>
          </div>

          {/* Real Input */}
          <div style={{ display: 'flex', gap: 12, background: '#1e293b', padding: '8px', borderRadius: 16, border: '1px solid rgba(59,130,246,0.45)', boxShadow: '0 4px 12px rgba(0,0,0,0.2)' }}>
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
                background: (loading || !input.trim()) ? 'rgba(255,255,255,0.05)' : `linear-gradient(135deg,${JULIO_BLUE},#06b6d4)`, 
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
