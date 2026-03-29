import { useEffect, useState, useCallback } from 'react'
import { api, fmtCurrency, daysSince } from '../lib/api'
import Topbar from '../components/Topbar'
import { Loader2, Search, Flame, Zap, Snowflake, User, Building2, MapPin } from 'lucide-react'

interface Lead {
  id: string
  name: string
  email: string
  company?: string
  title?: string
  country?: string
  icpScore?: number
  temperature?: string
  stage?: string
  value?: number
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
  const [leads, setLeads] = useState<Lead[]>([])
  const [filtered, setFiltered] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'all' | 'hot' | 'warm' | 'cold'>('all')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get<{ data: Lead[] }>('/leads?perPage=100')
      setLeads(res.data ?? [])
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [])

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

  const hot  = leads.filter((l) => l.temperature === 'hot').length
  const warm = leads.filter((l) => l.temperature === 'warm').length
  const cold = leads.filter((l) => l.temperature === 'cold').length

  return (
    <div className="flex flex-col min-h-full">
      <Topbar title="Leads" subtitle={`${leads.length} leads total`} onRefresh={load} />

      <div className="p-5 space-y-4 animate-fade-in">
        {/* Stats row */}
        <div className="flex gap-3">
          {[
            { label: 'Hot 🔥', count: hot,  color: 'badge-red',   key: 'hot'  },
            { label: 'Warm ⚡', count: warm, color: 'badge-amber', key: 'warm' },
            { label: 'Cold ❄',  count: cold, color: 'badge-cyan',  key: 'cold' },
          ].map((s) => (
            <button
              key={s.key}
              onClick={() => setFilter(filter === s.key as typeof filter ? 'all' : s.key as typeof filter)}
              className={`kpi-card flex items-center gap-2 px-4 py-2.5 ${filter === s.key ? 'border-accent-purple/40' : ''}`}
            >
              <span className={`badge ${s.color}`}>{s.count}</span>
              <span className="text-xs text-text-secondary">{s.label}</span>
            </button>
          ))}
          <div className="flex-1" />
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              className="input pl-8 py-2 text-xs w-52"
              placeholder="Buscar leads..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* Table */}
        <div className="card p-0 overflow-hidden">
          {/* Header */}
          <div className="grid grid-cols-[36px_1fr_160px_80px_90px_80px] gap-3 px-4 py-2 border-b border-border-subtle">
            {['ICP', 'Lead', 'Empresa', 'País', 'Temp', 'Atividade'].map((h) => (
              <div key={h} className="text-[10px] font-semibold text-text-muted uppercase tracking-wider">
                {h}
              </div>
            ))}
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-5 h-5 animate-spin text-accent-purple" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center text-text-muted text-sm py-12">Nenhum lead encontrado</div>
          ) : (
            <div className="divide-y divide-border-subtle">
              {filtered.map((lead) => (
                <div
                  key={lead.id}
                  className="grid grid-cols-[36px_1fr_160px_80px_90px_80px] gap-3 px-4 py-3 hover:bg-elevated transition-colors cursor-pointer items-center"
                >
                  <ScoreRing score={lead.icpScore} />
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-text-primary truncate flex items-center gap-1">
                      <User size={11} className="text-text-muted shrink-0" />
                      {lead.name}
                    </div>
                    <div className="text-[10px] text-text-muted truncate">{lead.email}</div>
                    {lead.title && (
                      <div className="text-[10px] text-text-muted truncate">{lead.title}</div>
                    )}
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
    </div>
  )
}
