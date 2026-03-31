import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useI18n } from '../context/I18nContext'
import Topbar from '../components/Topbar'
import { 
  Settings as SettingsIcon, 
  User as UserIcon, 
  Bell, 
  Link as LinkIcon, 
  Database,
  RefreshCcw,
  CheckCircle2,
  XCircle,
  ShieldCheck,
  Mail,
  MessageSquare,
  Slack,
  Loader2
} from 'lucide-react'
import { api } from '../lib/api'

export default function SettingsView() {
  const { user } = useAuth()
  const { t } = useI18n()
  const [integrations, setIntegrations] = useState<any[]>([])
  const [status, setStatus] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)
  const [slackChannelAlerts, setSlackChannelAlerts] = useState('')
  const [slackChannelDaily, setSlackChannelDaily] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [a, b] = await Promise.allSettled([
        api.get<{ data: any[] }>('/integrations'),
        api.get<any>('/status'),
      ])
      if (a.status === 'fulfilled') {
        const items = a.value.data || []
        setIntegrations(items)
        const slack = items.find((i: any) => i.type === 'slack')
        if (slack?.config) {
          setSlackChannelAlerts(slack.config.channelAlerts || '')
          setSlackChannelDaily(slack.config.channelDaily || '')
        }
      } else {
        setIntegrations([])
      }
      if (b.status === 'fulfilled') setStatus(b.value)
      else setStatus(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const feature = useMemo(() => {
    const checks = status?.checks || {}
    return {
      hubspot: checks.hubspot || null,
      n8n: checks.n8n || null,
      gmail: checks.gmail || null,
      whatsapp: checks.whatsapp || null,
      slack: checks.slack || null,
    }
  }, [status])

  async function doHubspotConnect() {
    await api.post('/integrations/hubspot/connect', {})
    await load()
  }

  async function doHubspotSync() {
    await api.post('/integrations/hubspot/sync', {})
    await load()
  }

  async function doSlackTest() {
    await api.post('/integrations/slack/test', {})
    await load()
  }

  async function doSlackConnect() {
    await api.post('/integrations/slack/connect', {
      channelAlerts: slackChannelAlerts.trim() || null,
      channelDaily: slackChannelDaily.trim() || null,
    })
    await load()
  }

  const StatusBadge = ({ state }: { state: string | null }) => {
    if (state === 'configured') return <span className="badge badge-green flex items-center gap-1"><CheckCircle2 size={10} /> Active</span>
    if (state === 'failed') return <span className="badge badge-red flex items-center gap-1"><XCircle size={10} /> Error</span>
    return <span className="badge badge-gray">Not Configured</span>
  }

  return (
    <div className="flex flex-col min-h-full bg-surface">
      <Topbar title={t('nav.settings')} subtitle="Configurações da conta e integrações do ecossistema" onRefresh={load} />
      
      <div className="p-6 overflow-y-auto">
        <div className="max-w-4xl mx-auto space-y-6">
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Profile Section */}
            <div className="lg:col-span-2 space-y-6">
              <div className="card p-6 shadow-xl border-0 bg-card/50">
                <div className="flex items-center gap-3 mb-8">
                  <div className="p-2 rounded-xl bg-accent-purple/10 text-accent-purple-light">
                    <UserIcon size={20} />
                  </div>
                  <h3 className="text-lg font-bold text-text-primary">{t('settings.profile')}</h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-text-muted uppercase font-black tracking-widest">{t('settings.name')}</label>
                    <input className="input w-full" defaultValue={user?.name} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-text-muted uppercase font-black tracking-widest">{t('settings.email')}</label>
                    <input className="input w-full bg-surface/50 opacity-70 cursor-not-allowed" defaultValue={user?.email} disabled />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-text-muted uppercase font-black tracking-widest">{t('settings.company')}</label>
                    <input className="input w-full" defaultValue={user?.company ?? ''} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-text-muted uppercase font-black tracking-widest">{t('settings.role')}</label>
                    <input className="input w-full bg-surface/50 opacity-70 cursor-not-allowed" defaultValue={user?.role} disabled />
                  </div>
                </div>
                
                <div className="mt-8 pt-6 border-t border-border/50 flex justify-end">
                  <button className="btn-primary px-8 py-2.5" disabled>
                    {t('settings.save')}
                  </button>
                </div>
              </div>

              {/* Integrations Section */}
              <div className="card p-6 shadow-xl border-0 bg-card/50">
                <div className="flex items-center gap-3 mb-8">
                  <div className="p-2 rounded-xl bg-accent-cyan/10 text-accent-cyan">
                    <LinkIcon size={20} />
                  </div>
                  <h3 className="text-lg font-bold text-text-primary">{t('settings.integrations')}</h3>
                </div>

                <div className="space-y-4">
                  {/* HubSpot */}
                  <div className="flex items-center justify-between p-4 rounded-2xl bg-surface/30 border border-border/50 hover:border-accent-purple/30 transition-all group">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center">
                        <img src="https://www.hubspot.com/hubfs/assets/hubspot.com/style-guide/brand-guidelines/guidelines_logos_hubspot_sprocket.svg" className="w-6 h-6" alt="HubSpot" />
                      </div>
                      <div>
                        <div className="text-sm font-bold text-text-primary">HubSpot CRM</div>
                        <StatusBadge state={feature.hubspot} />
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button className="btn-secondary text-[10px] py-1.5 px-3" onClick={doHubspotConnect}>{t('settings.connect')}</button>
                      <button className="btn-secondary text-[10px] py-1.5 px-3 flex items-center gap-1" onClick={doHubspotSync}>
                        <RefreshCcw size={10} /> {t('settings.sync_now')}
                      </button>
                    </div>
                  </div>

                  {/* Slack */}
                  <div className="p-4 rounded-2xl bg-surface/30 border border-border/50 hover:border-accent-purple/30 transition-all">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-[#4A154B]">
                          <Slack size={24} />
                        </div>
                        <div>
                          <div className="text-sm font-bold text-text-primary">Slack Alerts</div>
                          <StatusBadge state={feature.slack} />
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button className="btn-secondary text-[10px] py-1.5 px-3" onClick={doSlackTest}>{t('settings.test')}</button>
                        <button className="btn-secondary text-[10px] py-1.5 px-3" onClick={doSlackConnect}>{t('settings.connect')}</button>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <label className="text-[10px] text-text-muted uppercase font-black tracking-widest">Alerts channel</label>
                        <input className="input w-full" value={slackChannelAlerts} onChange={(e) => setSlackChannelAlerts(e.target.value)} placeholder="#revenue-alerts" />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] text-text-muted uppercase font-black tracking-widest">Daily channel</label>
                        <input className="input w-full" value={slackChannelDaily} onChange={(e) => setSlackChannelDaily(e.target.value)} placeholder="#julio-daily" />
                      </div>
                    </div>
                  </div>

                  {/* Gmail */}
                  <div className="flex items-center justify-between p-4 rounded-2xl bg-surface/30 border border-border/50 hover:border-accent-purple/30 transition-all">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-accent-red">
                        <Mail size={24} />
                      </div>
                      <div>
                        <div className="text-sm font-bold text-text-primary">Gmail Integration</div>
                        <StatusBadge state={feature.gmail} />
                      </div>
                    </div>
                    <button className="btn-secondary text-[10px] py-1.5 px-3">{t('settings.connect')}</button>
                  </div>

                  {/* WhatsApp */}
                  <div className="flex items-center justify-between p-4 rounded-2xl bg-surface/30 border border-border/50 hover:border-accent-purple/30 transition-all">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-accent-green">
                        <MessageSquare size={24} />
                      </div>
                      <div>
                        <div className="text-sm font-bold text-text-primary">WhatsApp Business</div>
                        <StatusBadge state={feature.whatsapp} />
                      </div>
                    </div>
                    <button className="btn-secondary text-[10px] py-1.5 px-3">{t('settings.connect')}</button>
                  </div>
                </div>
              </div>
            </div>

            {/* Sidebar Section: Status & System */}
            <div className="space-y-6">
              <div className="card p-6 shadow-xl border-0 bg-card/50">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 rounded-xl bg-accent-amber/10 text-accent-amber">
                    <Database size={20} />
                  </div>
                  <h3 className="text-lg font-bold text-text-primary">{t('settings.sync')}</h3>
                </div>
                
                <div className="space-y-4">
                  <div className="p-4 rounded-2xl bg-surface/50 border border-border/50">
                    <div className="text-[10px] text-text-muted uppercase font-bold mb-1">{t('settings.status')}</div>
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${status?.ok ? 'bg-accent-green animate-pulse' : 'bg-accent-red'}`} />
                      <span className="text-sm font-bold text-text-primary">
                        {status ? (status.ok ? 'Engine Healthy' : 'Degraded Performance') : 'Checking...'}
                      </span>
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-surface/50 border border-border/50">
                    <div className="text-[10px] text-text-muted uppercase font-bold mb-1">n8n Engine</div>
                    <StatusBadge state={feature.n8n} />
                  </div>

                  <button 
                    className="w-full btn-secondary text-xs flex items-center justify-center gap-2 py-3" 
                    onClick={load}
                    disabled={loading}
                  >
                    {loading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCcw size={14} />}
                    {t('settings.update_status')}
                  </button>
                </div>
              </div>

              <div className="card p-6 border-accent-purple/20 bg-accent-purple/5">
                <div className="flex items-center gap-2 mb-4 text-accent-purple-light">
                  <ShieldCheck size={18} />
                  <span className="text-xs font-bold uppercase tracking-wider">Segurança</span>
                </div>
                <p className="text-xs text-text-secondary leading-relaxed">
                  Sua conta está protegida com criptografia ponta-a-ponta para todas as integrações de API.
                </p>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}
