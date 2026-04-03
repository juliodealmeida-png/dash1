/// <reference types="vite/client" />

const API_BASE = (import.meta.env.VITE_API_BASE as string) || ''

function getToken(): string | null {
  return localStorage.getItem('gl_token')
}

// ── OFFLINE FALLBACK MOCKS ──────────────────────────────────────────
const DEMO_FALLBACKS: Record<string, unknown> = {
  '/api/pipeline/deals': [
    { id: 'mock-deal-1', deal_name: 'Acme Corp Expansion', deal_amount: 120000, deal_stage: 'proposal', deal_probability: 70, created_at: new Date(Date.now() - 5*86400000).toISOString() },
    { id: 'mock-deal-2', deal_name: 'Stark Industries API', deal_amount: 350000, deal_stage: 'negotiation', deal_probability: 90, created_at: new Date(Date.now() - 15*86400000).toISOString() },
    { id: 'mock-deal-3', deal_name: 'Wayne Ent Retry', deal_amount: 85000, deal_stage: 'prospecting', deal_probability: 20, created_at: new Date(Date.now() - 2*86400000).toISOString() }
  ],
  '/api/deals': [
    { id: 'mock-deal-1', deal_name: 'Acme Corp Expansion', deal_amount: 120000, deal_stage: 'proposal' },
    { id: 'mock-deal-2', deal_name: 'Stark Industries API', deal_amount: 350000, deal_stage: 'negotiation' }
  ],
  '/api/leads': [
    { id: 'mock-l-1', name: 'Tony Stark', company: 'Stark Industries', email: 'tony@stark.com', score: 95, status: 'hot', source: 'Website', created_at: new Date().toISOString() },
    { id: 'mock-l-2', name: 'Bruce Wayne', company: 'Wayne Ent', email: 'bruce@wayne.com', score: 45, status: 'new', source: 'LinkedIn Ads', created_at: new Date().toISOString() },
    { id: 'mock-l-3', name: 'Clark Kent', company: 'Daily Planet', email: 'clark@daily.com', score: 82, status: 'hot', source: 'Referral', created_at: new Date().toISOString() }
  ],
  '/api/signals': [
    { id: 'mock-sig-1', type: 'Risk Alert', message: 'Acme Corp ha dejado de abrir los emails del vendedor durante 8 días seguidos.', deal_name: 'Acme Corp Expansion', priority: 'high', created_at: 'Hace 2 horas' },
    { id: 'mock-sig-2', type: 'Opportunity', message: 'Director de IT de Stark Industries acaba de visitar la página de Precios.', deal_name: 'Stark Industries API', priority: 'medium', created_at: 'Hace 5 horas' }
  ],
  '/api/automations': [
    { id: 'mock-auto-1', name: 'Inbound Lead Enrichment (Clearbit)', status: 'active', runs_today: 42, last_run: '10 min ago', description: 'Enriquece todos los leads nuevos que entran de Ads o Website.' },
    { id: 'mock-auto-2', name: 'Risk Alert to Slack', status: 'error', runs_today: 0, last_run: 'Yesterday', description: 'Notifica al canal #revenue-os si un deal VIP cae en riesgo rojo.' }
  ],
  '/api/home/dashboard': {
    kpis: { pipeline_total: 2450000, forecast_90d: 1200000, active_deals: 18, at_risk_count: 3, win_rate: 34, critical_alerts: 2 },
    health: { health_score: 82 },
    onboarding: { is_new: true, active_workflows: 2 },
    deals: [
      { id: 'mock-d-1', deal_name: 'Global Corp Licencias', deal_amount: 45000, deal_probability: 20, created_at: new Date().toISOString() }
    ],
    leads: [
      { id: 'mock-l-1', company_name: 'TechFlow', score: 92, lead_temperature: 'hot' }
    ],
    signals: [
      { id: 'sig-mock', title: 'Riesgo detectado en Global Corp', severity: 'high', created_at: new Date().toISOString() }
    ],
    automations: {
      active_workflows: 2,
      executions: [
        { id: 'exe-1', workflow_name: 'Lead Sync', status: 'success' },
        { id: 'exe-2', workflow_name: 'Alerting', status: 'error' }
      ]
    }
  },
  '/api/ai/julio/brief/latest': {
    summary: 'Mock: Tu pipeline tiene una concentración del 60% en deals de bajo cierre. Hay 3 leads Hot que no han sido contactados hoy.',
    top_actions: ['Llama a Tony Stark (Score 95)', 'Mueve el deal de Stark Industries a Propuesta', 'Activa la automatización Risk Alert'],
    risks: ['Wayne Ent lleva estancado 2 días sin respuesta']
  },
  '/api/ai/julio/brief': {
    summary: 'Mock: Pipeline estable, pero cuidado con el deal de Stark Industries que superó el deal life promedio (35 días).',
    top_actions: ['Revisa los gaps MEDDPICC de Stark Industries', 'Cierra el pipeline de Wayne Ent.'],
    risks: ['El deal velocity bajó 12% global']
  },
  '/api/accounts': [
    { company: 'Stark Industries', leadCount: 5, avgScore: 82, totalValue: 450000, lastActivity: '2h atrás', sector: 'Tech' },
    { company: 'Wayne Enterprises', leadCount: 3, avgScore: 45, totalValue: 120000, lastActivity: '3d atrás', sector: 'Defense' },
    { company: 'Daily Planet', leadCount: 2, avgScore: 68, totalValue: 85000, lastActivity: '1d atrás', sector: 'Media' },
  ],
  '/api/contacts': [
    { id: 'c1', name: 'Tony Stark', email: 'tony@stark.com', company: 'Stark Industries', jobTitle: 'CEO', score: 95, status: 'hot' },
    { id: 'c2', name: 'Bruce Wayne', email: 'bruce@wayne.com', company: 'Wayne Enterprises', jobTitle: 'Chairman', score: 45, status: 'warm' },
    { id: 'c3', name: 'Clark Kent', email: 'clark@daily.com', company: 'Daily Planet', jobTitle: 'CTO', score: 82, status: 'qualified' },
    { id: 'c4', name: 'Pepper Potts', email: 'pepper@stark.com', company: 'Stark Industries', jobTitle: 'COO', score: 78, status: 'warm' },
  ],
  '/api/automations/executions': [
    { id: 'ex1', workflow_name: 'Lead Enrichment', status: 'success', started_at: '10:32', duration_ms: 1200 },
    { id: 'ex2', workflow_name: 'Risk Alert to Slack', status: 'error', started_at: '09:15', duration_ms: 450, error_message: 'Slack webhook timeout' },
    { id: 'ex3', workflow_name: 'Signal Refresh', status: 'success', started_at: '08:00', duration_ms: 3400 },
  ],
  '/api/channels/deals': [
    { id: 'ch1', channel: 'Partner', partner: 'Acme Reseller', deal_name: 'Global Corp Licencias', value: 120000, stage: 'proposal', commission: 12000 },
    { id: 'ch2', channel: 'Direct', deal_name: 'Stark Industries API', value: 350000, stage: 'negotiation' },
  ],
  '/api/admin/logs': [
    { id: 'log1', action: 'User login', user: 'admin@guardline.com', timestamp: new Date().toISOString(), level: 'info' },
    { id: 'log2', action: 'Deal stage change: proposal → negotiation', user: 'ae@guardline.com', resource: 'Stark Industries', timestamp: new Date(Date.now() - 3600000).toISOString(), level: 'info' },
  ],
  '/api/admin/system': { db_status: 'healthy', api_status: 'ok', n8n_status: 'ok', redis_status: 'ok', users_total: 4, active_sessions: 2 }
  ,
  '/api/dashboard/kpis': { pipeline_total: 2450000, forecast_90d: 1200000, active_deals: 18, at_risk_count: 4, win_rate: 34, critical_alerts: 2, hot_leads: 3 },
  '/api/dashboard/pipeline-health': { health_score: 74, coverage_ratio: 1.2 },
  '/api/julio/brief/latest': { success: true, data: { brief: { items: ['Pipeline concentrado em 2 deals grandes; crie saída para reduzir risco.', '2 deals com baixa probabilidade: acione champion + próximo passo claro.', 'Sinais de intenção em 1 conta: resposta em <2h aumenta win-rate.', 'Forecast 90d: ajuste commit e empurre proposta pendente.', 'Acione n8n: enrichment + alertas para manter cadência.'], generated_at: new Date().toISOString() } } },
  '/api/automations/recipes': { recipes: [{ id: 'wf01', name: 'WF01 — Ingestão de leads', is_active: true }, { id: 'wf02', name: 'WF02 — Scoring', is_active: true }, { id: 'wf03', name: 'WF03 — Signals', is_active: false }] },
  '/api/executions': { executions: [{ id: 'exe-1', workflow_name: 'Lead Sync', status: 'success', created_at: new Date().toISOString() }, { id: 'exe-2', workflow_name: 'Signal Refresh', status: 'error', created_at: new Date(Date.now() - 3600000).toISOString() }] },
  '/api/forecast': { scenarios: { pessimistic: 650000, base: 900000, optimistic: 1200000 }, committed: 900000, best_case: 1200000, at_risk_deals: [{ id: 'mock-deal-1', name: 'Acme Corp Expansion', value: 120000, reason: 'Sem resposta há 8 dias; MEDDPICC incompleto.' }, { id: 'mock-deal-3', name: 'Wayne Ent Retry', value: 85000, reason: 'Champion não confirmado; next step indefinido.' }] },
  '/api/analytics': { revenue_by_month: [{ month: 'Jan', value: 210000 }, { month: 'Fev', value: 260000 }, { month: 'Mar', value: 310000 }, { month: 'Abr', value: 280000 }, { month: 'Mai', value: 360000 }], pipeline_by_stage: [{ stage: 'prospecting', count: 6, value: 420000 }, { stage: 'qualification', count: 5, value: 610000 }, { stage: 'proposal', count: 4, value: 740000 }, { stage: 'negotiation', count: 3, value: 680000 }], win_loss_ratio: { won: 8, lost: 5 } },
  '/api/campaigns': [{ id: 'cmp-1', name: 'Outbound — ICP SaaS', status: 'running', sent: 1200, opens: 410, replies: 38, created_at: new Date(Date.now() - 7 * 86400000).toISOString() }, { id: 'cmp-2', name: 'Revival — Lost Q1', status: 'paused', sent: 640, opens: 180, replies: 12, created_at: new Date(Date.now() - 20 * 86400000).toISOString() }],
  '/api/documents': [{ id: 'doc-1', name: 'Proposta — Acme', type: 'Proposal', deal: 'Acme Corp Expansion', created_at: new Date(Date.now() - 2 * 86400000).toISOString(), url: 'https://example.com/proposta.pdf' }, { id: 'doc-2', name: 'NDA — Stark', type: 'NDA', deal: 'Stark Industries API', created_at: new Date(Date.now() - 12 * 86400000).toISOString(), url: 'https://example.com/nda.pdf' }],
  '/api/products/intelligence': [{ product: 'Guardline Core', revenue: 840000, deals: 14, win_rate: 36, avg_deal_size: 60000, top_objections: ['Preço', 'Integração com CRM', 'Segurança'] }, { product: 'Guardline Signals', revenue: 420000, deals: 7, win_rate: 42, avg_deal_size: 58000, top_objections: ['Tempo de implementação', 'Dados disponíveis'] }],
  '/api/investor/metrics': { arr: 4200000, mrr: 350000, pipeline_value: 2450000, win_rate: 34, avg_deal_size: 72000, sales_cycle_days: 41, churn_rate: 2.1, nrr: 118 },
  '/api/fraud/alerts': [{ id: 'fraud-1', type: 'Anomalia de pagamento', severity: 'high', description: 'Tentativa de cobrança duplicada detectada em conta VIP.', entity: 'Acme Corp', created_at: new Date(Date.now() - 3 * 3600000).toISOString(), resolved: false }, { id: 'fraud-2', type: 'Login suspeito', severity: 'medium', description: 'Login fora do padrão geográfico.', entity: 'Wayne Ent', created_at: new Date(Date.now() - 26 * 3600000).toISOString(), resolved: true }]
}

function getFallbackForPath(path: string): unknown {
  // Normalize path query params away to find the mock
  const base = path.split('?')[0]
  if (DEMO_FALLBACKS[base]) return DEMO_FALLBACKS[base]
  
  // Default mock shapes if completely unknown map
  if (path.includes('deal') || path.includes('lead') || path.includes('signal') || path.includes('automation')) {
    return []
  }
  return {}
}

// ── INTERCEPTOR / REQUEST ──────────────────────────────────────────
async function request<T = unknown>(
  method: string,
  path: string,
  body?: unknown,
  retried = false
): Promise<T> {
  const token = getToken()
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (token) headers['Authorization'] = `Bearer ${token}`

  try {
    const res = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })

    if (res.status === 401 && !retried) {
      localStorage.removeItem('gl_token')
      window.location.href = '/login'
      throw new Error('Unauthorized')
    }

    if (!res.ok) {
      // If server returns an error (404, 500, etc) and it's a GET, try fallback instead of crashing
      if (method === 'GET') {
        throw new Error(`HTTP ${res.status}`) // Trigger fallback block
      }
      const err = await res.json().catch(() => ({ error: res.statusText }))
      throw new Error(err?.error || `HTTP ${res.status}`)
    }

    if (res.status === 204) return undefined as T
    
    const parsedData = await res.json()
    
    // Normalization Layer: If backend sends { data: [...] } instead of [...], auto-unwrap safely.
    // E.g. { deals: [...] } -> [...]
    if (parsedData && typeof parsedData === 'object' && !Array.isArray(parsedData)) {
      const keys = Object.keys(parsedData)
      // If there's primarily one array key like "deals", "leads", "data", "signals" -> unwrap it.
      // But only if T seems to expect an array (since components already do `Array.isArray(data) ? data : data.deals`, 
      // unwrapping it to an array here handles backwards compatibility gracefully).
      if (keys.length === 1 && Array.isArray(parsedData[keys[0]])) {
        return parsedData[keys[0]] as unknown as T
      }
    }
    
    return parsedData as T

  } catch (error) {
    if (method === 'GET') {
      console.warn(`[API Fallback] Inyectando Demo Data para: ${path}`)
      return getFallbackForPath(path) as T
    }
    // Auth Fallback when offline
    if (method === 'POST' && path.includes('/auth/login')) {
      console.warn('[API Fallback] Simulando Auth Token (Offline Mode)')
      return { 
        token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJkZW1vLWlkIiwiZW1haWwiOiJhZG1pbkBndWFyZGxpbmUuY29tIiwicm9sZSI6ImFkbWluIn0.xxx',
        user: { id: 'demo123', email: 'admin@guardline.com', role: 'admin', modules: [] }
      } as unknown as T
    }
    if (method === 'POST' && (path.includes('/api/sync/n8n') || path.includes('/api/webhooks/n8n') || path.includes('/api/ai/julio/meeting-intel'))) {
      console.warn('[API Fallback] Simulando execução n8n (Offline Mode)')
      return { success: true, ok: true } as unknown as T
    }
    throw error
  }
}

export const api = {
  get: <T = unknown>(path: string) => request<T>('GET', path),
  post: <T = unknown>(path: string, body?: unknown) => request<T>('POST', path, body),
  patch: <T = unknown>(path: string, body?: unknown) => request<T>('PATCH', path, body),
  del: <T = unknown>(path: string) => request<T>('DELETE', path),
}

// ── N8N HELPERS ───────────────────────────────────────────────────
export const N8N = {
  trigger: (path: string, payload: unknown) =>
    api.post(`/api/sync/n8n${path}`, payload),
  processLead: (leadId: string) =>
    api.post('/api/sync/n8n/wf06', { leadId }),
  processBatch: (leads: unknown[]) =>
    api.post('/api/sync/n8n/wf07', { leads }),
  signalRefresh: () =>
    api.post('/api/sync/n8n/wf08', {}),
  ingestReply: (data: unknown) =>
    api.post('/api/webhooks/n8n/wf07', data),
  ingestMeeting: (data: unknown) =>
    api.post('/api/ai/julio/meeting-intel', data),
}

export const LLM = {
  chat: async (messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>): Promise<string> => {
    const key = (import.meta.env.VITE_GROQ_API_KEY as string) || ''
    const model = (import.meta.env.VITE_GROQ_MODEL as string) || 'mixtral-8x7b-32768'
    if (!key) {
      const last = messages[messages.length - 1]?.content || ''
      return `Modo demo: Júlio AI analisou sua solicitação e vai atuar sobre pipeline, MEDDPICC, riscos e forecast. Pergunta: "${last}".`
    }
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${key}`,
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.2,
        top_p: 0.9,
      }),
    })
    if (!res.ok) {
      const err = await res.text().catch(() => '')
      throw new Error(err || `HTTP ${res.status}`)
    }
    const data = await res.json()
    const txt = data?.choices?.[0]?.message?.content || ''
    return txt
  },
}

export default api

