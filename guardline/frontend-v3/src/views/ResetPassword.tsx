import { useMemo, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { useToast } from '../context/ToastContext'
import { Shield, Loader2 } from 'lucide-react'

export default function ResetPassword() {
  const navigate = useNavigate()
  const { toast, dismiss } = useToast()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const token = useMemo(() => {
    const url = new URL(window.location.href)
    return url.searchParams.get('token') || ''
  }, [])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    if (!token) {
      setError('Token inválido ou ausente')
      return
    }
    if (password.length < 8) {
      setError('Senha precisa ter no mínimo 8 caracteres')
      return
    }
    if (password !== confirm) {
      setError('As senhas não coincidem')
      return
    }

    const tid = toast('Redefinindo senha...', 'loading')
    setLoading(true)
    try {
      const res = await api.post<any>('/auth/reset-password', { token, password })
      dismiss(tid)
      toast(res?.data?.message || 'Senha redefinida com sucesso!', 'success')
      navigate('/login')
    } catch (err: unknown) {
      dismiss(tid)
      const m = err instanceof Error ? err.message : 'Erro ao redefinir senha'
      setError(m)
      toast(m, 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center p-4">
      <div className="w-full max-w-sm animate-slide-up">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-accent-purple/10 border border-accent-purple/20 mb-4">
            <Shield className="w-7 h-7 text-accent-purple-light" />
          </div>
          <h1 className="text-2xl font-bold text-text-primary">Guardline</h1>
          <p className="text-text-secondary text-sm mt-1">Reset de senha</p>
        </div>

        <div className="card p-6">
          <h2 className="text-lg font-semibold text-text-primary mb-5">Definir nova senha</h2>

          {error && (
            <div className="bg-accent-red/10 border border-accent-red/20 rounded-xl px-3 py-2 text-accent-red text-sm mb-4">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1.5">Nova senha</label>
              <input
                type="password"
                className="input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                autoComplete="new-password"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1.5">Confirmar senha</label>
              <input
                type="password"
                className="input"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="••••••••"
                required
                autoComplete="new-password"
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
                  Salvando...
                </>
              ) : (
                'Salvar nova senha'
              )}
            </button>
          </form>

          <div className="mt-4">
            <button
              className="text-xs text-text-muted hover:text-text-primary transition-colors"
              onClick={() => navigate('/login')}
              type="button"
            >
              Voltar para login
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

