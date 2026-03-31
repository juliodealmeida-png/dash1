import { useEffect, useState, useCallback } from 'react'
import { api, fmtCurrency, daysSince, fmtDate } from '../lib/api'
import Topbar from '../components/Topbar'
import { 
  Loader2, 
  Search, 
  Flame, 
  Zap, 
  Snowflake, 
  User, 
  Building2, 
  MapPin, 
  X, 
  Mail, 
  Linkedin, 
  Phone, 
  Calendar,
  BrainCircuit,
  MessageSquare,
  Globe,
  Briefcase
} from 'lucide-react'

import { useToast } from '../context/ToastContext'

interface Lead {
  id: string
  name: string
  email: string
  phone?: string
  company?: string
  title?: string
  country?: string
  icpScore?: number
  temperature?: string
  status?: string
  notes?: string
  contactLinkedin?: string
  companyIndustry?: string
  companyWebsite?: string
  createdAt: string
  updatedAt: string
}

function TempBadge({ temp }: { temp?: string }) {
  if (temp === 'hot')  return <span className="badge badge-red flex items-center gap-1"><Flame size={9} /> Hot</span>
  if (temp === 'warm') return <span className="badge badge-amber flex items-center gap-1"><Zap size={9} /> Warm</span>
  return <span className="badge badge-cyan flex items-center gap-1"><Snowflake size={9} /> Cold</span>
}

function ScoreRing({ score = 0 }: { score?: number }) {
  const color = score >= 70 ? '#10b981' : score >= 40 ? '#f59e0b' : '#ef4444'
  return (
    <div
      className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
      style={{
        background: `conic-gradient(${color} ${score * 3.6}deg, #1e2540 0deg)`,
        boxShadow: `0 0 8px ${color}40`,
      }}
    >
      <div className="w-7 h-7 rounded-full bg-card flex items-center justify-center text-[10px] font-bold" style={{ color }}>
        {score}
      </div>
    </div>
  )
}

export default function Leads() {
  const { toast, dismiss } = useToast()
  const [leads, setLeads] = useState<Lead[]>([])
  const [filtered, setFiltered] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'all' | 'hot' | 'warm' | 'cold'>('all')
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null)
  const [generatingIcebreaker, setGeneratingIcebreaker] = useState(false)
  const [icebreaker, setIcebreaker] = useState<any>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get<{ data: Lead[] }>('/leads?perPage=100')
      setLeads(res.data ?? [])
    } catch (e) {
      console.error(e)
      toast('Erro ao carregar leads', 'error')
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    let list = leads
    if (filter !== 'all') list = list.filter((l) => l.temperature === filter)
    if (search) {
      const q = search.toLowerCase()
      list = list.filter(
        (l) =>
          l.name.toLowerCase().includes(q) ||
          l.company?.toLowerCase().includes(q) ||
          l.email?.toLowerCase().includes(q)
      )
    }
    setFiltered(list)
  }, [leads, search, filter])

  async function handleGenerateIcebreaker() {
    if (!selectedLead || generatingIcebreaker) return
    const tid = toast('Julio está criando seu icebreaker...', 'loading')
    setGeneratingIcebreaker(true)
    try {
      const res = await api.post('/julio/social-intel/icebreaker', { leadId: selectedLead.id })
      setIcebreaker(res)
      dismiss(tid)
      toast('Icebreaker gerado!', 'success')
    } catch (e) {
      console.error(e)
      dismiss(tid)
      toast('Erro ao gerar icebreaker', 'error')
    } finally {
      setGeneratingIcebreaker(false)
    }
  }

  const hot  = leads.filter((l) => l.temperature === 'hot').length
  const warm = leads.filter((l) => l.temperature === 'warm').length
  const cold = leads.filter((l) => l.temperature === 'cold').length

  return (
    <div className="flex flex-col h-full relative overflow-hidden">
      <Topbar title="Leads" subtitle={`${leads.length} leads total`} onRefresh={load} />

      <div className="p-5 space-y-4 animate-fade-in flex-1 overflow-y-auto">
        {/* Stats row */}
        <div className="flex gap-3">
          {[
            { label: hot === 1 ? 'Hot 🔥' : 'Hot 🔥', count: hot,  color: 'badge-red',   key: 'hot'  },
            { label: 'Warm ⚡', count: warm, color: 'badge-amber', key: 'warm' },
            { label: 'Cold ❄',  count: cold, color: 'badge-cyan',  key: 'cold' },
          ].map((s) => (
            <button
              key={s.key}
              onClick={() => setFilter(filter === s.key as typeof filter ? 'all' : s.key as typeof filter)}
              className={`kpi-card flex items-center gap-2 px-4 py-2.5 transition-all ${filter === s.key ? 'border-accent-purple bg-accent-purple/5' : 'hover:border-border-strong'}`}
            >
              <span className={`badge ${s.color}`}>{s.count}</span>
              <span className="text-xs text-text-secondary font-bold">{s.label}</span>
            </button>
          ))}
          <div className="flex-1" />
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              className="input pl-8 py-2 text-xs w-52 bg-card border-border"
              placeholder="Buscar leads..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* Table */}
        <div className="card p-0 overflow-hidden shadow-xl border-0">
          <div className="grid grid-cols-[36px_1fr_160px_80px_90px_80px] gap-3 px-4 py-3 border-b border-border bg-surface/50">
            {['ICP', 'Lead', 'Empresa', 'País', 'Temp', 'Atividade'].map((h) => (
              <div key={h} className="text-[10px] font-bold text-text-muted uppercase tracking-widest">
                {h}
              </div>
            ))}
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-accent-purple" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center text-text-muted text-sm py-20">Nenhum lead encontrado</div>
          ) : (
            <div className="divide-y divide-border/50">
              {filtered.map((lead) => (
                <div
                  key={lead.id}
                  onClick={() => { setSelectedLead(lead); setIcebreaker(null); }}
                  className={`grid grid-cols-[36px_1fr_160px_80px_90px_80px] gap-3 px-4 py-4 hover:bg-elevated transition-all cursor-pointer items-center group ${selectedLead?.id === lead.id ? 'bg-elevated border-l-2 border-accent-purple' : ''}`}
                >
                  <ScoreRing score={lead.icpScore} />
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-text-primary truncate flex items-center gap-1 group-hover:text-accent-purple-light transition-colors">
                      {lead.name}
                    </div>
                    <div className="text-[10px] text-text-muted truncate">{lead.email}</div>
                  </div>
                  <div className="flex items-center gap-1 min-w-0">
                    <Building2 size={11} className="text-text-muted shrink-0" />
                    <span className="text-xs text-text-secondary truncate">{lead.company ?? '—'}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <MapPin size={10} className="text-text-muted" />
                    <span className="text-xs text-text-muted">{lead.country ?? '—'}</span>
                  </div>
                  <TempBadge temp={lead.temperature} />
                  <div className="text-[10px] text-text-muted">
                    {daysSince(lead.updatedAt)}d atrás
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Lead Detail Drawer */}
      {selectedLead && (
        <div className="absolute inset-y-0 right-0 w-[450px] bg-card border-l border-border shadow-2xl z-50 flex flex-col animate-slide-in">
          <div className="p-6 border-b border-border flex items-center justify-between bg-surface/30">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-accent-purple/10 flex items-center justify-center text-accent-purple font-bold text-xl">
                {selectedLead.name.substring(0, 1)}
              </div>
              <div>
                <h2 className="text-lg font-black text-text-primary">{selectedLead.name}</h2>
                <p className="text-xs text-text-muted">{selectedLead.title || 'Lead'} @ {selectedLead.company}</p>
              </div>
            </div>
            <button onClick={() => setSelectedLead(null)} className="p-2 hover:bg-surface rounded-xl text-text-muted hover:text-text-primary transition-all">
              <X size={20} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-8">
            {/* Quick Actions */}
            <div className="grid grid-cols-3 gap-3">
              <button className="flex flex-col items-center gap-2 p-3 rounded-2xl bg-surface border border-border hover:border-accent-purple/30 transition-all group">
                <Mail size={18} className="text-text-muted group-hover:text-accent-purple" />
                <span className="text-[10px] font-bold text-text-muted uppercase">Email</span>
              </button>
              <button className="flex flex-col items-center gap-2 p-3 rounded-2xl bg-surface border border-border hover:border-accent-cyan/30 transition-all group">
                <MessageSquare size={18} className="text-text-muted group-hover:text-accent-cyan" />
                <span className="text-[10px] font-bold text-text-muted uppercase">WhatsApp</span>
              </button>
              <button 
                onClick={() => window.open(selectedLead.contactLinkedin, '_blank')}
                className="flex flex-col items-center gap-2 p-3 rounded-2xl bg-surface border border-border hover:border-blue-500/30 transition-all group"
              >
                <Linkedin size={18} className="text-text-muted group-hover:text-blue-500" />
                <span className="text-[10px] font-bold text-text-muted uppercase">LinkedIn</span>
              </button>
            </div>

            {/* Info Grid */}
            <div className="space-y-4">
              <h3 className="text-xs font-black text-text-muted uppercase tracking-widest">Informações do Lead</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 rounded-xl bg-surface/50 border border-border/50">
                  <div className="text-[10px] text-text-muted font-bold uppercase mb-1">E-mail</div>
                  <div className="text-xs font-medium text-text-primary truncate">{selectedLead.email}</div>
                </div>
                <div className="p-3 rounded-xl bg-surface/50 border border-border/50">
                  <div className="text-[10px] text-text-muted font-bold uppercase mb-1">Telefone</div>
                  <div className="text-xs font-medium text-text-primary">{selectedLead.phone || '—'}</div>
                </div>
                <div className="p-3 rounded-xl bg-surface/50 border border-border/50">
                  <div className="text-[10px] text-text-muted font-bold uppercase mb-1">Indústria</div>
                  <div className="text-xs font-medium text-text-primary">{selectedLead.companyIndustry || 'Tecnologia'}</div>
                </div>
                <div className="p-3 rounded-xl bg-surface/50 border border-border/50">
                  <div className="text-[10px] text-text-muted font-bold uppercase mb-1">País</div>
                  <div className="text-xs font-medium text-text-primary">{selectedLead.country || 'Brasil'}</div>
                </div>
              </div>
            </div>

            {/* AI Icebreaker Section */}
            <div className="card p-5 border-accent-purple/30 bg-gradient-to-br from-accent-purple/5 to-transparent">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <BrainCircuit size={18} className="text-accent-purple-light" />
                  <h3 className="font-bold text-text-primary">Julio IA: Social Intel</h3>
                </div>
                {!icebreaker && (
                  <button 
                    onClick={handleGenerateIcebreaker}
                    disabled={generatingIcebreaker}
                    className="btn-primary text-[10px] py-1.5 px-3"
                  >
                    {generatingIcebreaker ? <Loader2 size={12} className="animate-spin" /> : 'Gerar Icebreaker'}
                  </button>
                )}
              </div>

              {icebreaker ? (
                <div className="space-y-4">
                  <div className="p-3 rounded-xl bg-card border border-border/50">
                    <div className="text-[10px] text-accent-purple-light font-bold uppercase mb-2">Abordagem Sugerida</div>
                    <p className="text-xs text-text-secondary leading-relaxed italic">
                      "{icebreaker.icebreakers[1].text}"
                    </p>
                  </div>
                  <div className="text-[10px] text-text-muted leading-relaxed">
                    <span className="font-bold text-text-secondary">Por que funciona:</span> {icebreaker.reasoning}
                  </div>
                </div>
              ) : (
                <p className="text-xs text-text-muted italic">
                  Julio pode analisar o perfil deste lead e sugerir uma quebra de gelo personalizada.
                </p>
              )}
            </div>

            {/* Activity History */}
            <div className="space-y-4">
              <h3 className="text-xs font-black text-text-muted uppercase tracking-widest">Histórico Recente</h3>
              <div className="space-y-3">
                <div className="flex gap-3">
                  <div className="w-px bg-border relative">
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-accent-purple" />
                  </div>
                  <div className="pb-4">
                    <div className="text-xs font-bold text-text-primary">Lead Criado</div>
                    <div className="text-[10px] text-text-muted">{fmtDate(selectedLead.createdAt)}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="p-6 border-t border-border bg-surface/30">
            <button className="w-full btn-primary py-3 font-bold uppercase tracking-widest text-xs">
              Converter para Deal
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
