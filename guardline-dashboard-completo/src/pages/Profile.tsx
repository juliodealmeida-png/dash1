import { useEffect, useState } from 'react'
import Section from '../components/Section'
import { api } from '../lib/api'
import { useAuth } from '../contexts/AuthContext'

export default function Profile() {
  const { getAccessToken } = useAuth()
  const [profile, setProfile] = useState<any>(null)
  const [name, setName] = useState('')
  const [company, setCompany] = useState('')
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)
  const [ok, setOk] = useState<string | null>(null)

  const refresh = async () => {
    setLoading(true)
    setErr(null)
    setOk(null)
    try {
      const token = await getAccessToken()
      if (!token) throw new Error('Sem token')
      const p = await api.profile.get(token)
      setProfile(p)
      setName(p?.name || '')
      setCompany(p?.company || '')
    } catch (e: any) {
      setErr(e?.message || 'Erro ao carregar profile')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refresh()
  }, [])

  const save = async () => {
    setErr(null)
    setOk(null)
    try {
      const token = await getAccessToken()
      if (!token) return
      const out = await api.profile.upsert(token, { name, company })
      setOk(out?.pending ? out?.message || 'Enviado para aprovação' : 'Salvo')
      await refresh()
    } catch (e: any) {
      setErr(e?.message || 'Falha ao salvar')
    }
  }

  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <Section title="Profile" right={<button className="btn" onClick={refresh}>Refresh</button>}>
        {loading ? <div style={{ color: '#94a3b8' }}>Carregando…</div> : null}
        {err ? <div style={{ color: '#fca5a5', marginBottom: 10 }}>{err}</div> : null}
        {ok ? <div style={{ color: '#34d399', marginBottom: 10 }}>{ok}</div> : null}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <label style={labelStyle}>
            Name
            <input value={name} onChange={e => setName(e.target.value)} style={inputStyle} />
          </label>
          <label style={labelStyle}>
            Company
            <input value={company} onChange={e => setCompany(e.target.value)} style={inputStyle} />
          </label>
        </div>
        <div style={{ marginTop: 10 }}>
          <button className="btn" onClick={save}>
            Save
          </button>
        </div>
      </Section>

      <Section title="Raw profile">
        <pre style={{ margin: 0, whiteSpace: 'pre-wrap', color: '#cbd5e1', fontSize: 12 }}>{JSON.stringify(profile, null, 2)}</pre>
      </Section>
    </div>
  )
}

const labelStyle: React.CSSProperties = { display: 'grid', gap: 6, fontSize: 12, color: '#94a3b8' }

const inputStyle: React.CSSProperties = {
  height: 40,
  borderRadius: 12,
  border: '1px solid rgba(255,255,255,0.12)',
  background: 'rgba(255,255,255,0.04)',
  color: '#e5e7eb',
  padding: '0 12px',
  outline: 'none',
  width: '100%',
}
