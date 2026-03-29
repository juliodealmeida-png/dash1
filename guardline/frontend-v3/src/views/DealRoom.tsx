import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api, fmtCurrency, daysSince } from '../lib/api'
import Topbar from '../components/Topbar'
import { Loader2, ArrowLeft, Target, Clock, Activity, FileText, Mail, Calendar, StickyNote } from 'lucide-react'

interface Deal {
  id: string; title: string; companyName: string; value: number; stage: string
  riskScore: number; probability: number; updatedAt: string; stageChangedAt: string
  description?: string; owner?: { name: string }
  meddpicc?: Record<string, string>
}

const TABS = [
  { key: 'overview',    label: 'Overview',   icon: <Activity size={13} /> },
  { key: 'meddpicc',   label: 'MEDDPICC',   icon: <Target size={13} /> },
  { key: 'outreach',   label: 'Outreach',   icon: <Mail size={13} /> },
  { key: 'intel',      label: 'Intelligence', icon: <FileText size={13} /> },
  { key: 'meetings',   label: 'Meetings',   icon: <Calendar size={13} /> },
  { key: 'notes',      label: 'Notes',      icon: <StickyNote size={13} /> },
]

const MEDDPICC_FIELDS = [
  { key: 'metrics',         label: 'Metrics',          desc: 'Métricas quantificáveis do valor para o cliente' },
  { key: 'economicBuyer',   label: 'Economic Buyer',   desc: 'Quem assina o cheque' },
  { key: 'decisionCriteria',label: 'Decision Criteria', desc: 'O que importa na decisão' },
  { key: 'decisionProcess', label: 'Decision Process',  desc: 'Passos até fechar' },
  { key: 'paperProcess',    label: 'Paper Process',     desc: 'Processo de contrato/legal' },
  { key: 'identifiedPain',  label: 'Identified Pain',   desc: 'Dor principal' },
  { key: 'champion',        label: 'Champion',          desc: 'Quem defende internamente' },
  { key: 'competition',     label: 'Competition',       desc: 'Concorrentes na mesa' },
]

export default function DealRoom() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [deals, setDeals] = useState<Deal[]>([])
  const [deal, setDeal] = useState<Deal | null>(null)
  const [tab, setTab] = useState('overview')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const res = await api.get<{ data: Deal[] }>('/deals?perPage=200')
        const list = res.data ?? []
        setDeals(list)
        if (id) setDeal(list.find((d) => d.id === id) ?? null)
        else if (list.length) setDeal(list[0])
      } catch (e) { console.error(e) }
      finally { setLoading(false) }
    }
    load()
  }, [id])

  if (loading) return (
    <div className="flex items-center justify-center h-full py-20">
      <Loader2 className="w-6 h-6 animate-spin text-accent-purple" />
    </div>
  )

  if (!id && !deal) return (
    <div className="flex flex-col min-h-full">
      <Topbar title="Deal Room" />
      <div className="flex flex-col md:flex-row gap-4 p-5">
        <div className="w-64 shrink-0 card p-3">
          <div className="text-xs font-semibold text-text-muted mb-2">Selecionar Deal</div>
          <div className="space-y-1">
            {deals.filter(d => d.stage !== 'lost').map(d => (
              <button key={d.id} onClick={() => setDeal(d)}
                className="w-full text-left px-3 py-2 rounded-xl hover:bg-elevated transition-colors">
                <div className="text-xs font-medium text-text-primary truncate">{d.companyName}</div>
                <div className="text-[10px] text-text-muted">{fmtCurrency(d.value)} · {d.stage}</div>
              </button>
            ))}
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center text-text-muted text-sm">
          Selecione um deal para abrir o Deal Room
        </div>
      </div>
    </div>
  )

  if (!deal) return <div className="p-5 text-text-muted">Deal não encontrado</div>

  const meddpiccFilled = MEDDPICC_FIELDS.filter(f => deal.meddpicc?.[f.key]).length
  const meddpiccPct = Math.round((meddpiccFilled / MEDDPICC_FIELDS.length) * 100)

  return (
    <div className="flex flex-col min-h-full">
      <Topbar
        title={deal.companyName}
        subtitle={`${deal.stage} · ${fmtCurrency(deal.value)} · ${daysSince(deal.updatedAt)}d sem atividade`}
      />

      <div className="p-5 space-y-4 animate-fade-in">
        {/* Header card */}
        <div className="card flex items-center gap-4">
          {id && (
            <button onClick={() => navigate(-1)} className="btn-ghost p-2 mr-1">
              <ArrowLeft size={15} />
            </button>
          )}
          <div className="flex-1">
            <div className="text-lg font-bold text-text-primary">{deal.companyName}</div>
            {deal.title && deal.title !== deal.companyName && (
              <div className="text-sm text-text-muted">{deal.title}</div>
            )}
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-xs text-text-muted">Valor</div>
              <div className="text-xl font-bold text-text-primary">{fmtCurrency(deal.value)}</div>
            </div>
            <div className="text-right">
              <div className="text-xs text-text-muted">Win Prob</div>
              <div className={`text-xl font-bold ${deal.probability >= 60 ? 'text-accent-green' : deal.probability >= 30 ? 'text-accent-amber' : 'text-accent-red'}`}>
                {deal.probability}%
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs text-text-muted">MEDDPICC</div>
              <div className="text-xl font-bold text-accent-cyan">{meddpiccPct}%</div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-surface rounded-xl p-1 border border-border-subtle w-fit">
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                tab === t.key ? 'bg-elevated text-text-primary border border-border' : 'text-text-muted hover:text-text-secondary'
              }`}>
              {t.icon}{t.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {tab === 'overview' && (
          <div className="card">
            <div className="text-sm font-semibold text-text-primary mb-3">Overview do Deal</div>
            <div className="grid grid-cols-3 gap-4">
              <div><div className="text-xs text-text-muted">Stage</div><div className="text-sm font-medium text-text-primary mt-0.5">{deal.stage}</div></div>
              <div><div className="text-xs text-text-muted">Risk Score</div><div className={`text-sm font-medium mt-0.5 ${deal.riskScore >= 75 ? 'text-accent-red' : deal.riskScore >= 50 ? 'text-accent-amber' : 'text-accent-green'}`}>{deal.riskScore}</div></div>
              <div><div className="text-xs text-text-muted">Owner</div><div className="text-sm font-medium text-text-primary mt-0.5">{deal.owner?.name ?? '—'}</div></div>
              <div><div className="text-xs text-text-muted">Dias sem atividade</div><div className="text-sm font-medium text-text-primary mt-0.5">{daysSince(deal.updatedAt)}d</div></div>
              <div><div className="text-xs text-text-muted">Dias no estágio</div><div className="text-sm font-medium text-text-primary mt-0.5">{daysSince(deal.stageChangedAt ?? deal.updatedAt)}d</div></div>
            </div>
            {deal.description && (
              <div className="mt-4 pt-4 border-t border-border-subtle">
                <div className="text-xs text-text-muted mb-1">Descrição</div>
                <p className="text-sm text-text-secondary">{deal.description}</p>
              </div>
            )}
          </div>
        )}

        {tab === 'meddpicc' && (
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <div className="text-sm font-semibold text-text-primary">MEDDPICC</div>
              <div className="flex items-center gap-2">
                <div className="meddpicc-bar w-24"><div className="meddpicc-fill" style={{ width: `${meddpiccPct}%`, background: meddpiccPct >= 70 ? '#10b981' : meddpiccPct >= 30 ? '#f59e0b' : '#ef4444' }} /></div>
                <span className="text-xs text-text-muted">{meddpiccPct}%</span>
                <button className="btn-primary text-xs px-3 py-1.5">🤖 Gerar com IA</button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {MEDDPICC_FIELDS.map(f => (
                <div key={f.key} className={`p-3 rounded-xl border ${deal.meddpicc?.[f.key] ? 'border-accent-green/20 bg-accent-green/5' : 'border-border-subtle bg-surface'}`}>
                  <div className="flex items-center gap-1.5 mb-1">
                    <div className={`w-2 h-2 rounded-full ${deal.meddpicc?.[f.key] ? 'bg-accent-green' : 'bg-border-strong'}`} />
                    <span className="text-xs font-semibold text-text-primary">{f.label}</span>
                  </div>
                  <p className="text-xs text-text-muted">{deal.meddpicc?.[f.key] ?? f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {['outreach', 'intel', 'meetings', 'notes'].includes(tab) && (
          <div className="card flex items-center justify-center py-16">
            <div className="text-center">
              <div className="text-2xl mb-2">🚧</div>
              <div className="text-sm font-medium text-text-primary">Em desenvolvimento</div>
              <div className="text-xs text-text-muted mt-1">Sprint 2 — Deal Room completo</div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
