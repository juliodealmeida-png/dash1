import type {
  AdminApproval,
  ApiOk,
  ApiResponse,
  AutomationLog,
  AutomationRecipe,
  Deal,
  Document,
  DocumentsStats,
  ForumMessage,
  FraudEvent,
  FraudStats,
  Integration,
  InvestorDeal,
  Lead,
  MetricsDashboard,
  MetricsSummary,
  PipelineStats,
  ReportSummary,
  Signal,
  User,
} from './types'

type Tokens = { accessToken: string; refreshToken: string }

const API_BASE = (import.meta as any).env?.VITE_API_BASE ?? ''
const DEMO_MODE = String((import.meta as any).env?.VITE_DEMO_MODE ?? '').toLowerCase() === 'true'

function joinUrl(base: string, path: string) {
  if (!base) return path
  return `${base.replace(/\/+$/, '')}${path.startsWith('/') ? '' : '/'}${path}`
}

function nowIso() {
  return new Date().toISOString()
}

function makeDemo<T>(data: T): ApiOk<T> {
  return { success: true, data }
}

function demoFor<T>(path: string): ApiOk<T> | null {
  const p = path.split('?')[0]

  if (p === '/api/auth/login') {
    return makeDemo({
      user: { id: 'u_demo', email: 'demo@guardline.ai', role: 'admin', modules: null },
      accessToken: 'demo_access',
      refreshToken: 'demo_refresh',
    } as any) as any
  }

  if (p === '/api/auth/refresh') {
    return makeDemo({
      accessToken: 'demo_access',
      user: { id: 'u_demo', email: 'demo@guardline.ai', role: 'admin', modules: null },
    } as any) as any
  }

  if (p === '/api/auth/me') {
    return makeDemo({ user: { id: 'u_demo', email: 'demo@guardline.ai', role: 'admin', modules: null } } as any) as any
  }

  if (p === '/api/metrics/dashboard') {
    return makeDemo({
      pipelineTotal: 420000,
      activeDeals: 18,
      atRiskDeals: 4,
      winRate: 32,
      forecast: { committed: 190000, bestCase: 260000 },
      criticalAlerts: 2,
      fraudToday: 1,
      leadsThisMonth: 64,
      healthScore: 74,
      coverageRatio: 1.12,
      recentSignals: [
        {
          id: 's1',
          type: 'risk_spike',
          severity: 'high',
          title: 'Risk score increased',
          message: 'Deal ACME showing staleness + low engagement.',
          read: false,
          createdAt: nowIso(),
          deal: { id: 'd1', companyName: 'ACME', value: 90000 },
        },
      ],
    } as any) as any
  }

  if (p === '/api/metrics/summary') {
    return makeDemo({
      pipelineTotal: 420000,
      activeDeals: 18,
      atRisk: 4,
      leadsTotal: 64,
      winRate: 32,
      forecastCommitted: 190000,
      alerts: 7,
      fraudEvents: 12,
      signals: 83,
      healthScore: 74,
    } as any) as any
  }

  if (p === '/api/reports/summary') {
    return makeDemo({
      deals: { total: 120, open: 18, won: 31, lost: 71, pipelineValue: 420000 },
      leads: { total: 640, thisWeek: 18 },
      winRate: 32,
      topStages: [
        { stage: 'Discovery', count: 6, value: 150000 },
        { stage: 'Proposal', count: 4, value: 120000 },
        { stage: 'Negotiation', count: 3, value: 90000 },
      ],
    } as any) as any
  }

  if (p === '/api/deals/stats/pipeline') {
    return makeDemo({
      byStage: [
        { stage: 'Prospecting', count: 5, valueSum: 80000, label: 'Prospecting' },
        { stage: 'Discovery', count: 6, valueSum: 150000, label: 'Discovery' },
        { stage: 'Proposal', count: 4, valueSum: 120000, label: 'Proposal' },
        { stage: 'Negotiation', count: 3, valueSum: 70000, label: 'Negotiation' },
      ],
      totals: { deals: 18, pipelineValue: 420000 },
    } as any) as any
  }

  if (p === '/api/deals') {
    return makeDemo([
      {
        id: 'd1',
        title: 'Expansion',
        companyName: 'ACME',
        value: 90000,
        stage: 'Discovery',
        probability: 35,
        riskScore: 62,
        createdAt: nowIso(),
        updatedAt: nowIso(),
        stageChangedAt: nowIso(),
        lastContactAt: nowIso(),
        daysInStage: 6,
        daysSinceContact: 2,
        forecastValue: 31500,
      },
      {
        id: 'd2',
        title: 'New Logo',
        companyName: 'Globex',
        value: 65000,
        stage: 'Proposal',
        probability: 55,
        riskScore: 41,
        createdAt: nowIso(),
        updatedAt: nowIso(),
        stageChangedAt: nowIso(),
        lastContactAt: nowIso(),
        daysInStage: 12,
        daysSinceContact: 4,
        forecastValue: 35750,
      },
    ] as any) as any
  }

  if (p.startsWith('/api/deals/') && (p.endsWith('/stage') || p.endsWith('/risk') || p.endsWith('/activities') || /^\/api\/deals\/[^/]+$/.test(p))) {
    return makeDemo({} as any) as any
  }

  if (p === '/api/leads') {
    return makeDemo([
      {
        id: 'l1',
        name: 'Maria Silva',
        email: 'maria@acme.com',
        company: 'ACME',
        status: 'new',
        score: 78,
        temperature: 'hot',
        source: 'hubspot',
        nextAction: 'Book meeting',
        intentSignals: JSON.stringify([{ type: 'pricing_page', at: nowIso() }]),
        createdAt: nowIso(),
        updatedAt: nowIso(),
      },
      {
        id: 'l2',
        name: 'John Doe',
        email: 'john@globex.com',
        company: 'Globex',
        status: 'contacted',
        score: 52,
        temperature: 'warm',
        source: 'inbound',
        nextAction: 'Send deck',
        intentSignals: JSON.stringify([]),
        createdAt: nowIso(),
        updatedAt: nowIso(),
      },
    ] as any) as any
  }

  if (p.startsWith('/api/leads/') && (p.endsWith('/enrich') || p.endsWith('/convert'))) {
    return makeDemo({} as any) as any
  }

  if (p === '/api/leads/import') {
    return makeDemo({ created: [], errors: [], count: 0 } as any) as any
  }

  if (p === '/api/signals') {
    return makeDemo([
      {
        id: 's1',
        type: 'risk_spike',
        severity: 'high',
        title: 'Risk score increased',
        message: 'Deal ACME showing staleness + low engagement.',
        read: false,
        createdAt: nowIso(),
        deal: { id: 'd1', companyName: 'ACME', value: 90000 },
      },
      {
        id: 's2',
        type: 'automation_error',
        severity: 'critical',
        title: 'Automation failed',
        message: 'WF07 failed to enrich leads.',
        read: false,
        createdAt: nowIso(),
        deal: null,
      },
    ] as any) as any
  }

  if (p.endsWith('/read') || p === '/api/signals/read-all') {
    return makeDemo({} as any) as any
  }

  if (p === '/api/automations/recipes') {
    return makeDemo([
      {
        id: 'ar1',
        name: 'Lead Enrichment',
        trigger: 'lead_created',
        actions: JSON.stringify([{ type: 'n8n', workflowId: 'wf07' }]),
        active: true,
        timesActivated: 12,
        lastActivated: nowIso(),
      },
    ] as any) as any
  }

  if (p === '/api/automations/logs') {
    return makeDemo([
      {
        id: 'al1',
        recipeId: 'ar1',
        status: 'success',
        createdAt: nowIso(),
        duration: 842,
        recipe: { id: 'ar1', name: 'Lead Enrichment' },
      },
    ] as any) as any
  }

  if (p === '/api/automations/trigger') {
    return makeDemo({ logId: 'al_demo', status: 'queued' } as any) as any
  }

  if (p === '/api/fraud/stats') {
    return makeDemo({
      total: 120,
      fraudToday: 1,
      bySeverity: [{ severity: 'high', count: 12 }],
      byStatus: [{ status: 'open', count: 15 }],
      amountTotal: 84500,
    } as any) as any
  }

  if (p === '/api/fraud') {
    return makeDemo([
      {
        id: 'f1',
        lat: 37.7749,
        lng: -122.4194,
        type: 'chargeback_spike',
        amount: 2500,
        currency: 'USD',
        severity: 'high',
        status: 'open',
        riskScore: 78,
        detectedAt: nowIso(),
        country: 'US',
        city: 'San Francisco',
      },
    ] as any) as any
  }

  if (p === '/api/investor/deals/kanban') {
    return makeDemo({
      stages: ['Target', 'Intro', 'Partner', 'Term Sheet'],
      columns: {
        Target: [{ id: 'i1', investorName: 'Alpha VC', type: 'Seed', stage: 'Target', status: 'active', probability: 10, createdAt: nowIso(), updatedAt: nowIso() }],
        Intro: [],
        Partner: [],
        'Term Sheet': [],
      },
    } as any) as any
  }

  if (p === '/api/investor/deals') {
    return makeDemo([] as any) as any
  }

  if (p === '/api/documents/stats') {
    return makeDemo({ total: 8, draft: 2, sent: 2, in_progress: 2, completed: 1, expired: 1, refused: 0 } as any) as any
  }

  if (p === '/api/documents') {
    return makeDemo([
      {
        id: 'doc1',
        title: 'MSA - ACME',
        status: 'in_progress',
        fileUrl: '#',
        signerOrder: 'sequential',
        createdAt: nowIso(),
        updatedAt: nowIso(),
        _count: { fields: 12, auditLog: 6 },
        signers: [{ id: 's1', name: 'Maria', email: 'maria@acme.com', role: 'signer', status: 'sent' }],
      },
    ] as any) as any
  }

  if (/^\/api\/documents\/[^/]+$/.test(p)) {
    return makeDemo({
      id: 'doc1',
      title: 'MSA - ACME',
      status: 'in_progress',
      fileUrl: '#',
      signerOrder: 'sequential',
      createdAt: nowIso(),
      updatedAt: nowIso(),
      signers: [{ id: 's1', name: 'Maria', email: 'maria@acme.com', role: 'signer', status: 'sent' }],
      fields: [],
      auditLog: [],
    } as any) as any
  }

  if (p === '/api/julio/brief/latest') {
    return makeDemo({ id: 'b1', date: nowIso(), type: 'daily', brief: JSON.stringify({ bullets: ['Priorize ACME (stale)', 'Rodar enrichment em leads warm', 'Checar fraude em US'], generated_at: nowIso() }) } as any) as any
  }

  if (p === '/api/julio/meddpicc-dashboard') {
    return makeDemo({ totals: { analyzed: 6, avgScore: 68 }, topGaps: ['Economic Buyer', 'Decision Criteria'] } as any) as any
  }

  if (p === '/api/integrations') {
    return makeDemo([{ id: 'int1', type: 'gmail', status: 'disconnected', createdAt: nowIso(), updatedAt: nowIso() }] as any) as any
  }

  if (p.startsWith('/api/integrations/')) {
    return makeDemo({ ok: true } as any) as any
  }

  if (p.startsWith('/api/connectors/')) {
    return makeDemo({ ok: true } as any) as any
  }

  if (p.startsWith('/api/tools/')) {
    return makeDemo({ ok: true, demo: true } as any) as any
  }

  if (p === '/api/forum') {
    return makeDemo([] as any) as any
  }
  if (p.startsWith('/api/forum/')) {
    return makeDemo({ id: p.split('/').pop() } as any) as any
  }

  if (p === '/api/wf-executions') {
    return makeDemo([] as any) as any
  }

  if (p === '/api/meetings') {
    return makeDemo([] as any) as any
  }

  if (p === '/api/campaigns/stats') return makeDemo({} as any) as any
  if (p === '/api/campaigns') return makeDemo([] as any) as any

  if (p === '/api/accounts') return makeDemo([] as any) as any
  if (p === '/api/contacts') return makeDemo([] as any) as any
  if (p.startsWith('/api/contacts/')) return makeDemo({} as any) as any

  if (p === '/api/profile') return makeDemo({} as any) as any

  if (p === '/api/admin/users') return makeDemo([] as any) as any
  if (p.startsWith('/api/admin/users/') && p.endsWith('/modules')) return makeDemo({} as any) as any
  if (p === '/api/admin/approvals') return makeDemo([] as any) as any
  if (p.includes('/approve') || p.includes('/reject')) return makeDemo({} as any) as any

  return null
}

async function request<T>(
  path: string,
  init: RequestInit & { token?: string } = {},
): Promise<ApiOk<T>> {
  const url = joinUrl(API_BASE, path)
  const headers = new Headers(init.headers)
  headers.set('Accept', 'application/json')
  if (!headers.has('Content-Type') && init.body) headers.set('Content-Type', 'application/json')
  if (init.token) headers.set('Authorization', `Bearer ${init.token}`)

  const demo = demoFor<T>(path)
  if (DEMO_MODE && demo) return demo

  let res: Response
  let text = ''
  let json: ApiResponse<T> | null = null
  try {
    res = await fetch(url, { ...init, headers })
    text = await res.text()
    try {
      json = (text ? (JSON.parse(text) as ApiResponse<T>) : null) as ApiResponse<T> | null
    } catch {
      json = null
    }
  } catch {
    if (demo) return demo
    throw new Error('Não foi possível conectar ao backend (localhost:3001)')
  }

  if (!res.ok) {
    if (demo && res.status >= 500) return demo
    const msg = json && 'success' in json && !json.success ? json.error : `${res.status} ${res.statusText}`
    throw new Error(msg)
  }

  if (!json || !('success' in json)) throw new Error('Resposta inválida do servidor')
  if (!json.success) throw new Error(json.error || 'Erro desconhecido')
  return json
}

export const api = {
  auth: {
    async login(email: string, password: string): Promise<{ user: User } & Tokens> {
      const { data } = await request<{ user: User } & Tokens>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      })
      return data
    },
    async refresh(refreshToken: string): Promise<{ user: User; accessToken: string }> {
      const { data } = await request<{ user: User; accessToken: string }>('/api/auth/refresh', {
        method: 'POST',
        body: JSON.stringify({ refreshToken }),
      })
      return data
    },
    async me(token: string): Promise<User> {
      const { data } = await request<{ user: User }>('/api/auth/me', { token })
      return data.user
    },
  },

  metrics: {
    dashboard(token: string) {
      return request<MetricsDashboard>('/api/metrics/dashboard', { token }).then(r => r.data)
    },
    summary(token: string) {
      return request<MetricsSummary>('/api/metrics/summary', { token }).then(r => r.data)
    },
  },

  reports: {
    summary(token: string) {
      return request<ReportSummary>('/api/reports/summary', { token }).then(r => r.data)
    },
  },

  deals: {
    list(token: string, params: Record<string, string | number | boolean | undefined> = {}) {
      const qs = new URLSearchParams()
      Object.entries(params).forEach(([k, v]) => {
        if (v === undefined || v === null || v === '') return
        qs.set(k, String(v))
      })
      const path = qs.toString() ? `/api/deals?${qs}` : '/api/deals'
      return request<Deal[]>(path, { token }).then(r => r.data)
    },
    get(token: string, id: string) {
      return request<Deal>(`/api/deals/${id}`, { token }).then(r => r.data)
    },
    pipelineStats(token: string) {
      return request<PipelineStats>('/api/deals/stats/pipeline', { token }).then(r => r.data)
    },
    setStage(token: string, id: string, stage: string) {
      return request<Deal>(`/api/deals/${id}/stage`, {
        method: 'PATCH',
        token,
        body: JSON.stringify({ stage }),
      }).then(r => r.data)
    },
    setRisk(token: string, id: string) {
      return request<{ deal: Deal; risk: { score: number; level: string; reasons: string[] } }>(
        `/api/deals/${id}/risk`,
        { method: 'PATCH', token },
      ).then(r => r.data)
    },
    activities(token: string, id: string) {
      return request<any[]>(`/api/deals/${id}/activities`, { token }).then(r => r.data)
    },
    addActivity(token: string, id: string, payload: Record<string, unknown>) {
      return request<any>(`/api/deals/${id}/activities`, {
        method: 'POST',
        token,
        body: JSON.stringify(payload),
      }).then(r => r.data)
    },
  },

  leads: {
    list(token: string, params: Record<string, string | number | boolean | undefined> = {}) {
      const qs = new URLSearchParams()
      Object.entries(params).forEach(([k, v]) => {
        if (v === undefined || v === null || v === '') return
        qs.set(k, String(v))
      })
      const path = qs.toString() ? `/api/leads?${qs}` : '/api/leads'
      return request<Lead[]>(path, { token }).then(r => r.data)
    },
    create(token: string, payload: Partial<Lead>) {
      return request<Lead>('/api/leads', { method: 'POST', token, body: JSON.stringify(payload) }).then(r => r.data)
    },
    enrich(token: string, id: string) {
      return request<Lead>(`/api/leads/${id}/enrich`, { method: 'POST', token }).then(r => r.data)
    },
    convert(token: string, id: string, dealPayload: Record<string, unknown>) {
      return request<{ deal: Deal; leadId: string }>(`/api/leads/${id}/convert`, {
        method: 'PATCH',
        token,
        body: JSON.stringify(dealPayload),
      }).then(r => r.data)
    },
    importCsv(token: string, csvText: string) {
      return request<{ created: Lead[]; errors: Array<{ line: number; error: string }>; count: number }>(
        '/api/leads/import',
        { method: 'POST', token, body: JSON.stringify({ csv: csvText }) },
      ).then(r => r.data)
    },
  },

  signals: {
    list(token: string, take = 50, unread?: boolean) {
      const qs = new URLSearchParams()
      qs.set('take', String(take))
      if (unread !== undefined) qs.set('unread', String(unread))
      return request<Signal[]>(`/api/signals?${qs}`, { token }).then(r => r.data)
    },
    read(token: string, id: string) {
      return request<{ id: string; read: true }>(`/api/signals/${id}/read`, { method: 'PATCH', token }).then(r => r.data)
    },
    readAll(token: string) {
      return request<{ updated: number }>('/api/signals/read-all', { method: 'PATCH', token }).then(r => r.data)
    },
  },

  automations: {
    recipes(token: string) {
      return request<AutomationRecipe[]>('/api/automations/recipes', { token }).then(r => r.data)
    },
    logs(token: string, take = 100) {
      return request<AutomationLog[]>(`/api/automations/logs?take=${take}`, { token }).then(r => r.data)
    },
    trigger(
      token: string,
      payload: { recipeId: string; dealId?: string; leadId?: string; payload?: unknown; source?: string },
    ) {
      return request<{ logId: string; status: string }>('/api/automations/trigger', {
        method: 'POST',
        token,
        body: JSON.stringify(payload),
      }).then(r => r.data)
    },
  },

  fraud: {
    list(token: string, params: Record<string, string | number | undefined> = {}) {
      const qs = new URLSearchParams()
      Object.entries(params).forEach(([k, v]) => {
        if (v === undefined || v === null || v === '') return
        qs.set(k, String(v))
      })
      const path = qs.toString() ? `/api/fraud?${qs}` : '/api/fraud'
      return request<FraudEvent[]>(path, { token }).then(r => r.data)
    },
    stats(token: string) {
      return request<FraudStats>('/api/fraud/stats', { token }).then(r => r.data)
    },
  },

  investor: {
    deals(token: string, params: Record<string, string | number | undefined> = {}) {
      const qs = new URLSearchParams()
      Object.entries(params).forEach(([k, v]) => {
        if (v === undefined || v === null || v === '') return
        qs.set(k, String(v))
      })
      const path = qs.toString() ? `/api/investor/deals?${qs}` : '/api/investor/deals'
      return request<InvestorDeal[]>(path, { token }).then(r => r.data)
    },
    kanban(token: string) {
      return request<{ stages: string[]; columns: Record<string, InvestorDeal[]> }>('/api/investor/deals/kanban', { token }).then(r => r.data)
    },
  },

  documents: {
    list(token: string, params: Record<string, string | number | undefined> = {}) {
      const qs = new URLSearchParams()
      Object.entries(params).forEach(([k, v]) => {
        if (v === undefined || v === null || v === '') return
        qs.set(k, String(v))
      })
      const path = qs.toString() ? `/api/documents?${qs}` : '/api/documents'
      return request<Document[]>(path, { token }).then(r => r.data)
    },
    get(token: string, id: string) {
      return request<Document>(`/api/documents/${id}`, { token }).then(r => r.data)
    },
    stats(token: string) {
      return request<DocumentsStats>('/api/documents/stats', { token }).then(r => r.data)
    },
  },

  julio: {
    briefLatest(token: string) {
      return request<any>('/api/julio/brief/latest', { token }).then(r => r.data)
    },
    async chatStream(token: string, message: string, onToken: (chunk: string) => void) {
      const url = joinUrl(API_BASE, '/api/julio/chat')
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ message }),
      })
      if (!res.ok || !res.body) throw new Error(`${res.status} ${res.statusText}`)
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buf = ''
      for (;;) {
        const { value, done } = await reader.read()
        if (done) break
        buf += decoder.decode(value, { stream: true })
        for (;;) {
          const idx = buf.indexOf('\n\n')
          if (idx === -1) break
          const evt = buf.slice(0, idx)
          buf = buf.slice(idx + 2)
          const lines = evt.split('\n')
          const dataLine = lines.find(l => l.startsWith('data:'))
          if (!dataLine) continue
          const payload = dataLine.replace(/^data:\s*/, '')
          try {
            const obj = JSON.parse(payload) as any
            if (obj?.text) onToken(String(obj.text))
          } catch {
            onToken(payload)
          }
        }
      }
    },
    chatSync(token: string, message: string) {
      return request<any>('/api/julio/chat/sync', { method: 'POST', token, body: JSON.stringify({ message }) }).then(r => r.data)
    },
    meddPiccDashboard(token: string) {
      return request<any>('/api/julio/meddpicc-dashboard', { token }).then(r => r.data)
    },
  },

  admin: {
    users(token: string) {
      return request<User[]>('/api/admin/users', { token }).then(r => r.data)
    },
    updateUserModules(token: string, id: string, modules: string[] | null) {
      return request<User>(`/api/admin/users/${id}/modules`, {
        method: 'PATCH',
        token,
        body: JSON.stringify({ modules }),
      }).then(r => r.data)
    },
    approvals(token: string) {
      return request<AdminApproval[]>('/api/admin/approvals', { token }).then(r => r.data)
    },
    approve(token: string, id: string, code: string) {
      return request<any>(`/api/admin/approvals/${id}/approve`, {
        method: 'POST',
        token,
        body: JSON.stringify({ code }),
      }).then(r => r.data)
    },
    reject(token: string, id: string) {
      return request<any>(`/api/admin/approvals/${id}/reject`, { method: 'POST', token }).then(r => r.data)
    },
  },

  profile: {
    get(token: string) {
      return request<any>('/api/profile', { token }).then(r => r.data)
    },
    upsert(token: string, payload: Record<string, unknown>) {
      return request<any>('/api/profile', { method: 'PUT', token, body: JSON.stringify(payload) }).then(r => r.data)
    },
  },

  integrations: {
    list(token: string) {
      return request<Integration[]>('/api/integrations', { token }).then(r => r.data)
    },
    gmailAuth(token: string) {
      return request<{ url: string }>('/api/integrations/gmail/auth', { token }).then(r => r.data)
    },
    gmailSync(token: string) {
      return request<any>('/api/integrations/gmail/sync', { method: 'POST', token }).then(r => r.data)
    },
    slackConnect(token: string, payload: { webhookUrl: string }) {
      return request<any>('/api/integrations/slack/connect', { method: 'POST', token, body: JSON.stringify(payload) }).then(r => r.data)
    },
    slackTest(token: string) {
      return request<any>('/api/integrations/slack/test', { method: 'POST', token }).then(r => r.data)
    },
    hubspotConnect(token: string, payload: { accessToken: string }) {
      return request<any>('/api/integrations/hubspot/connect', { method: 'POST', token, body: JSON.stringify(payload) }).then(r => r.data)
    },
    hubspotSync(token: string) {
      return request<any>('/api/integrations/hubspot/sync', { method: 'POST', token }).then(r => r.data)
    },
    disconnect(token: string, type: string) {
      return request<any>(`/api/integrations/${type}`, { method: 'DELETE', token }).then(r => r.data)
    },
  },

  connectors: {
    credentialsForN8n() {
      return request<any>('/api/connectors/credentials').then(r => r.data)
    },
    save(token: string, type: string, payload: Record<string, unknown>) {
      return request<any>(`/api/connectors/${type}`, { method: 'POST', token, body: JSON.stringify(payload) }).then(r => r.data)
    },
    disconnect(token: string, type: string) {
      return request<any>(`/api/connectors/${type}`, { method: 'DELETE', token }).then(r => r.data)
    },
  },

  tools: {
    weather(token: string, q: string) {
      return request<any>(`/api/tools/weather?q=${encodeURIComponent(q)}`, { token }).then(r => r.data)
    },
    forex(token: string, base = 'USD') {
      return request<any>(`/api/tools/forex?base=${encodeURIComponent(base)}`, { token }).then(r => r.data)
    },
    news(token: string, q: string) {
      return request<any>(`/api/tools/news?q=${encodeURIComponent(q)}`, { token }).then(r => r.data)
    },
    createDoc(token: string, payload: { title: string; markdown: string }) {
      return request<any>('/api/tools/doc', { method: 'POST', token, body: JSON.stringify(payload) }).then(r => r.data)
    },
    createImage(token: string, payload: { prompt: string }) {
      return request<any>('/api/tools/image', { method: 'POST', token, body: JSON.stringify(payload) }).then(r => r.data)
    },
  },

  forum: {
    list(token: string) {
      return request<ForumMessage[]>('/api/forum', { token }).then(r => r.data)
    },
    create(token: string, text: string) {
      return request<ForumMessage>('/api/forum', { method: 'POST', token, body: JSON.stringify({ text }) }).then(r => r.data)
    },
    remove(token: string, id: string) {
      return request<{ id: string }>('/api/forum/' + id, { method: 'DELETE', token }).then(r => r.data)
    },
  },

  meetings: {
    list(token: string) {
      return request<any[]>('/api/meetings', { token }).then(r => r.data)
    },
    create(token: string, payload: Record<string, unknown>) {
      return request<any>('/api/meetings', { method: 'POST', token, body: JSON.stringify(payload) }).then(r => r.data)
    },
  },

  campaigns: {
    stats(token: string) {
      return request<any>('/api/campaigns/stats', { token }).then(r => r.data)
    },
    list(token: string, params: Record<string, string | number | undefined> = {}) {
      const qs = new URLSearchParams()
      Object.entries(params).forEach(([k, v]) => {
        if (v === undefined || v === null || v === '') return
        qs.set(k, String(v))
      })
      const path = qs.toString() ? `/api/campaigns?${qs}` : '/api/campaigns'
      return request<any[]>(path, { token }).then(r => r.data)
    },
  },

  wfExecutions: {
    list(token: string) {
      return request<any[]>('/api/wf-executions', { token }).then(r => r.data)
    },
  },

  accounts: {
    list(token: string) {
      return request<any[]>('/api/accounts', { token }).then(r => r.data)
    },
  },

  contacts: {
    list(token: string) {
      return request<any[]>('/api/contacts', { token }).then(r => r.data)
    },
    get(token: string, id: string) {
      return request<any>(`/api/contacts/${id}`, { token }).then(r => r.data)
    },
  },
}

export type { Tokens }
