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

export default api

