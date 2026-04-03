import { useEffect, useState } from 'react'
import api, { N8N } from '../lib/api'
import { useI18n } from '../contexts/I18nContext'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import KpiCard from '../components/KpiCard'
import RiskBadge from '../components/RiskBadge'
import DealDrawer from '../components/DealDrawer'
import LeadDrawer from '../components/LeadDrawer'

interface KpiData {
  pipeline_total: number
  forecast_90d: number
  active_deals: number
  at_risk_count: number
  win_rate: number
  critical_alerts: number
  hot_leads: number
}
interface HealthData { health_score: number; coverage_ratio: number }
interface Deal { id: string; deal_name?: string; deal_amount?: number; deal_stage?: string; deal_probability?: number; created_at?: string; company_name?: string }
interface Lead { id: string; company_name?: string; companyName?: string; lead_score?: number; score?: number; lead_temperature?: string; next_action?: string; owner_name?: string }
interface Signal { id: string; severity: string; title: string; message?: string; description?: string; is_read?: boolean; read?: boolean; createdAt?: string; created_at?: string }
interface BriefData { items?: string[]; bullets?: string[]; generated_at?: string }
interface Recipe { id: string; name?: string; is_active?: boolean; active?: boolean }
interface Execution { id: string; status?: string; created_at?: string; workflow_name?: string }

const fmt = (n: number) => n >= 1_000_000 ? `$${(n/1_000_000).toFixed(1)}M` : n >= 1_000 ? `$${(n/1_000).toFixed(0)}k` : `$${n}`
const pct = (n: number) => `${n}%`
const daysSince = (d?: string) => d ? Math.floor((Date.now() - new Date(d).getTime()) / 86400000) : 0

const SEV_COLOR: Record<string, string> = { critical: '#f87171', warning: '#fbbf24', info: '#60a5fa' }

export default function CommandCenter() {
  const { t } = useI18n()
  const { isNew } = useAuth()
  const { toast } = useToast()

  const [kpis, setKpis] = useState<KpiData | null>(null)
  const [health, setHealth] = useState<HealthData | null>(null)
  const [deals, setDeals] = useState<Deal[]>([])
  const [leads, setLeads] = useState<Lead[]>([])
  const [signals, setSignals] = useState<Signal[]>([])
  const [brief, setBrief] = useState<BriefData | null>(null)
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [executions, setExecutions] = useState<Execution[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDeal, setSelectedDeal] = useState<string | null>(null)
  const [selectedLead, setSelectedLead] = useState<string | null>(null)

  // Onboarding checklist state
  const [n8nTriggering, setN8nTriggering] = useState<string | null>(null)

  useEffect(() => {
    const all = [
      api.get<KpiData>('/api/dashboard/kpis').then(setKpis).catch(() => {}),
      api.get<HealthData>('/api/dashboard/pipeline-health').then(setHealth).catch(() => {}),
      api.get<{ deals: Deal[]; success?: boolean; data?: Deal[] }>('/api/deals').then(r => setDeals(r?.deals ?? (r as unknown as { data: Deal[] })?.data ?? [])).catch(() => {}),
      api.get<{ success: boolean; data: Lead[] } | Lead[]>('/api/leads').then(r => setLeads((r as { data: Lead[] })?.data ?? (Array.isArray(r) ? r : []))).catch(() => {}),
      api.get<{ success: boolean; data: Signal[] } | Signal[]>('/api/signals?take=20&unread=true').then(r => setSignals((r as { data: Signal[] })?.data ?? (Array.isArray(r) ? r : []))).catch(() => {}),
      api.get<{ success: boolean; data: { brief: BriefData } }>('/api/julio/brief/latest').then(r => setBrief(r?.data?.brief ?? null)).catch(() => {}),
      api.get<{ recipes: Recipe[] } | Recipe[]>('/api/automations/recipes').then(r => setRecipes((r as { recipes: Recipe[] })?.recipes ?? (Array.isArray(r) ? r : []))).catch(() => {}),
      api.get<{ executions: Execution[] } | Execution[]>('/api/executions').then(r => setExecutions((r as { executions: Execution[] })?.executions ?? (Array.isArray(r) ? r : []))).catch(() => {}),
    ]
    Promise.all(all).finally(() => setLoading(false))
  }, [])

  const activeWorkflows = recipes.filter(r => r.is_active || r.active).length
  const computedIsNew = isNew || (deals.length === 0 && leads.length === 0 && activeWorkflows < 2)

  const atRiskDeals = deals.filter(d => { const p = Number(d.deal_probability ?? 0); return p > 0 && p <= 50 }).slice(0, 5)
  const hotLeads = leads.filter(l => (l.lead_temperature === 'hot') || Number(l.lead_score ?? l.score ?? 0) >= 70).slice(0, 5)
  const unreadSignals = signals.filter(s => !s.is_read && !s.read).slice(0, 12)
  const errExecutions = executions.filter(e => e.status === 'error' || e.status === 'failed')

  async function triggerN8n(wf: string) {
    setN8nTriggering(wf)
    try {
      await N8N.signalRefresh()
      toast(`Workflow ${wf} triggered`, 'success')
    } catch {
      toast(`Error triggering ${wf}`, 'error')
    } finally {
      setN8nTriggering(null)
    }
  }

  if (loading) return <div style={{ color: '#94a3b8', padding: 40 }}>{t('common.loading')}</div>

  const showInfo = (msg: string) => toast(msg, 'info')

  // ── KPI BAND ─────────────────────────────────────────────────────────────────
  const atRiskValue = atRiskDeals.reduce((s, d) => s + Number(d.deal_amount ?? 0), 0)
  const kpiCards = (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 12, marginBottom: 24 }}>
      <KpiCard label={t('kpi.pipeline')} value={fmt(kpis?.pipeline_total ?? 0)} color="#06b6d4" subtitle="Activo" />
      <KpiCard label={t('kpi.forecast')} value={fmt(kpis?.forecast_90d ?? 0)} color="#a78bfa" subtitle="Comprometido" />
      <KpiCard label={t('kpi.activeDeals')} value={kpis?.active_deals ?? 0} color="#f1f5f9" subtitle="Cobertura vs Meta" />
      <KpiCard label={t('kpi.atRisk')} value={kpis?.at_risk_count ?? 0} color="#f87171" subtitle={`${fmt(atRiskValue)} en riesgo`} />
      <KpiCard label={t('kpi.winRate')} value={pct(kpis?.win_rate ?? 0)} color="#34d399" subtitle="90 días" />
      <KpiCard label={t('kpi.health')} value={`${health?.health_score ?? 0}/100`} color="#fbbf24" subtitle="Score general" />
      <KpiCard label={t('kpi.alerts')} value={kpis?.critical_alerts ?? 0} color="#f87171" subtitle="Críticas" onClick={() => showInfo('Signals ya aparecen en este dashboard.')} />
    </div>
  )

  // ── ONBOARDING BLOCK ─────────────────────────────────────────────────────────
  const WFS = [
    { id: 'wf01', label: t('onboarding.wf01') || 'Ingestión de leads', active: activeWorkflows >= 1 },
    { id: 'wf02', label: t('onboarding.wf02') || 'Enrichment / Scoring', active: activeWorkflows >= 2 },
    { id: 'wf03', label: t('onboarding.wf03') || 'Signals / Watchlist', active: activeWorkflows >= 3 },
    { id: 'wf04', label: t('onboarding.wf04') || 'Follow-ups auto', active: activeWorkflows >= 4 },
    { id: 'wf05', label: t('onboarding.wf05') || 'Briefing diario Júlio', active: activeWorkflows >= 5 },
  ]
  const onboardingBlock = computedIsNew ? (
    <div style={{ background: 'linear-gradient(135deg,rgba(124,58,237,0.08),rgba(6,182,212,0.06))', border: '1px solid rgba(124,58,237,0.25)', borderRadius: 16, padding: 28, marginBottom: 24 }}>
      <div style={{ marginBottom: 4, fontSize: 20, fontWeight: 700 }}>{t('onboarding.title') || 'Activa tu Revenue OS'}</div>
      <div style={{ color: '#94a3b8', fontSize: 13, marginBottom: 24 }}>{t('onboarding.subtitle') || 'Configura tu operación base para que Guardline empiece a trabajar por ti.'}</div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
        <Card title={t('onboarding.config') || 'Estado de Conexión'}>
          {[t('onboarding.crm') || 'CRM conectado', t('onboarding.email') || 'Email conectado', t('onboarding.n8n') || 'n8n Workflows activos', t('onboarding.leads') || 'Importación de base'].map((item, i) => (
            <CheckItem key={i} label={item} checked={i === 2 ? activeWorkflows > 0 : i === 3 ? deals.length > 0 || leads.length > 0 : false} />
          ))}
        </Card>

        <Card title={t('onboarding.workflows') || 'Automatizaciones n8n sugeridas'}>
          {WFS.map(wf => (
            <div key={wf.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
              <CheckItem label={wf.label} checked={wf.active} />
              {!wf.active && (
                <button onClick={() => triggerN8n(wf.id)} disabled={n8nTriggering === wf.id} style={{ fontSize: 10, padding: '2px 8px', borderRadius: 6, border: '1px solid #7c3aed', background: 'rgba(124,58,237,0.1)', color: '#a78bfa', cursor: 'pointer' }}>
                  {n8nTriggering === wf.id ? '...' : 'Activar'}
                </button>
              )}
            </div>
          ))}
        </Card>

        <Card title={t('onboarding.value') || 'Valor desbloqueado'}>
          {['Leads priorizados y con scoring', 'Surtido de Pipeline real', 'Briefing diario de inteligencia', 'Radar de señales y riesgo'].map((item, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0', fontSize: 12, color: '#94a3b8' }}>
              <span style={{ color: '#7c3aed' }}>→</span> {item}
            </div>
          ))}
          <button onClick={() => showInfo('Júlio AI está concentrado neste painel (Brief + Prioridades).')} style={{ marginTop: 16, width: '100%', padding: '8px', borderRadius: 8, background: 'linear-gradient(135deg,#7c3aed,#06b6d4)', border: 'none', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
            Hablar con Júlio AI →
          </button>
        </Card>
      </div>
    </div>
  ) : null

  // ── COMMAND CENTER ───────────────────────────────────────────────────────────
  return (
    <div>
      {kpiCards}
      {onboardingBlock}

      {/* Row 2: Priorities + Julio Brief */}
      <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: 16, marginBottom: 16 }}>
        {/* Priorities */}
        <Section title={t('priorities.title') || 'Prioridades del Día'}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <div style={{ fontSize: 11, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>{t('priorities.deals') || 'Deals a Intervenir Hoy'}</div>
              {atRiskDeals.length === 0 && <div style={{ color: '#64748b', fontSize: 12 }}>{t('common.empty')}</div>}
              {atRiskDeals.map(d => (
                <div key={d.id} onClick={() => setSelectedDeal(d.id)} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 8, padding: '8px 10px', marginBottom: 6, cursor: 'pointer', borderLeft: '2px solid #f87171' }}>
                  <div style={{ fontSize: 12, fontWeight: 600, display: 'flex', justifyContent: 'space-between' }}>
                    <span>{String(d.deal_name ?? d.company_name ?? 'Deal')}</span>
                    <span style={{ fontSize: 10, background: 'rgba(248,113,113,0.1)', color: '#f87171', padding: '2px 6px', borderRadius: 4 }}>Urgente</span>
                  </div>
                  <div style={{ fontSize: 11, color: '#06b6d4', marginTop: 4 }}>{fmt(Number(d.deal_amount ?? 0))} · {daysSince(d.created_at)}d estancado</div>
                  <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 4 }}>MEDDPICC Gap detectado</div>
                </div>
              ))}
            </div>
            <div>
              <div style={{ fontSize: 11, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>{t('priorities.leads') || 'Leads a Activar Hoy'}</div>
              {hotLeads.length === 0 && <div style={{ color: '#64748b', fontSize: 12 }}>{t('common.empty')}</div>}
              {hotLeads.map(l => (
                <div key={l.id} onClick={() => setSelectedLead(l.id)} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 8, padding: '8px 10px', marginBottom: 6, cursor: 'pointer', borderLeft: '2px solid #34d399' }}>
                  <div style={{ fontSize: 12, fontWeight: 600 }}>{String(l.company_name ?? l.companyName ?? 'Lead')}</div>
                  <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>Score: <strong style={{ color: '#34d399' }}>{l.lead_score ?? l.score ?? 0}</strong></div>
                  <div style={{ fontSize: 10, marginTop: 4, display: 'inline-block', padding: '2px 6px', background: 'rgba(52,211,153,0.1)', color: '#34d399', borderRadius: 4 }}>Activar Lead</div>
                </div>
              ))}
            </div>
          </div>
        </Section>

        {/* Julio Brief */}
        <Section title={t('julio.brief') || 'Júlio Brief del Día'}>
          {brief?.items && brief.items.length > 0 ? (
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {(brief.items ?? brief.bullets ?? []).slice(0, 5).map((item, i) => (
                <li key={i} style={{ padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.04)', fontSize: 12, color: '#cbd5e1', display: 'flex', gap: 8, lineHeight: 1.4 }}>
                  <span style={{ color: '#7c3aed', flexShrink: 0 }}>•</span> {item}
                </li>
              ))}
            </ul>
          ) : (
            <div style={{ color: '#64748b', fontSize: 12 }}>Brief no disponible o en proceso de generación. Habla con Júlio.</div>
          )}
          <div style={{ display: 'flex', gap: 6, marginTop: 14, flexWrap: 'wrap' }}>
            <button onClick={() => showInfo('Pipeline: usa a seção Prioridades + Pipeline Operativo abaixo.')} style={{ padding: '6px 14px', borderRadius: 20, fontSize: 11, fontWeight: 600, border: '1px solid rgba(124,58,237,0.4)', background: 'rgba(124,58,237,0.1)', color: '#a78bfa', cursor: 'pointer' }}>Analizar Pipeline</button>
            <button onClick={() => showInfo('Riesgos: veja Radar de Salud y Riesgos neste dashboard.')} style={{ padding: '6px 14px', borderRadius: 20, fontSize: 11, fontWeight: 600, border: '1px solid rgba(124,58,237,0.4)', background: 'rgba(124,58,237,0.1)', color: '#a78bfa', cursor: 'pointer' }}>Explicar Riesgos</button>
            <button onClick={() => showInfo('Plan del día: usa Prioridades + Top Actions del Brief.')} style={{ padding: '6px 14px', borderRadius: 20, fontSize: 11, fontWeight: 600, border: '1px solid rgba(124,58,237,0.4)', background: 'rgba(124,58,237,0.1)', color: '#a78bfa', cursor: 'pointer' }}>Plan del Día</button>
          </div>
        </Section>
      </div>

      {/* Row 3: Pipeline Kanban + Signals */}
      <div style={{ display: 'grid', gridTemplateColumns: '7fr 3fr', gap: 16, marginBottom: 16 }}>
        <Section title={t('pipeline.title') || 'Pipeline Operativo'} action={{ label: t('common.viewAll'), onClick: () => showInfo('Pipeline completo está consolidado neste Command Center.') }} style={{ paddingBottom: 8 }}>
          <SimplePipelineSummary deals={deals} onDealClick={setSelectedDeal} />
        </Section>
        <Section title={t('signals.title') || 'Intelligence Feed (Signals)'} action={{ label: t('common.viewAll'), onClick: () => showInfo('Signals completos estão listados aqui.') }}>
          {unreadSignals.length === 0 && <div style={{ color: '#64748b', fontSize: 12 }}>{t('common.empty')}</div>}
          {unreadSignals.map(s => (
            <div key={s.id} style={{ padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.04)', borderLeft: `2px solid ${SEV_COLOR[s.severity] ?? '#64748b'}`, paddingLeft: 10, marginBottom: 4 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#f1f5f9' }}>{s.title}</div>
              <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 4 }}>Hace {(s.createdAt ?? s.created_at ?? '').slice(0, 10)}</div>
            </div>
          ))}
        </Section>
      </div>

      {/* Row 4: Risk Board */}
      <Section title={t('risk.title') || 'Radar de Salud y Riesgos'} style={{ marginBottom: 16 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 24 }}>
          {/* At-risk deals */}
          <div>
            <div style={{ fontSize: 11, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>{t('risk.atRisk')}</div>
            {atRiskDeals.slice(0, 4).map(d => (
              <div key={d.id} onClick={() => setSelectedDeal(d.id)} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.04)', fontSize: 12, cursor: 'pointer' }}>
                <span style={{ color: '#f1f5f9' }}>{String(d.deal_name ?? 'Deal')}</span>
                <span style={{ color: '#f87171', fontWeight: 600 }}>{fmt(Number(d.deal_amount ?? 0))}</span>
              </div>
            ))}
            {atRiskDeals.length === 0 && <div style={{ color: '#64748b', fontSize: 12 }}>Sin deals en riesgo alto</div>}
          </div>
          {/* MEDDPICC gaps */}
          <div>
            <div style={{ fontSize: 11, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>{t('risk.meddpicc') || 'Gaps de MEDDPICC'}</div>
            {deals.filter(d => !d.deal_probability || Number(d.deal_probability) === 0).slice(0, 4).map(d => (
              <div key={d.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.04)', fontSize: 12 }}>
                <span style={{ color: '#f1f5f9' }}>{String(d.deal_name ?? 'Deal')}</span>
                <span style={{ color: '#fbbf24', fontSize: 11 }}>Falta revisión</span>
              </div>
            ))}
            {deals.filter(d => !d.deal_probability || Number(d.deal_probability) === 0).length === 0 && (
              <div style={{ color: '#64748b', fontSize: 12 }}>Todos los deals evaluados</div>
            )}
          </div>
          {/* Aging */}
          <div>
            <div style={{ fontSize: 11, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>{t('risk.aging') || 'Aging por Etapa (Estancamiento)'}</div>
            {['prospecting', 'qualification', 'proposal', 'negotiation'].map(stage => {
              const stageDeals = deals.filter(d => String(d.deal_stage ?? '').toLowerCase().includes(stage))
              const avg = stageDeals.length > 0 ? Math.round(stageDeals.reduce((s, d) => s + daysSince(d.created_at), 0) / stageDeals.length) : 0
              return (
                <div key={stage} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.04)', fontSize: 12 }}>
                  <span style={{ color: '#f1f5f9', textTransform: 'capitalize' }}>{stage}</span>
                  <span style={{ color: avg > 30 ? '#f87171' : '#94a3b8', fontWeight: avg > 30 ? 600 : 400 }}>{avg}d promedio</span>
                </div>
              )
            })}
          </div>
        </div>
      </Section>

      {/* Row 5: Leads + System Pulse */}
      <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: 16 }}>
        <Section title={t('leads.title') || 'Entrada de Demanda (Leads)'} action={{ label: t('common.viewAll'), onClick: () => showInfo('Leads principais já aparecem aqui.') }}>
          <div style={{ display: 'flex', gap: 16, marginBottom: 12 }}>
            <div style={{ fontSize: 12, color: '#94a3b8' }}>Nuevos: <strong style={{ color: '#f1f5f9' }}>{leads.length}</strong></div>
            <div style={{ fontSize: 12, color: '#94a3b8' }}>Calientes: <strong style={{ color: '#34d399' }}>{hotLeads.length}</strong></div>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead><tr>
              <th style={{ padding: '6px 8px', textAlign: 'left', color: '#64748b', fontSize: 10, textTransform: 'uppercase' }}>Lead / Contacto</th>
              <th style={{ padding: '6px 8px', textAlign: 'left', color: '#64748b', fontSize: 10, textTransform: 'uppercase' }}>Score</th>
              <th style={{ padding: '6px 8px', textAlign: 'left', color: '#64748b', fontSize: 10, textTransform: 'uppercase' }}>Estado</th>
              <th style={{ padding: '6px 8px', textAlign: 'right', color: '#64748b', fontSize: 10, textTransform: 'uppercase' }}>Acción</th>
            </tr></thead>
            <tbody>
              {leads.slice(0, 5).map(l => (
                <tr key={l.id} onClick={() => setSelectedLead(l.id)} style={{ cursor: 'pointer', borderBottom: '1px solid rgba(255,255,255,0.04)' }} onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.03)')} onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                  <td style={{ padding: '10px 8px', color: '#f1f5f9', fontWeight: 500 }}>{String(l.company_name ?? l.companyName ?? '—')}</td>
                  <td style={{ padding: '10px 8px', color: '#34d399', fontWeight: 600 }}>{l.lead_score ?? l.score ?? 0}</td>
                  <td style={{ padding: '10px 8px' }}><TempBadge temp={l.lead_temperature} /></td>
                  <td style={{ padding: '10px 8px', textAlign: 'right', color: '#7c3aed', fontSize: 11 }}>Revisar →</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>

        <Section title={t('system.title') || 'System Pulse / Automations'}>
          <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
            <Stat label="Workflows activos" value={activeWorkflows} color="#34d399" />
            <Stat label="Ejecutado hoy" value={executions.length} color="#06b6d4" />
            <Stat label="Mantenimiento" value={errExecutions.length} color={errExecutions.length > 0 ? '#f87171' : '#34d399'} />
          </div>
          <div style={{ fontSize: 11, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Últimas ejecuciones n8n</div>
          {executions.slice(0, 4).map(e => (
            <div key={e.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.04)', fontSize: 11 }}>
              <span style={{ color: '#f1f5f9' }}>{e.workflow_name ?? 'Workflow'}</span>
              <span style={{ padding: '2px 6px', borderRadius: 4, background: e.status === 'success' ? 'rgba(52,211,153,0.1)' : 'rgba(248,113,113,0.1)', color: e.status === 'success' ? '#34d399' : '#f87171' }}>{e.status ?? 'unknown'}</span>
            </div>
          ))}
          {executions.length === 0 && <div style={{ color: '#64748b', fontSize: 12 }}>Sin ejecuciones recientes.</div>}
          <button onClick={() => showInfo('Automations: veja o bloco System Pulse neste painel.')} style={{ marginTop: 16, width: '100%', padding: '8px', borderRadius: 8, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#cbd5e1', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
            Ver consola n8n →
          </button>
        </Section>
      </div>

      <DealDrawer dealId={selectedDeal} onClose={() => setSelectedDeal(null)} onStageChange={() => {}} />
      <LeadDrawer leadId={selectedLead} onClose={() => setSelectedLead(null)} />
    </div>
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────
function Section({ title, children, action, style: extraStyle }: { title: string; children: React.ReactNode; action?: { label: string; onClick: () => void }; style?: React.CSSProperties }) {
  return (
    <div style={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '16px 18px', ...extraStyle }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{title}</div>
        {action && <button onClick={action.onClick} style={{ fontSize: 11, color: '#7c3aed', background: 'none', border: 'none', cursor: 'pointer' }}>{action.label} →</button>}
      </div>
      {children}
    </div>
  )
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 10, padding: 16, border: '1px solid rgba(255,255,255,0.06)' }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>{title}</div>
      {children}
    </div>
  )
}

function CheckItem({ label, checked }: { label: string; checked: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0', fontSize: 12, color: checked ? '#34d399' : '#94a3b8' }}>
      <span>{checked ? '✓' : '○'}</span> {label}
    </div>
  )
}

function TempBadge({ temp }: { temp?: string }) {
  const map: Record<string, [string, string]> = { hot: ['#f87171', 'rgba(248,113,113,0.12)'], warm: ['#fbbf24', 'rgba(251,191,36,0.12)'], cold: ['#818cf8', 'rgba(129,140,248,0.12)'] }
  const [color, bg] = map[temp ?? ''] ?? ['#64748b', 'rgba(100,116,139,0.12)']
  return <span style={{ padding: '2px 7px', borderRadius: 10, background: bg, color, fontSize: 10, fontWeight: 600 }}>{temp ?? '—'}</span>
}

function Stat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 8, padding: '8px 12px', flex: 1, textAlign: 'center' }}>
      <div style={{ fontSize: 20, fontWeight: 700, color }}>{value}</div>
      <div style={{ fontSize: 10, color: '#64748b', marginTop: 2 }}>{label}</div>
    </div>
  )
}

function SimplePipelineSummary({ deals, onDealClick }: { deals: Deal[]; onDealClick: (id: string) => void }) {
  const stages = ['prospecting', 'qualification', 'proposal', 'negotiation']
  const stageMap: Record<string, string> = { '1031112078': 'prospecting', '1031112080': 'qualification', '1160559924': 'proposal', '1311981861': 'negotiation', '1031112083': 'won', '1031112084': 'lost' }
  const norm = (s?: string) => stageMap[String(s ?? '')] ?? String(s ?? 'prospecting').toLowerCase()
  const stageColors: Record<string, string> = { prospecting: '#818cf8', qualification: '#60a5fa', proposal: '#34d399', negotiation: '#fb923c' }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${stages.length}, 1fr)`, gap: 8 }}>
      {stages.map(stage => {
        const sd = deals.filter(d => norm(String(d.deal_stage ?? '')) === stage)
        const val = sd.reduce((s, d) => s + Number(d.deal_amount ?? 0), 0)
        return (
          <div key={stage} style={{ borderTop: `2px solid ${stageColors[stage]}`, paddingTop: 8 }}>
            <div style={{ fontSize: 10, color: stageColors[stage], fontWeight: 700, textTransform: 'uppercase', marginBottom: 6 }}>{stage}</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#f1f5f9' }}>{sd.length}</div>
            <div style={{ fontSize: 11, color: '#06b6d4' }}>{fmt(val)}</div>
            <div style={{ marginTop: 6, maxHeight: 80, overflow: 'hidden' }}>
              {sd.slice(0, 2).map(d => (
                <div key={d.id} onClick={() => onDealClick(d.id)} style={{ fontSize: 10, color: '#94a3b8', padding: '2px 0', cursor: 'pointer', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {String(d.deal_name ?? '—')}
                </div>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
