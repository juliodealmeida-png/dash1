import { useEffect, useState, useCallback } from 'react'
import { api, fmtCurrency } from '../lib/api'
import Topbar from '../components/Topbar'
import { 
  Rocket, 
  Search, 
  Loader2, 
  UserPlus, 
  Filter, 
  ChevronRight,
  Target,
  Globe,
  Briefcase
} from 'lucide-react'
import { useI18n } from '../context/I18nContext'

interface Prospect {
  id: string
  name: string
  title: string
  company: string
  industry: string
  country: string
  email?: string
  linkedin?: string
  score: number
  source: string
}

export default function Prospecting() {
  const { t } = useI18n()
  const [prospects, setProspects] = useState<Prospect[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      // Mocking data as backend might not have a dedicated prospecting endpoint yet, 
      // but we use the existing leads endpoint as a proxy or just show what's available
      const res = await api.get<{ data: any[] }>('/leads?perPage=50')
      const mapped: Prospect[] = (res.data ?? []).map(l => ({
        id: l.id,
        name: l.name || 'Unknown',
        title: l.title || 'Executive',
        company: l.company || 'Stealth Startup',
        industry: l.industry || 'Technology',
        country: l.country || 'Global',
        email: l.email,
        linkedin: l.linkedin,
        score: l.icpScore || 75,
        source: l.source || 'Apollo'
      }))
      setProspects(mapped)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const filtered = prospects.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase()) || 
    p.company.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="flex flex-col h-full bg-surface">
      <Topbar 
        title={t('nav.prospecting')} 
        subtitle="Enriquecimento de dados e descoberta de novos tomadores de decisão"
        onRefresh={load}
      />

      <div className="p-6">
        {/* Toolbar */}
        <div className="flex items-center justify-between mb-6 gap-4">
          <div className="relative flex-1 max-w-md">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <input 
              type="text" 
              placeholder="Buscar por nome, empresa ou cargo..." 
              className="w-full bg-card border border-border rounded-xl pl-10 pr-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-accent-purple/20 transition-all"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <button className="btn-secondary flex items-center gap-2 px-4 py-2.5">
              <Filter size={16} />
              <span>Filtros</span>
            </button>
            <button className="btn-primary flex items-center gap-2 px-4 py-2.5">
              <UserPlus size={16} />
              <span>Importar de Apollo</span>
            </button>
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-accent-purple" />
          </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            {/* List */}
            <div className="xl:col-span-2 space-y-3">
              {filtered.map(p => (
                <div key={p.id} className="card p-4 hover:border-accent-purple/30 transition-all group cursor-pointer">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-surface border border-border flex items-center justify-center group-hover:bg-accent-purple/5 group-hover:border-accent-purple/20 transition-colors">
                      <Target size={20} className="text-accent-purple-light" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-text-primary truncate">{p.name}</h4>
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${p.score > 80 ? 'bg-accent-green/10 text-accent-green' : 'bg-accent-amber/10 text-accent-amber'}`}>
                          {p.score}% ICP
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-xs text-text-secondary flex items-center gap-1">
                          <Briefcase size={12} className="text-text-muted" /> {p.title} @ {p.company}
                        </span>
                        <span className="text-xs text-text-secondary flex items-center gap-1">
                          <Globe size={12} className="text-text-muted" /> {p.country}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button className="p-2 hover:bg-surface rounded-lg text-text-muted hover:text-accent-purple transition-colors">
                        <Rocket size={16} />
                      </button>
                      <ChevronRight size={20} className="text-text-muted" />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Sidebar / Stats */}
            <div className="space-y-6">
              <div className="card p-5 bg-gradient-to-br from-accent-purple/10 to-transparent border-accent-purple/20">
                <h3 className="font-bold text-text-primary mb-4 flex items-center gap-2">
                  <Rocket size={18} className="text-accent-purple-light" />
                  Insight de Prospecção
                </h3>
                <p className="text-xs text-text-secondary leading-relaxed mb-4">
                  Detectamos 12 novos tomadores de decisão em contas target que visitaram sua página de preços nas últimas 24 horas.
                </p>
                <button className="w-full btn-primary text-xs py-2">Ver Recomendações</button>
              </div>

              <div className="card p-5">
                <h3 className="font-bold text-text-primary mb-4">Fontes Ativas</h3>
                <div className="space-y-3">
                  {[
                    { name: 'Apollo.io', status: 'Ativo', color: 'text-accent-green' },
                    { name: 'LinkedIn Sales Nav', status: 'Ativo', color: 'text-accent-green' },
                    { name: 'Lusha', status: 'Pausado', color: 'text-text-muted' },
                    { name: 'Waalaxy', status: 'Ativo', color: 'text-accent-green' }
                  ].map(s => (
                    <div key={s.name} className="flex items-center justify-between p-2 rounded-lg bg-surface/50 border border-border/50">
                      <span className="text-xs font-medium text-text-secondary">{s.name}</span>
                      <span className={`text-[10px] font-bold ${s.color}`}>{s.status}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
