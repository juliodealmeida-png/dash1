import { useState } from 'react'
import Section from '../components/Section'
import { api } from '../lib/api'
import { useAuth } from '../contexts/AuthContext'

export default function Tools() {
  const { getAccessToken } = useAuth()
  const [qWeather, setQWeather] = useState('San Francisco')
  const [qNews, setQNews] = useState('sales')
  const [base, setBase] = useState('USD')
  const [docTitle, setDocTitle] = useState('Quarterly Update')
  const [docMarkdown, setDocMarkdown] = useState('# Update\n\n- Pipeline\n- Risks\n- Next steps\n')
  const [imgPrompt, setImgPrompt] = useState('Minimal dashboard background, dark, abstract gradient')
  const [out, setOut] = useState<any>(null)
  const [err, setErr] = useState<string | null>(null)

  const run = async (fn: (token: string) => Promise<any>) => {
    setErr(null)
    try {
      const token = await getAccessToken()
      if (!token) throw new Error('Sem token')
      const r = await fn(token)
      setOut(r)
    } catch (e: any) {
      setErr(e?.message || 'Erro')
    }
  }

  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <Section title="Tools (backend /api/tools)">
        {err ? <div style={{ color: '#fca5a5', marginBottom: 10 }}>{err}</div> : null}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 14 }}>
          <Section
            title="Weather"
            right={
              <button className="btn" onClick={() => run(t => api.tools.weather(t, qWeather))}>
                Run
              </button>
            }
          >
            <input value={qWeather} onChange={e => setQWeather(e.target.value)} style={inputStyle} />
          </Section>

          <Section
            title="Forex"
            right={
              <button className="btn" onClick={() => run(t => api.tools.forex(t, base))}>
                Run
              </button>
            }
          >
            <input value={base} onChange={e => setBase(e.target.value)} style={inputStyle} />
          </Section>

          <Section
            title="News"
            right={
              <button className="btn" onClick={() => run(t => api.tools.news(t, qNews))}>
                Run
              </button>
            }
          >
            <input value={qNews} onChange={e => setQNews(e.target.value)} style={inputStyle} />
          </Section>

          <Section
            title="Create Doc"
            right={
              <button className="btn" onClick={() => run(t => api.tools.createDoc(t, { title: docTitle, markdown: docMarkdown }))}>
                Generate
              </button>
            }
          >
            <input value={docTitle} onChange={e => setDocTitle(e.target.value)} style={inputStyle} />
            <textarea value={docMarkdown} onChange={e => setDocMarkdown(e.target.value)} style={taStyle} />
          </Section>

          <Section
            title="Create Image"
            right={
              <button className="btn" onClick={() => run(t => api.tools.createImage(t, { prompt: imgPrompt }))}>
                Generate
              </button>
            }
          >
            <textarea value={imgPrompt} onChange={e => setImgPrompt(e.target.value)} style={taStyle} />
          </Section>
        </div>
      </Section>

      <Section title="Output">
        <pre style={{ margin: 0, whiteSpace: 'pre-wrap', color: '#cbd5e1', fontSize: 12 }}>{JSON.stringify(out, null, 2)}</pre>
      </Section>
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  height: 40,
  width: '100%',
  borderRadius: 12,
  border: '1px solid rgba(255,255,255,0.12)',
  background: 'rgba(255,255,255,0.04)',
  color: '#e5e7eb',
  padding: '0 12px',
  outline: 'none',
  marginBottom: 10,
}

const taStyle: React.CSSProperties = {
  width: '100%',
  minHeight: 120,
  borderRadius: 12,
  border: '1px solid rgba(255,255,255,0.10)',
  background: 'rgba(255,255,255,0.03)',
  color: '#e5e7eb',
  padding: 12,
  outline: 'none',
}
