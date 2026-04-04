import { useEffect, useState } from 'react'
import api from '../lib/api'
import { useI18n } from '../contexts/I18nContext'
import { useToast } from '../contexts/ToastContext'
import { N8N } from '../lib/api'

interface Automation {
  id: string
  name: string
  status: 'active' | 'inactive' | 'error'
  last_run?: string
  runs_today?: number
  description?: string
}

const STATUS_COLORS = { active: '#34d399', inactive: '#64748b', error: '#f87171' }

export default function Automations() {
  const { t } = useI18n()
  const { toast } = useToast()
  const [automations, setAutomations] = useState<Automation[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get<Automation[] | { automations?: Automation[] }>('/api/automations')
      .then((data) => setAutomations(Array.isArray(data) ? data : (data.automations ?? [])))
      .catch(() => setAutomations([]))
      .finally(() => setLoading(false))
  }, [])

  async function triggerRefresh() {
    try {
      await N8N.signalRefresh()
      toast('Refresh triggered', 'success')
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Error', 'error')
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#f1f5f9' }}>{t('sidebar.automations')}</h1>
        <button
          onClick={triggerRefresh}
          style={{ background: 'rgba(124,58,237,0.2)', border: '1px solid #7c3aed', color: '#a78bfa', borderRadius: 8, padding: '8px 16px', fontSize: 13, cursor: 'pointer' }}
        >
          Trigger n8n Refresh
        </button>
      </div>
      {loading && <div style={{ color: '#94a3b8' }}>{t('common.loading')}</div>}
      {!loading && automations.length === 0 && <div style={{ color: '#64748b' }}>{t('common.empty')}</div>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {automations.map((a) => (
          <div key={a.id} style={{
            background: '#1e293b',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 10,
            padding: '16px 20px',
            display: 'flex',
            alignItems: 'center',
            gap: 16,
          }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: STATUS_COLORS[a.status], flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#f1f5f9' }}>{a.name}</div>
              {a.description && <div style={{ fontSize: 12, color: '#64748b' }}>{a.description}</div>}
            </div>
            {a.last_run && <div style={{ fontSize: 12, color: '#64748b' }}>Last: {a.last_run}</div>}
            {a.runs_today !== undefined && <div style={{ fontSize: 12, color: '#94a3b8' }}>Runs today: {a.runs_today}</div>}
          </div>
        ))}
      </div>
    </div>
  )
}
