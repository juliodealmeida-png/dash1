import { useEffect, useMemo, useState } from 'react'
import Section from '../components/Section'
import { api } from '../lib/api'
import { safeJsonParse } from '../lib/parsers'
import { useAuth } from '../contexts/AuthContext'

export default function Julio() {
  const { getAccessToken } = useAuth()
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)
  const [brief, setBrief] = useState<any>(null)
  const [meddpicc, setMeddpicc] = useState<any>(null)
  const [msg, setMsg] = useState('')
  const [chat, setChat] = useState<Array<{ role: 'user' | 'julio'; text: string }>>([])
  const [streaming, setStreaming] = useState(false)

  const refresh = async () => {
    setLoading(true)
    setErr(null)
    try {
      const token = await getAccessToken()
      if (!token) throw new Error('Sem token')
      const [b, m] = await Promise.all([api.julio.briefLatest(token), api.julio.meddPiccDashboard(token)])
      setBrief(b)
      setMeddpicc(m)
    } catch (e: any) {
      setErr(e?.message || 'Erro ao carregar Júlio')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refresh()
  }, [])

  const briefItems = useMemo(() => {
    if (!brief) return []
    const raw = brief?.brief ?? brief
    if (Array.isArray(raw?.top_actions) || Array.isArray(raw?.risks)) {
      return [
        ...(raw.summary ? [raw.summary] : []),
        ...(raw.top_actions || []).map((x: string) => `Ação: ${x}`),
        ...(raw.risks || []).map((x: string) => `Risco: ${x}`),
      ]
    }
    const parsed = typeof raw === 'string' ? safeJsonParse<any>(raw, null) : raw
    const bullets = parsed?.bullets || parsed?.items || parsed?.summary || []
    if (typeof bullets === 'string') return [bullets]
    if (Array.isArray(bullets)) return bullets
    return []
  }, [brief])

  const onSend = async () => {
    const text = msg.trim()
    if (!text || streaming) return
    setMsg('')
    setChat(prev => [...prev, { role: 'user', text }, { role: 'julio', text: '' }])
    setStreaming(true)
    setErr(null)
    try {
      const token = await getAccessToken()
      if (!token) throw new Error('Sem token')
      await api.julio.chatStream(token, text, chunk => {
        setChat(prev => {
          const next = [...prev]
          const last = next[next.length - 1]
          if (last?.role === 'julio') last.text += chunk
          return next
        })
      })
    } catch (e: any) {
      setErr(e?.message || 'Falha no chat')
    } finally {
      setStreaming(false)
    }
  }

  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <Section title="Júlio AI" right={<button className="btn" onClick={refresh}>Refresh</button>}>
        {loading ? <div style={{ color: '#94a3b8' }}>Carregando…</div> : null}
        {err ? <div style={{ color: '#fca5a5', marginBottom: 10 }}>{err}</div> : null}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 3fr', gap: 14 }}>
          <div style={{ display: 'grid', gap: 10 }}>
            <div style={{ fontWeight: 900 }}>Brief (latest)</div>
            <div style={{ display: 'grid', gap: 8 }}>
              {briefItems.slice(0, 12).map((b: string, i: number) => (
                <div key={i} style={pill}>
                  {b}
                </div>
              ))}
              {briefItems.length === 0 ? <div style={{ color: '#64748b', fontSize: 12 }}>Sem brief disponível</div> : null}
            </div>
          </div>
          <div style={{ display: 'grid', gap: 10 }}>
            <div style={{ fontWeight: 900 }}>Chat</div>
            <div style={{ border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, background: 'rgba(0,0,0,0.12)', padding: 12, minHeight: 280, maxHeight: 360, overflow: 'auto' }}>
              {chat.map((m, i) => (
                <div key={i} style={{ marginBottom: 10 }}>
                  <div style={{ color: m.role === 'user' ? '#a5b4fc' : '#34d399', fontWeight: 800, fontSize: 12 }}>
                    {m.role === 'user' ? 'Você' : 'Júlio'}
                  </div>
                  <div style={{ whiteSpace: 'pre-wrap' }}>{m.text || (m.role === 'julio' && streaming ? '…' : '')}</div>
                </div>
              ))}
              {chat.length === 0 ? <div style={{ color: '#64748b' }}>Pergunte algo ao Júlio.</div> : null}
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <input value={msg} onChange={e => setMsg(e.target.value)} placeholder="Mensagem…" style={inputStyle} />
              <button className="btn" onClick={onSend} disabled={!msg.trim() || streaming}>
                {streaming ? 'Enviando…' : 'Enviar'}
              </button>
            </div>
          </div>
        </div>
      </Section>

      <Section title="MEDDPICC Dashboard (raw)">
        <pre style={{ margin: 0, whiteSpace: 'pre-wrap', color: '#cbd5e1', fontSize: 12 }}>
          {JSON.stringify(meddpicc, null, 2)}
        </pre>
      </Section>
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  height: 40,
  flex: 1,
  borderRadius: 12,
  border: '1px solid rgba(255,255,255,0.12)',
  background: 'rgba(255,255,255,0.04)',
  color: '#e5e7eb',
  padding: '0 12px',
  outline: 'none',
}

const pill: React.CSSProperties = {
  border: '1px solid rgba(255,255,255,0.08)',
  background: 'rgba(255,255,255,0.03)',
  borderRadius: 14,
  padding: '10px 12px',
  color: '#e5e7eb',
  fontSize: 13,
}
