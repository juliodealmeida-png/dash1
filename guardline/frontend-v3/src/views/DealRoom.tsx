import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api, fmtCurrency, daysSince, fmtDate } from '../lib/api'
import Topbar from '../components/Topbar'
import { 
  Loader2, 
  ArrowLeft, 
  Target, 
  Clock, 
  Activity, 
  FileText, 
  Mail, 
  Calendar, 
  StickyNote,
  User,
  Building2,
  AlertTriangle,
  BrainCircuit,
  MessageSquare,
  Plus,
  Send,
  MoreVertical,
  ChevronRight,
  ShieldAlert,
  History
} from 'lucide-react'
import { useI18n } from '../context/I18nContext'
import { useToast } from '../context/ToastContext'

// ── Types ─────────────────────────────────────────────────
interface DealActivity {
  id: string
  type: string
  title: string
  note?: string
  date: string
}

interface DealEmail {
  id: string
  from: string
  to: string
  subject: string
  snippet?: string
  receivedAt: string
  direction: 'inbound' | 'outbound'
}

interface MeddpiccScore {
  totalScore: number
  metricsScore: number
  economicBuyerScore: number
  decisionCriteriaScore: number
  decisionProcessScore: number
  paperProcessScore: number
  identifyPainScore: number
  championScore: number
  competitionScore: number
  analysisJson?: string
  top3Gaps?: string
  recommendation?: string
  analyzedAt: string
}

interface Deal {
  id: string
  title: string
  companyName: string
  contactName?: string
  contactEmail?: string
  value: number
  stage: string
  riskScore: number
  probability: number
  updatedAt: string
  stageChangedAt: string
  description?: string
  notes?: string
  owner?: { name: string }
  activities: DealActivity[]
  emails: DealEmail[]
  meddpiccScore?: MeddpiccScore
}

const TABS = [
  { key: 'overview',    label: 'Overview',   icon: <Activity size={13} /> },
  { key: 'meddpicc',   label: 'MEDDPICC',   icon: <Target size={13} /> },
  { key: 'outreach',   label: 'Outreach',   icon: <Mail size={13} /> },
  { key: 'intel',      label: 'Intelligence', icon: <ShieldAlert size={13} /> },
  { key: 'meetings',   label: 'Meetings',   icon: <Calendar size={13} /> },
  { key: 'notes',      label: 'Activities', icon: <StickyNote size={13} /> },
]

const MEDDPICC_FIELDS = [
  { key: 'metricsScore',         label: 'Metrics',          desc: 'Métricas quantificáveis do valor para o cliente' },
  { key: 'economicBuyerScore',   label: 'Economic Buyer',   desc: 'Quem assina o cheque' },
  { key: 'decisionCriteriaScore',label: 'Decision Criteria', desc: 'O que importa na decisão' },
  { key: 'decisionProcessScore', label: 'Decision Process',  desc: 'Passos até fechar' },
  { key: 'paperProcessScore',    label: 'Paper Process',     desc: 'Processo de contrato/legal' },
  { key: 'identifyPainScore',    label: 'Identify Pain',     desc: 'Dor principal' },
  { key: 'championScore',        label: 'Champion',          desc: 'Quem defende internamente' },
  { key: 'competitionScore',     label: 'Competition',       desc: 'Concorrentes na mesa' },
]

export default function DealRoom() {
  const { id } = useParams()
  const { t } = useI18n()
  const { toast, dismiss } = useToast()
  const navigate = useNavigate()
  const [deal, setDeal] = useState<Deal | null>(null)
  const [tab, setTab] = useState('overview')
  const [loading, setLoading] = useState(true)
  const [generatingMeddpicc, setGeneratingMeddpicc] = useState(false)
  const [newNote, setNewNote] = useState('')

  const load = useCallback(async () => {
    if (!id) return
    setLoading(true)
    try {
      const res = await api.get<{ data: Deal }>(`/deals/${id}`)
      setDeal(res.data)
    } catch (e) {
      console.error(e)
      toast('Erro ao carregar deal', 'error')
    } finally {
      setLoading(false)
    }
  }, [id, toast])

  useEffect(() => { load() }, [load])

  async function handleGenerateMeddpicc() {
    if (!id || generatingMeddpicc) return
    const tid = toast('Analisando deal com Julio IA...', 'loading')
    setGeneratingMeddpicc(true)
    try {
      await api.post(`/julio/meddpicc/${id}`)
      dismiss(tid)
      toast('Análise MEDDPICC gerada com sucesso!', 'success')
      await load()
    } catch (e) {
      console.error(e)
      dismiss(tid)
      toast('Erro ao gerar análise MEDDPICC', 'error')
    } finally {
      setGeneratingMeddpicc(false)
    }
  }

  async function handleAddNote() {
    if (!id || !newNote.trim()) return
    const tid = toast('Registrando atividade...', 'loading')
    try {
      await api.post(`/deals/${id}/activities`, {
        title: 'Nota Manual',
        type: 'note',
        note: newNote
      })
      dismiss(tid)
      toast('Atividade registrada!', 'success')
      setNewNote('')
      await load()
    } catch (e) {
      console.error(e)
      dismiss(tid)
      toast('Erro ao registrar atividade', 'error')
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center h-full py-20">
      <Loader2 className="w-8 h-8 animate-spin text-accent-purple" />
    </div>
  )

  if (!deal) return (
    <div className="p-10 text-center">
      <AlertTriangle size={48} className="mx-auto text-accent-amber mb-4 opacity-20" />
      <p className="text-text-secondary font-medium">Deal não encontrado</p>
      <button onClick={() => navigate('/pipeline')} className="btn-primary mt-4">Voltar ao Pipeline</button>
    </div>
  )

  const meddpiccPct = deal.meddpiccScore?.totalScore ?? 0

  return (
    <div className="flex flex-col h-full bg-surface">
      <Topbar 
        title={deal.companyName} 
        subtitle={`${deal.stage} · ${fmtCurrency(deal.value)} · ${daysSince(deal.updatedAt)}d sem atividade`}
      />

      <div className="p-6 overflow-y-auto">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Header Card */}
          <div className="card p-6 flex items-center gap-6 shadow-xl border-0 bg-card/50">
            <button onClick={() => navigate(-1)} className="p-3 hover:bg-surface rounded-2xl text-text-muted hover:text-text-primary transition-all">
              <ArrowLeft size={20} />
            </button>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h1 className="text-2xl font-black text-text-primary">{deal.companyName}</h1>
                <span className={`badge ${deal.riskScore >= 75 ? 'badge-red' : deal.riskScore >= 50 ? 'badge-amber' : 'badge-green'}`}>
                  Risk: {deal.riskScore}/100
                </span>
              </div>
              <div className="flex items-center gap-4 text-sm text-text-muted">
                <div className="flex items-center gap-1.5"><User size={14} /> {deal.contactName || 'Sem contato'}</div>
                <div className="flex items-center gap-1.5"><Building2 size={14} /> {deal.stage}</div>
                <div className="flex items-center gap-1.5"><Clock size={14} /> Criado em {fmtDate(deal.updatedAt)}</div>
              </div>
            </div>
            <div className="flex items-center gap-6">
              <div className="text-center">
                <div className="text-[10px] text-text-muted uppercase font-bold tracking-widest mb-1">Valor do Deal</div>
                <div className="text-2xl font-black text-text-primary">{fmtCurrency(deal.value)}</div>
              </div>
              <div className="w-px h-10 bg-border/50" />
              <div className="text-center">
                <div className="text-[10px] text-text-muted uppercase font-bold tracking-widest mb-1">Probabilidade</div>
                <div className={`text-2xl font-black ${deal.probability >= 60 ? 'text-accent-green' : deal.probability >= 30 ? 'text-accent-amber' : 'text-accent-red'}`}>
                  {deal.probability}%
                </div>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 bg-card rounded-2xl p-1 border border-border w-fit shadow-lg">
            {TABS.map(t => (
              <button key={t.key} onClick={() => setTab(t.key)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  tab === t.key ? 'bg-accent-purple text-white shadow-lg shadow-accent-purple/20' : 'text-text-muted hover:text-text-primary hover:bg-surface'
                }`}>
                {t.icon}{t.label}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="animate-fade-in">
            {tab === 'overview' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column: Details */}
                <div className="lg:col-span-2 space-y-6">
                  <div className="card p-6">
                    <h3 className="text-sm font-bold text-text-primary mb-6 flex items-center gap-2">
                      <Activity size={16} className="text-accent-purple-light" />
                      Análise de Saúde do Deal
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                      <div className="p-4 rounded-2xl bg-surface border border-border">
                        <div className="text-[10px] text-text-muted uppercase font-bold mb-1">Estágio Atual</div>
                        <div className="text-sm font-bold text-text-primary capitalize">{deal.stage}</div>
                        <div className="text-[10px] text-accent-cyan mt-1">{daysSince(deal.stageChangedAt)} dias nesta fase</div>
                      </div>
                      <div className="p-4 rounded-2xl bg-surface border border-border">
                        <div className="text-[10px] text-text-muted uppercase font-bold mb-1">Último Contato</div>
                        <div className="text-sm font-bold text-text-primary">
                          {deal.emails.length > 0 ? daysSince(deal.emails[0].receivedAt) : daysSince(deal.updatedAt)} dias
                        </div>
                        <div className="text-[10px] text-text-muted mt-1">Interação via {deal.emails.length > 0 ? 'Email' : 'Manual'}</div>
                      </div>
                      <div className="p-4 rounded-2xl bg-surface border border-border">
                        <div className="text-[10px] text-text-muted uppercase font-bold mb-1">Total Atividades</div>
                        <div className="text-sm font-bold text-text-primary">{deal.activities.length}</div>
                        <div className="text-[10px] text-text-muted mt-1">Logs registrados</div>
                      </div>
                      <div className="p-4 rounded-2xl bg-surface border border-border">
                        <div className="text-[10px] text-text-muted uppercase font-bold mb-1">Risk Level</div>
                        <div className={`text-sm font-bold ${deal.riskScore >= 75 ? 'text-accent-red' : deal.riskScore >= 50 ? 'text-accent-amber' : 'text-accent-green'}`}>
                          {deal.riskScore >= 75 ? 'Crítico' : deal.riskScore >= 50 ? 'Atenção' : 'Saudável'}
                        </div>
                        <div className="text-[10px] text-text-muted mt-1">Score: {deal.riskScore}/100</div>
                      </div>
                    </div>
                    {deal.description && (
                      <div className="mt-8 pt-6 border-t border-border/50">
                        <h4 className="text-xs font-bold text-text-muted uppercase tracking-widest mb-3">Contexto do Projeto</h4>
                        <p className="text-sm text-text-secondary leading-relaxed">{deal.description}</p>
                      </div>
                    )}
                  </div>

                  {/* AI Insights Card */}
                  <div className="card p-6 border-accent-purple/30 bg-gradient-to-br from-accent-purple/5 to-transparent">
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-2">
                        <BrainCircuit size={18} className="text-accent-purple-light" />
                        <h3 className="font-bold text-text-primary">Julio IA: Resumo Estratégico</h3>
                      </div>
                      <span className="badge badge-purple">IA Ativa</span>
                    </div>
                    <div className="space-y-4">
                      <div className="p-4 rounded-2xl bg-card border border-border/50">
                        <p className="text-sm text-text-secondary italic leading-relaxed">
                          "O deal com a **{deal.companyName}** está em um estágio avançado, mas o Paper Process ainda não foi iniciado. Recomendo solicitar o contato do jurídico imediatamente para evitar atrasos no fechamento previsto."
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button className="btn-secondary text-[10px] py-1.5 px-3">Gerar Proposta PDF</button>
                        <button className="btn-secondary text-[10px] py-1.5 px-3">Simular Negociação</button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Column: Mini Info */}
                <div className="space-y-6">
                  <div className="card p-5">
                    <h3 className="text-sm font-bold text-text-primary mb-4">Contato Principal</h3>
                    <div className="flex items-center gap-4 mb-6">
                      <div className="w-12 h-12 rounded-full bg-accent-purple/10 flex items-center justify-center text-accent-purple font-bold text-lg">
                        {deal.contactName?.substring(0, 1) || '?'}
                      </div>
                      <div>
                        <div className="font-bold text-text-primary">{deal.contactName || 'Não registrado'}</div>
                        <div className="text-xs text-text-muted">{deal.contactEmail || 'Sem e-mail'}</div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <button className="w-full btn-secondary text-xs py-2 flex items-center justify-center gap-2">
                        <Mail size={14} /> Enviar E-mail
                      </button>
                      <button className="w-full btn-secondary text-xs py-2 flex items-center justify-center gap-2">
                        <MessageSquare size={14} /> Abrir WhatsApp
                      </button>
                    </div>
                  </div>

                  <div className="card p-5">
                    <h3 className="text-sm font-bold text-text-primary mb-4">Pipeline Metrics</h3>
                    <div className="space-y-4">
                      <div>
                        <div className="flex justify-between text-[10px] text-text-muted uppercase font-bold mb-1">
                          <span>Probabilidade</span>
                          <span>{deal.probability}%</span>
                        </div>
                        <div className="h-1.5 bg-surface rounded-full overflow-hidden border border-border">
                          <div className={`h-full transition-all ${deal.probability >= 60 ? 'bg-accent-green' : deal.probability >= 30 ? 'bg-accent-amber' : 'bg-accent-red'}`} style={{ width: `${deal.probability}%` }} />
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between text-[10px] text-text-muted uppercase font-bold mb-1">
                          <span>MEDDPICC Fill</span>
                          <span>{meddpiccPct}%</span>
                        </div>
                        <div className="h-1.5 bg-surface rounded-full overflow-hidden border border-border">
                          <div className="h-full bg-accent-cyan transition-all" style={{ width: `${meddpiccPct}%` }} />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {tab === 'meddpicc' && (
              <div className="space-y-6">
                <div className="card p-6 flex items-center justify-between shadow-xl">
                  <div>
                    <h3 className="text-lg font-bold text-text-primary">Framework MEDDPICC</h3>
                    <p className="text-xs text-text-muted">Metodologia de qualificação para deals Enterprise</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="text-[10px] text-text-muted uppercase font-bold">Health Score</div>
                      <div className="text-2xl font-black text-accent-cyan">{meddpiccPct}%</div>
                    </div>
                    <button 
                      onClick={handleGenerateMeddpicc}
                      disabled={generatingMeddpicc}
                      className="btn-primary flex items-center gap-2 px-6 py-2.5"
                    >
                      {generatingMeddpicc ? <Loader2 size={18} className="animate-spin" /> : <BrainCircuit size={18} />}
                      <span>{generatingMeddpicc ? 'Analisando...' : 'Gerar com Julio IA'}</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {MEDDPICC_FIELDS.map(f => {
                    const score = (deal.meddpiccScore as any)?.[f.key] || 0
                    return (
                      <div key={f.key} className={`card p-5 border-2 transition-all ${score >= 70 ? 'border-accent-green/20 bg-accent-green/5' : score >= 30 ? 'border-accent-amber/20 bg-accent-amber/5' : 'border-border bg-card'}`}>
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-xs font-bold text-text-primary uppercase tracking-wider">{f.label}</span>
                          <span className={`text-sm font-black ${score >= 70 ? 'text-accent-green' : score >= 30 ? 'text-accent-amber' : 'text-accent-red'}`}>
                            {score}%
                          </span>
                        </div>
                        <div className="h-1 bg-surface rounded-full overflow-hidden mb-4">
                          <div className={`h-full ${score >= 70 ? 'bg-accent-green' : score >= 30 ? 'bg-accent-amber' : 'bg-accent-red'}`} style={{ width: `${score}%` }} />
                        </div>
                        <p className="text-[10px] text-text-secondary leading-relaxed italic">
                          {score > 0 ? 'Informação validada via IA.' : f.desc}
                        </p>
                      </div>
                    )
                  })}
                </div>

                {deal.meddpiccScore?.recommendation && (
                  <div className="card p-6 border-accent-cyan/30 bg-accent-cyan/5">
                    <h4 className="text-sm font-bold text-text-primary mb-2">Recomendação Estratégica</h4>
                    <p className="text-sm text-text-secondary leading-relaxed">{deal.meddpiccScore.recommendation}</p>
                    {deal.meddpiccScore.top3Gaps && (
                      <div className="mt-4 flex flex-wrap gap-2">
                        {JSON.parse(deal.meddpiccScore.top3Gaps).map((gap: string, i: number) => (
                          <span key={i} className="badge badge-gray bg-card border border-border text-[10px]">{gap}</span>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {tab === 'outreach' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-bold text-text-primary">Timeline de E-mails</h3>
                    <span className="badge badge-gray">{deal.emails.length} mensagens</span>
                  </div>
                  {deal.emails.length === 0 ? (
                    <div className="card py-20 text-center">
                      <Mail size={48} className="mx-auto text-text-muted mb-4 opacity-20" />
                      <p className="text-text-secondary">Nenhuma conversa encontrada no Gmail</p>
                    </div>
                  ) : (
                    deal.emails.map(email => (
                      <div key={email.id} className="card p-5 hover:border-border-strong transition-all group">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${email.direction === 'inbound' ? 'bg-accent-cyan/10 text-accent-cyan' : 'bg-accent-purple/10 text-accent-purple'}`}>
                              <Mail size={16} />
                            </div>
                            <div>
                              <div className="text-xs font-bold text-text-primary">{email.subject}</div>
                              <div className="text-[10px] text-text-muted">
                                {email.direction === 'inbound' ? `De: ${email.from}` : `Para: ${email.to}`}
                              </div>
                            </div>
                          </div>
                          <div className="text-[10px] text-text-muted">{fmtDate(email.receivedAt)}</div>
                        </div>
                        <p className="text-xs text-text-secondary line-clamp-2 leading-relaxed bg-surface/50 p-3 rounded-xl">
                          {email.snippet || '(Sem conteúdo)'}
                        </p>
                      </div>
                    ))
                  )}
                </div>
                <div className="space-y-6">
                  <div className="card p-5 bg-accent-cyan/5 border-accent-cyan/20">
                    <h3 className="text-sm font-bold text-text-primary mb-4 flex items-center gap-2">
                      <BrainCircuit size={16} className="text-accent-cyan" />
                      Social Intel
                    </h3>
                    <p className="text-xs text-text-secondary leading-relaxed mb-6">
                      Deseja gerar um icebreaker personalizado para o próximo contato via LinkedIn?
                    </p>
                    <button className="w-full btn-primary bg-accent-cyan hover:bg-accent-cyan-light text-xs py-2.5">
                      Gerar LinkedIn Icebreaker
                    </button>
                  </div>
                </div>
              </div>
            )}

            {tab === 'intel' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-text-primary">Signal Radar para {deal.companyName}</h3>
                  <button className="btn-secondary text-[10px] py-1.5 px-3">Configurar Alertas</button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Mocking intelligence items as they come from signals or news */}
                  <div className="card p-5 border-accent-amber/30 bg-accent-amber/5">
                    <div className="flex items-start gap-3">
                      <AlertTriangle size={18} className="text-accent-amber shrink-0" />
                      <div>
                        <div className="text-xs font-bold text-text-primary">Sinal de Risco: Stalled Deal</div>
                        <p className="text-xs text-text-secondary mt-1 leading-relaxed">
                          Nenhuma interação detectada nos últimos 14 dias. A probabilidade de fechamento caiu 15%.
                        </p>
                        <div className="mt-3 text-[10px] text-accent-amber font-bold uppercase tracking-wider">Ação: Re-engagement Sequence</div>
                      </div>
                    </div>
                  </div>
                  <div className="card p-5 border-accent-purple/30 bg-accent-purple/5">
                    <div className="flex items-start gap-3">
                      <BrainCircuit size={18} className="text-accent-purple-light shrink-0" />
                      <div>
                        <div className="text-xs font-bold text-text-primary">Inteligência Competitiva</div>
                        <p className="text-xs text-text-secondary mt-1 leading-relaxed">
                          O cliente mencionou "flexibilidade de integração" no último e-mail. Isso é um ponto forte vs o competidor X.
                        </p>
                        <div className="mt-3 text-[10px] text-accent-purple-light font-bold uppercase tracking-wider">Ação: Enviar Battlecard de Integração</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {tab === 'meetings' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-bold text-text-primary">Histórico de Reuniões</h3>
                    <button className="btn-primary flex items-center gap-2 text-[10px] py-1.5 px-3">
                      <Plus size={14} /> Registrar Reunião
                    </button>
                  </div>
                  {/* Mocking meeting list */}
                  <div className="card p-5 hover:border-border-strong transition-all">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-accent-purple/10 text-accent-purple flex items-center justify-center">
                          <Calendar size={20} />
                        </div>
                        <div>
                          <div className="text-sm font-bold text-text-primary">Discovery Call - Technical Team</div>
                          <div className="text-xs text-text-muted">24 de Março · 45 min</div>
                        </div>
                      </div>
                      <span className="badge badge-green">Concluída</span>
                    </div>
                    <div className="p-4 rounded-xl bg-surface border border-border flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FileText size={14} className="text-text-muted" />
                        <span className="text-xs text-text-secondary">Transcrição disponível</span>
                      </div>
                      <button className="text-[10px] font-bold text-accent-purple-light hover:underline uppercase">Ver Análise IA</button>
                    </div>
                  </div>
                </div>
                <div className="space-y-6">
                  <div className="card p-5 bg-gradient-to-br from-accent-purple/10 to-transparent">
                    <h3 className="text-sm font-bold text-text-primary mb-4 flex items-center gap-2">
                      <BrainCircuit size={16} className="text-accent-purple-light" />
                      AI Prep
                    </h3>
                    <p className="text-xs text-text-secondary leading-relaxed mb-6">
                      Julio analisou o histórico e sugere focar na cláusula de **SLA** e **Data Privacy** na próxima reunião.
                    </p>
                    <button className="w-full btn-secondary text-xs py-2.5">Gerar Briefing de Reunião</button>
                  </div>
                </div>
              </div>
            )}

            {tab === 'notes' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-4">
                  <div className="card p-4">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-8 h-8 rounded-lg bg-accent-purple/10 text-accent-purple flex items-center justify-center">
                        <StickyNote size={18} />
                      </div>
                      <h3 className="text-sm font-bold text-text-primary">Nova Atividade / Nota</h3>
                    </div>
                    <textarea 
                      value={newNote}
                      onChange={(e) => setNewNote(e.target.value)}
                      placeholder="Descreva o que aconteceu ou adicione uma nota estratégica..."
                      className="w-full bg-surface border border-border rounded-2xl p-4 text-sm outline-none focus:ring-2 focus:ring-accent-purple/20 min-h-[120px] transition-all"
                    />
                    <div className="flex justify-end mt-4">
                      <button 
                        onClick={handleAddNote}
                        disabled={!newNote.trim()}
                        className="btn-primary flex items-center gap-2 px-6 py-2.5 disabled:opacity-50"
                      >
                        <Send size={16} />
                        <span>Registrar Atividade</span>
                      </button>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {deal.activities.map(activity => (
                      <div key={activity.id} className="card p-4 hover:border-border-strong transition-all flex items-start gap-4">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                          activity.type === 'meeting' ? 'bg-accent-purple/10 text-accent-purple' :
                          activity.type === 'call' ? 'bg-accent-cyan/10 text-accent-cyan' :
                          'bg-surface border border-border text-text-muted'
                        }`}>
                          {activity.type === 'meeting' ? <Calendar size={18} /> : 
                           activity.type === 'call' ? <Activity size={18} /> : 
                           <StickyNote size={18} />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <div className="text-xs font-bold text-text-primary">{activity.title}</div>
                            <div className="text-[10px] text-text-muted">{fmtDate(activity.date)}</div>
                          </div>
                          {activity.note && (
                            <p className="text-xs text-text-secondary leading-relaxed mt-2 p-3 bg-surface/50 rounded-xl border border-border/50">
                              {activity.note}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="card p-5">
                    <h3 className="text-sm font-bold text-text-primary mb-4">Métricas de Engajamento</h3>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-text-secondary">E-mails trocados</span>
                        <span className="text-sm font-bold text-text-primary">{deal.emails.length}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-text-secondary">Atividades totais</span>
                        <span className="text-sm font-bold text-text-primary">{deal.activities.length}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-text-secondary">Velocity (dias)</span>
                        <span className="text-sm font-bold text-accent-green">{daysSince(deal.updatedAt)}d</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
