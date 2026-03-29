import { useState } from 'react'
import { api } from '../lib/api'
import Topbar from '../components/Topbar'
import { Loader2, Sparkles, Copy, Send } from 'lucide-react'

export default function Composer() {
  const [context, setContext] = useState('')
  const [result, setResult] = useState('')
  const [loading, setLoading] = useState(false)

  async function generate() {
    if (!context.trim()) return
    setLoading(true)
    try {
      const res = await api.post<{ data?: { email?: string; body?: string } }>('/julio/chat', {
        message: `Gera um email de vendas profissional baseado no seguinte contexto: ${context}. Inclua assunto e corpo.`,
      })
      setResult(res.data?.email ?? res.data?.body ?? 'Email gerado com sucesso.')
    } catch { setResult('Erro ao gerar email. Verifique o backend.') }
    finally { setLoading(false) }
  }

  return (
    <div className="flex flex-col min-h-full">
      <Topbar title="Composer" subtitle="Geração de email com contexto total" />
      <div className="p-5 grid grid-cols-2 gap-4 animate-fade-in">
        <div className="card space-y-3">
          <div className="text-xs font-semibold text-text-primary">Contexto</div>
          <textarea
            className="input resize-none text-xs"
            rows={10}
            placeholder="Ex: Follow-up para Banco Daycoval após demo. Deal em stage NDA/POC, $252K. Nova circular BACEN publicada esta semana."
            value={context}
            onChange={(e) => setContext(e.target.value)}
          />
          <button onClick={generate} disabled={loading || !context.trim()} className="btn-primary flex items-center gap-2 w-full justify-center">
            {loading ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
            Gerar Email com IA
          </button>
        </div>
        <div className="card space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-xs font-semibold text-text-primary">Email Gerado</div>
            {result && (
              <button onClick={() => navigator.clipboard.writeText(result)} className="btn-ghost text-xs flex items-center gap-1 py-1">
                <Copy size={11} /> Copiar
              </button>
            )}
          </div>
          {result ? (
            <pre className="text-xs text-text-secondary whitespace-pre-wrap leading-relaxed">{result}</pre>
          ) : (
            <div className="flex items-center justify-center h-40 text-text-muted text-sm">
              O email gerado aparecerá aqui
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
