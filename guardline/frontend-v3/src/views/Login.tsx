import { useMemo, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { api } from '../lib/api'
import { useToast } from '../context/ToastContext'
import { Shield, Loader2 } from 'lucide-react'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const { toast, dismiss } = useToast()
  const [email, setEmail] = useState('demo@guardline.com')
  const [password, setPassword] = useState('guardline123')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [mode, setMode] = useState<'login' | 'forgot'>('login')
  const [forgotEmail, setForgotEmail] = useState('demo@guardline.com')
  const [forgotMessage, setForgotMessage] = useState('')

  const apiBaseHint = useMemo(() => {
    const w = typeof window !== 'undefined' ? (window as any) : {}
    const base = (import.meta as any)?.env?.VITE_API_BASE || w.__GUARDLINE_API_BASE__ || ''
    return String(base || '')
  }, [])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(email, password)
      navigate('/')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Credenciais inválidas')
    } finally {
      setLoading(false)
    }
  }

  async function handleForgot(e: FormEvent) {
    e.preventDefault()
    setForgotMessage('')
    const tid = toast('Enviando link de redefinição...', 'loading')
    try {
      const res = await api.post<any>('/auth/forgot-password', { email: forgotEmail })
      const msg = res?.data?.message || res?.message || 'Se o e-mail existir, um link de redefinição foi enviado.'
      setForgotMessage(msg)
      dismiss(tid)
      toast('Se o e-mail existir, o link foi enviado.', 'success')

      const devUrl = res?.data?.devResetUrl
      if (devUrl) {
        setForgotMessage(`${msg} (DEV) ${devUrl}`)
      }
    } catch (err: unknown) {
      dismiss(tid)
      const m = err instanceof Error ? err.message : 'Erro ao solicitar redefinição'
      setForgotMessage(m)
      toast(m, 'error')
    }
  }

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center p-4">
      {/* Background glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 60% 40% at 50% 0%, rgba(124,58,237,0.08) 0%, transparent 70%)',
        }}
      />

      <div className="w-full max-w-sm animate-slide-up">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-accent-purple/10 border border-accent-purple/20 mb-4">
            <Shield className="w-7 h-7 text-accent-purple-light" />
          </div>
          <h1 className="text-2xl font-bold text-text-primary">Guardline</h1>
          <p className="text-text-secondary text-sm mt-1">Revenue Operating System</p>
        </div>

        {/* Card */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-text-primary mb-5">
            {mode === 'login' ? 'Entrar' : 'Redefinir senha'}
          </h2>

          {error && (
            <div className="bg-accent-red/10 border border-accent-red/20 rounded-xl px-3 py-2 text-accent-red text-sm mb-4">
              {error}
            </div>
          )}

          {mode === 'login' ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1.5">
                  Email
                </label>
                <input
                  type="email"
                  className="input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  required
                  autoComplete="email"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1.5">
                  Senha
                </label>
                <input
                  type="password"
                  className="input"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full flex items-center justify-center gap-2 py-2.5 mt-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Entrando...
                  </>
                ) : (
                  'Entrar'
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={handleForgot} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1.5">
                  Email
                </label>
                <input
                  type="email"
                  className="input"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  placeholder="seu@email.com"
                  required
                  autoComplete="email"
                />
              </div>

              {forgotMessage && (
                <div className="bg-accent-cyan/10 border border-accent-cyan/20 rounded-xl px-3 py-2 text-accent-cyan text-xs">
                  {forgotMessage}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full flex items-center justify-center gap-2 py-2.5 mt-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  'Enviar link'
                )}
              </button>
            </form>
          )}

          <div className="flex items-center justify-between mt-4 text-xs">
            <button
              className="text-text-muted hover:text-text-primary transition-colors"
              onClick={() => {
                setError('')
                setForgotMessage('')
                if (mode === 'login') {
                  setForgotEmail(email)
                  setMode('forgot')
                } else {
                  setMode('login')
                }
              }}
              type="button"
            >
              {mode === 'login' ? 'Esqueci minha senha' : 'Voltar para login'}
            </button>
          </div>

          {!apiBaseHint && (
            <div className="mt-4 text-[10px] text-accent-amber">
              Aviso: VITE_API_BASE não configurado. Em produção, defina VITE_API_BASE para a URL do backend (/api).
            </div>
          )}
        </div>

        <p className="text-center text-text-muted text-xs mt-4">
          Demo: demo@guardline.com / guardline123
        </p>
      </div>
    </div>
  )
}
