import { useEffect, useState, useCallback } from 'react'
import { api, fmtCurrency } from '../lib/api'
import Topbar from '../components/Topbar'
import { 
  Share2, 
  Users, 
  TrendingUp, 
  Loader2, 
  Building,
  ChevronRight,
  Plus
} from 'lucide-react'
import { useI18n } from '../context/I18nContext'

interface Partner {
  id: string
  name: string
  type: string
  dealsCount: number
  totalValue: number
}

export default function ChannelDeals() {
  const { t } = useI18n()
  const [partners, setPartners] = useState<Partner[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      // Logic from V2: Fetch partners and their deals
      const [pRes, dRes] = await Promise.all([
        api.get<{ data: any[] }>('/partners').catch(() => ({ data: [] })),
        api.get<{ data: any[] }>('/channel-deals').catch(() => ({ data: [] }))
      ])
      
      const pData = pRes.data || []
      const dData = dRes.data || []
      
      const mapped: Partner[] = pData.map(p => {
        const pDeals = dData.filter(d => d.partnerId === p.id)
        return {
          id: p.id,
          name: p.name,
          type: p.type || 'Referral',
          dealsCount: pDeals.length,
          totalValue: pDeals.reduce((s, d) => s + (d.value || 0), 0)
        }
      })
      
      // Mock if empty for demo
      if (mapped.length === 0) {
        setPartners([
          { id: '1', name: 'AWS Marketplace', type: 'Cloud', dealsCount: 12, totalValue: 450000 },
          { id: '2', name: 'PwC Brazil', type: 'Consulting', dealsCount: 5, totalValue: 890000 },
          { id: '3', name: 'Stone Partner', type: 'Fintech', dealsCount: 24, totalValue: 1250000 },
        ])
      } else {
        setPartners(mapped)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  return (
    <div className="flex flex-col h-full bg-surface">
      <Topbar 
        title={t('nav.channel_deals')} 
        subtitle="Gestão de parcerias e deals originados por canal"
        onRefresh={load}
      />

      <div className="p-6">
        <div className="flex justify-between items-center mb-8">
          <div className="flex gap-4">
            <div className="card px-4 py-2 flex items-center gap-3">
              <Share2 size={18} className="text-accent-cyan" />
              <div>
                <div className="text-[10px] text-text-muted uppercase font-bold tracking-wider">Revenue Canal</div>
                <div className="text-lg font-bold text-text-primary">{fmtCurrency(partners.reduce((s, p) => s + p.totalValue, 0))}</div>
              </div>
            </div>
          </div>
          <button className="btn-primary flex items-center gap-2">
            <Plus size={18} />
            <span>Novo Parceiro</span>
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-accent-purple" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {partners.map(p => (
              <div key={p.id} className="card p-6 hover:border-accent-cyan/30 transition-all group cursor-pointer">
                <div className="flex items-start justify-between mb-4">
                  <div className="p-3 rounded-2xl bg-surface border border-border group-hover:bg-accent-cyan/5 transition-colors">
                    <Building size={24} className="text-accent-cyan" />
                  </div>
                  <span className="badge badge-gray">{p.type}</span>
                </div>
                
                <h3 className="text-lg font-bold text-text-primary mb-1">{p.name}</h3>
                <div className="flex items-center gap-2 text-xs text-text-muted mb-6">
                  <Users size={12} /> {p.dealsCount} deals ativos
                </div>
                
                <div className="flex items-center justify-between pt-4 border-t border-border/50">
                  <div>
                    <div className="text-[10px] text-text-muted uppercase font-bold tracking-wider">Pipeline Value</div>
                    <div className="text-xl font-black text-text-primary">{fmtCurrency(p.totalValue)}</div>
                  </div>
                  <div className="w-10 h-10 rounded-full bg-surface border border-border flex items-center justify-center group-hover:bg-accent-cyan/10 transition-colors">
                    <ChevronRight size={18} className="text-text-muted group-hover:text-accent-cyan" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
