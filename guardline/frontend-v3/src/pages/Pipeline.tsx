import { useEffect, useState } from 'react'
import api from '../lib/api'
import { useI18n } from '../contexts/I18nContext'

interface DealRaw {
  id: string
  name?: string
  deal_name?: string
  company?: string
  company_name?: string
  stage?: string
  deal_stage?: string
  value?: number
  deal_amount?: number
  owner?: string
  close_date?: string
  deal_close_date?: string
  probability?: number
  deal_probability?: number
  health?: number
  created_at?: string
}

import StageKanban from '../components/StageKanban'
import DealDrawer from '../components/DealDrawer'

export default function Pipeline() {
  const { t } = useI18n()
  const [deals, setDeals] = useState<DealRaw[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedDeal, setSelectedDeal] = useState<string | null>(null)

  const fetchDeals = () => {
    setLoading(true)
    api.get<DealRaw[] | { deals?: DealRaw[] }>('/api/pipeline/deals')
      .then((data) => setDeals(Array.isArray(data) ? data : (data.deals ?? [])))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchDeals()
  }, [])

  // Map to the format StageKanban expects just in case
  const kanbanDeals = deals.map(d => ({
    id: d.id,
    deal_name: d.deal_name || d.name || d.company_name || 'Deal',
    deal_amount: d.deal_amount || d.value || 0,
    deal_stage: d.deal_stage || d.stage || 'prospecting',
    deal_probability: d.deal_probability || d.probability || Number(d.health || 0),
    created_at: d.created_at || new Date().toISOString()
  }))

  const handleStageChange = async (dealId: string, newStage: string) => {
    try {
      await api.patch(`/api/deals/${dealId}`, { deal_stage: newStage })
      setDeals(prev => prev.map(d => d.id === dealId ? { ...d, deal_stage: newStage, stage: newStage } : d))
    } catch (err) {
      console.error('Failed to move stage:', err)
      // revert if strictly necessary, but ideally toast error
    }
  }

  return (
    <div>
      <div style={{ marginBottom: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#f1f5f9' }}>{t('pipeline.title') || 'Pipeline'}</h1>
          <div style={{ fontSize: 13, color: '#94a3b8' }}>Arrastra tratos para actualizar el CRM en tiempo real.</div>
        </div>
        <button 
          onClick={fetchDeals} 
          disabled={loading}
          style={{ padding: '8px 16px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#e2e8f0', borderRadius: 8, fontSize: 13, cursor: loading ? 'not-allowed' : 'pointer' }}
        >
          {loading ? 'Refrescando...' : 'Refresh'}
        </button>
      </div>

      {error && <div style={{ color: '#f87171', marginBottom: 16 }}>{t('common.error')}: {error}</div>}
      
      {!loading && !error && deals.length === 0 && <div style={{ color: '#64748b', textAlign: 'center', padding: '40px' }}>{t('common.empty') || 'No deals found in pipeline.'}</div>}
      
      <div style={{ background: '#0f172a', padding: '16px', borderRadius: 16, border: '1px solid rgba(255,255,255,0.05)', overflowX: 'auto' }}>
        <StageKanban 
          deals={kanbanDeals} 
          onDealClick={(id) => setSelectedDeal(id)}
          onStageChange={handleStageChange}
        />
      </div>

      <DealDrawer 
        dealId={selectedDeal} 
        onClose={() => setSelectedDeal(null)} 
        onStageChange={() => fetchDeals()}
      />
    </div>
  )
}

