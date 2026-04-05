import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation() as any
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      await login(email, password)
      navigate(location?.state?.from || '/', { replace: true })
    } catch (e: any) {
      setError(e?.message || 'Falha no login')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24, background: '#0b1020', color: '#e5e7eb' }}>
      <form onSubmit={onSubmit} style={{ width: 420, maxWidth: '100%', border: '1px solid rgba(255,255,255,0.10)', borderRadius: 16, padding: 18, background: 'rgba(255,255,255,0.03)' }}>
        <div style={{ fontWeight: 900, fontSize: 18 }}>Guardline Dashboard</div>
        <div style={{ color: '#94a3b8', marginTop: 6, fontSize: 13 }}>Login no backend (localhost:3001)</div>

        <div style={{ marginTop: 16, display: 'grid', gap: 12 }}>
          <label style={{ display: 'grid', gap: 6, fontSize: 12, color: '#94a3b8' }}>
            Email
            <input value={email} onChange={e => setEmail(e.target.value)} style={inputStyle} />
          </label>
          <label style={{ display: 'grid', gap: 6, fontSize: 12, color: '#94a3b8' }}>
            Password
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} style={inputStyle} />
          </label>
          {error ? <div style={{ color: '#fca5a5', fontSize: 12 }}>{error}</div> : null}
          <button disabled={loading} style={btnStyle}>
            {loading ? 'Entrando…' : 'Entrar'}
          </button>
        </div>
      </form>
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  height: 40,
  borderRadius: 12,
  border: '1px solid rgba(255,255,255,0.12)',
  background: 'rgba(255,255,255,0.04)',
  color: '#e5e7eb',
  padding: '0 12px',
  outline: 'none',
}

const btnStyle: React.CSSProperties = {
  height: 40,
  borderRadius: 12,
  border: '1px solid rgba(255,255,255,0.12)',
  background: 'linear-gradient(135deg, rgba(99,102,241,0.35), rgba(34,211,238,0.22))',
  color: '#fff',
  fontWeight: 800,
  cursor: 'pointer',
}
