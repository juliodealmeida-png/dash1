import { useMemo, useState } from 'react'
import Topbar from '../components/Topbar'
import { api } from '../lib/api'

type CountryKey = 'BR' | 'MX' | 'AR' | 'CO' | 'CL' | 'PE'

const COUNTRIES: Record<CountryKey, { name: string; notes: string }> = {
  BR: { name: 'Brasil', notes: 'LGPD · alta demanda Fintechs/Bancos · ciclo 45–90 dias' },
  MX: { name: 'México', notes: 'Protección de Datos · ciclo 60–120 dias · CTO + Legal' },
  AR: { name: 'Argentina', notes: 'mercado volátil · foco auditoría/resiliência · ciclo 30–60 dias' },
  CO: { name: 'Colombia', notes: 'SFC exige controles · ciclo 45–75 dias' },
  CL: { name: 'Chile', notes: 'CMF · exigência técnica alta · ciclo 60–90 dias' },
  PE: { name: 'Perú', notes: 'SBS · auditoria · ciclo 45–60 dias' },
}

const COMPETITORS = [
  'Palo Alto Networks',
  'CrowdStrike',
  'Darktrace',
  'Cylance / BlackBerry',
  'Microsoft Defender',
  'SentinelOne',
]

function extractText(resp: unknown): string {
  const d = resp as { data?: unknown }
  const payload = (d && (d as any).data) || resp
  const p = payload as any
  return String(p?.fullText || p?.text || p?.message || p?.markdown || '')
}

export default function Battlecard() {
  const [country, setCountry] = useState<CountryKey>('BR')
  const [competitor, setCompetitor] = useState(COMPETITORS[0])
  const [loading, setLoading] = useState(false)
  const [out, setOut] = useState<string>('')

  const context = useMemo(() => COUNTRIES[country], [country])

  async function ask() {
    setLoading(true)
    setOut('')
    try {
      const msg =
        `Faça uma análise competitiva em tempo real para LATAM.\n` +
        `País: ${context.name}\n` +
        `Concorrente: ${competitor}\n\n` +
        `Entregue:\n` +
        `1) 5 argumentos de venda (Guardline vs ${competitor}) específicos para ${context.name}\n` +
        `2) 5 fraquezas do concorrente (práticas)\n` +
        `3) 3 objeções comuns e respostas\n` +
        `4) Um mini pitch de 30 segundos\n`
      const res = await api.post('/julio/chat/sync', { message: msg, conversationId: null })
      setOut(extractText(res) || JSON.stringify((res as any)?.data ?? res, null, 2))
    } catch (e: any) {
      setOut(String(e?.message || e))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col min-h-full">
      <Topbar title="Competitors Battlecard" subtitle="Tempo real por país (Julio AI)" />
      <div className="p-5 space-y-4 animate-fade-in max-w-4xl">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="card">
            <div className="text-xs text-text-muted">País</div>
            <select className="input mt-2 text-xs" value={country} onChange={(e) => setCountry(e.target.value as CountryKey)}>
              {Object.keys(COUNTRIES).map((k) => (
                <option key={k} value={k}>
                  {k} — {(COUNTRIES as any)[k].name}
                </option>
              ))}
            </select>
            <div className="text-[10px] text-text-muted mt-2">{context.notes}</div>
          </div>
          <div className="card">
            <div className="text-xs text-text-muted">Concorrente</div>
            <select className="input mt-2 text-xs" value={competitor} onChange={(e) => setCompetitor(e.target.value)}>
              {COMPETITORS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <div className="text-[10px] text-text-muted mt-2">Gera análise via /api/julio/chat/sync</div>
          </div>
          <div className="card flex items-center justify-between gap-3">
            <div>
              <div className="text-xs font-semibold text-text-primary">Gerar agora</div>
              <div className="text-[10px] text-text-muted mt-1">Resposta em formato pronto para vendas</div>
            </div>
            <button className="btn-primary text-xs px-4 py-2" disabled={loading} onClick={ask}>
              {loading ? 'Analisando...' : 'Perguntar'}
            </button>
          </div>
        </div>

        <div className="card">
          <div className="text-sm font-semibold text-text-primary mb-2">Saída</div>
          {!out && !loading ? (
            <div className="text-xs text-text-muted">Selecione país e concorrente e clique em Perguntar.</div>
          ) : (
            <pre className="text-xs text-text-secondary whitespace-pre-wrap leading-relaxed">{out}</pre>
          )}
        </div>
      </div>
    </div>
  )
}

