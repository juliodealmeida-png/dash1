import { useEffect, useState, useCallback } from 'react'
import { api, fmtDate } from '../lib/api'
import Topbar from '../components/Topbar'
import { 
  Newspaper, 
  ExternalLink, 
  Loader2, 
  Globe, 
  ShieldAlert,
  ArrowRight
} from 'lucide-react'
import { useI18n } from '../context/I18nContext'

interface NewsItem {
  id: string
  title: string
  summary: string
  source: string
  url: string
  category: 'regulation' | 'fraud' | 'fintech' | 'market'
  country: string
  createdAt: string
}

export default function News() {
  const { t } = useI18n()
  const [news, setNews] = useState<NewsItem[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      // Fetch news from tools endpoint
      const res = await api.get<any>('/tools/news')
      // If backend returns a different format, map it. For now assuming an array or object with data
      const items = Array.isArray(res) ? res : (res.data || res.news || [])
      
      // Fallback/Mock if empty
      if (items.length === 0) {
        setNews([
          { 
            id: '1', 
            title: 'BACEN publica nova circular sobre Pix Automático e Prevenção à Fraude', 
            summary: 'As novas regras visam aumentar a segurança nas transações recorrentes e estabelecem novos limites de responsabilidade para as instituições financeiras.',
            source: 'Banco Central do Brasil',
            url: 'https://www.bcb.gov.br',
            category: 'regulation',
            country: 'BR',
            createdAt: new Date().toISOString()
          },
          { 
            id: '2', 
            title: 'CNBV atualiza normas de KYC para Fintechs operando no México', 
            summary: 'A atualização exige processos de verificação de identidade mais rigorosos e o uso de biometria para abertura de contas remotas.',
            source: 'CNBV',
            url: '#',
            category: 'regulation',
            country: 'MX',
            createdAt: new Date(Date.now() - 86400000).toISOString()
          },
          { 
            id: '3', 
            title: 'Aumento de ataques de "Account Takeover" em carteiras digitais na Colômbia', 
            summary: 'Relatório da UIAF aponta crescimento de 45% em fraudes de identidade no primeiro trimestre de 2026.',
            source: 'UIAF Colombia',
            url: '#',
            category: 'fraud',
            country: 'CO',
            createdAt: new Date(Date.now() - 172800000).toISOString()
          }
        ])
      } else {
        setNews(items)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const getCategoryBadge = (cat: string) => {
    switch (cat) {
      case 'regulation': return <span className="badge badge-purple">Regulamentação</span>
      case 'fraud': return <span className="badge badge-red">Fraude & Risco</span>
      case 'fintech': return <span className="badge badge-cyan">Fintech</span>
      default: return <span className="badge badge-gray">Mercado</span>
    }
  }

  return (
    <div className="flex flex-col h-full bg-surface">
      <Topbar 
        title={t('nav.news')} 
        subtitle="Monitoramento regulatório e inteligência de mercado LATAM"
        onRefresh={load}
      />

      <div className="p-6">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-accent-purple" />
          </div>
        ) : (
          <div className="max-w-5xl mx-auto space-y-6">
            {/* Featured Section */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="card p-4 bg-accent-purple/5 border-accent-purple/20 flex items-center gap-4">
                <div className="p-3 rounded-xl bg-accent-purple/10 text-accent-purple-light">
                  <ShieldAlert size={24} />
                </div>
                <div>
                  <div className="text-[10px] font-bold text-text-muted uppercase">Alertas Ativos</div>
                  <div className="text-xl font-bold text-text-primary">3 Regulações</div>
                </div>
              </div>
              <div className="card p-4 flex items-center gap-4">
                <div className="p-3 rounded-xl bg-accent-cyan/10 text-accent-cyan">
                  <Globe size={24} />
                </div>
                <div>
                  <div className="text-[10px] font-bold text-text-muted uppercase">Países Monitorados</div>
                  <div className="text-xl font-bold text-text-primary">6 Mercados</div>
                </div>
              </div>
              <div className="card p-4 flex items-center gap-4">
                <div className="p-3 rounded-xl bg-accent-amber/10 text-accent-amber">
                  <Newspaper size={24} />
                </div>
                <div>
                  <div className="text-[10px] font-bold text-text-muted uppercase">Updates hoje</div>
                  <div className="text-xl font-bold text-text-primary">12 Notícias</div>
                </div>
              </div>
            </div>

            {/* News Feed */}
            <div className="space-y-4">
              {news.map(item => (
                <div key={item.id} className="card p-6 hover:border-border-strong transition-all group">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      {getCategoryBadge(item.category)}
                      <span className="text-[10px] font-bold text-text-muted uppercase flex items-center gap-1">
                        <Globe size={10} /> {item.country}
                      </span>
                      <span className="text-[10px] text-text-muted">•</span>
                      <span className="text-[10px] text-text-muted">{fmtDate(item.createdAt)}</span>
                    </div>
                    <a 
                      href={item.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-text-muted hover:text-accent-purple transition-colors"
                    >
                      <ExternalLink size={16} />
                    </a>
                  </div>
                  
                  <h3 className="text-lg font-bold text-text-primary mb-2 group-hover:text-accent-purple-light transition-colors">
                    {item.title}
                  </h3>
                  <p className="text-sm text-text-secondary leading-relaxed mb-4">
                    {item.summary}
                  </p>
                  
                  <div className="flex items-center justify-between pt-4 border-t border-border/50">
                    <span className="text-xs font-semibold text-text-muted italic">Fonte: {item.source}</span>
                    <button className="text-xs font-bold text-accent-purple-light flex items-center gap-1 hover:underline">
                      Análise Julio IA <ArrowRight size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
