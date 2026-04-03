export type ApiOk<T> = { success: true; data: T; meta?: Record<string, unknown> }
export type ApiErr = { success: false; error: string; code?: string; details?: unknown }
export type ApiResponse<T> = ApiOk<T> | ApiErr

export type User = {
  id: string
  email: string
  name?: string
  company?: string
  role: string
  avatar?: string | null
  modules?: string[] | null
}

export type Deal = {
  id: string
  title: string
  companyName: string
  value: number
  stage: string
  probability: number
  riskScore: number
  source?: string | null
  forecastCategory?: string | null
  createdAt: string
  updatedAt: string
  lastContactAt?: string | null
  stageChangedAt?: string | null
  daysSinceContact?: number | null
  daysInStage?: number | null
  forecastValue?: number | null
}

export type Lead = {
  id: string
  name: string
  email?: string | null
  phone?: string | null
  company?: string | null
  jobTitle?: string | null
  status: string
  score: number
  temperature?: string | null
  source?: string | null
  ownerId?: string | null
  notes?: string | null
  tags?: string | null
  nextAction?: string | null
  lastContactAt?: string | null
  lastActivity?: string | null
  createdAt: string
  updatedAt: string
  convertedDealId?: string | null
  scoreBreakdown?: string | null
  intentSignals?: string | null
  timeline?: string | null
  news?: string | null
  linkedinPosts?: string | null
  companyWebsite?: string | null
  companyIndustry?: string | null
  companySize?: string | null
  companyCountry?: string | null
  companyLinkedin?: string | null
  contactLinkedin?: string | null
  replyStatus?: string | null
  meetingStatus?: string | null
  meddpiccScore?: number | null
  route?: string | null
}

export type Signal = {
  id: string
  type: string
  severity: string
  title: string
  message: string
  metadata?: string | null
  read: boolean
  createdAt: string
  deal?: { id: string; companyName: string; value: number } | null
}

export type AutomationRecipe = {
  id: string
  name: string
  description?: string | null
  trigger: string
  actions: string
  config?: string | null
  active: boolean
  n8nWorkflowId?: string | null
  timesActivated: number
  lastActivated?: string | null
}

export type AutomationLog = {
  id: string
  recipeId: string
  dealId?: string | null
  status: string
  result?: string | null
  errorMessage?: string | null
  duration?: number | null
  createdAt: string
  recipe?: { id: string; name: string } | null
  deal?: { id: string; title: string; companyName: string } | null
}

export type FraudEvent = {
  id: string
  lat: number
  lng: number
  type: string
  amount: number
  currency: string
  severity: string
  status: string
  riskScore: number
  detectedAt: string
  resolvedAt?: string | null
  city?: string | null
  country?: string | null
  sourceIp?: string | null
  merchantName?: string | null
  notes?: string | null
}

export type InvestorDeal = {
  id: string
  investorName: string
  firm?: string | null
  type: string
  ticketMin?: number | null
  ticketMax?: number | null
  stage: string
  status: string
  probability: number
  lastContactAt?: string | null
  nextMeeting?: string | null
  createdAt: string
  updatedAt: string
}

export type DocumentSigner = {
  id: string
  name: string
  email: string
  role: string
  status: string
  color?: string | null
  signedAt?: string | null
}

export type DocumentField = {
  id: string
  type: string
  label: string
  required: boolean
  page: number
  x: number
  y: number
  w: number
  h: number
  value?: string | null
  signerId?: string | null
}

export type DocumentAudit = {
  id: string
  action: string
  actorName?: string | null
  actorEmail?: string | null
  ip?: string | null
  userAgent?: string | null
  createdAt: string
  metadata?: string | null
}

export type Document = {
  id: string
  title: string
  status: string
  fileUrl: string
  finalFileUrl?: string | null
  expiresAt?: string | null
  completedAt?: string | null
  signerOrder: string
  createdAt: string
  updatedAt: string
  signers?: DocumentSigner[]
  fields?: DocumentField[]
  auditLog?: DocumentAudit[]
  _count?: { fields: number; auditLog: number }
}

export type MetricsDashboard = {
  pipelineTotal: number
  activeDeals: number
  atRiskDeals: number
  winRate: number
  forecast: { committed: number; bestCase: number }
  criticalAlerts: number
  fraudToday: number
  leadsThisMonth: number
  healthScore: number
  coverageRatio: number
  recentSignals: Signal[]
}

export type MetricsSummary = {
  pipelineTotal: number
  activeDeals: number
  atRisk: number
  leadsTotal: number
  winRate: number
  forecastCommitted: number
  alerts: number
  fraudEvents: number
  signals: number
  healthScore: number
}

export type PipelineStats = {
  byStage: Array<{ stage: string; count: number; valueSum: number; label?: string }>
  totals: { deals: number; pipelineValue: number }
}

export type ReportSummary = {
  deals: { total: number; open: number; won: number; lost: number; pipelineValue: number }
  leads: { total: number; thisWeek: number }
  winRate: number
  topStages: Array<{ stage: string; count: number; value: number }>
}

export type FraudStats = {
  total: number
  fraudToday: number
  bySeverity: Array<{ severity: string; count: number }>
  byStatus: Array<{ status: string; count: number }>
  amountTotal: number
}

export type DocumentsStats = {
  total: number
  draft: number
  sent: number
  in_progress: number
  completed: number
  expired: number
  refused: number
}

export type Integration = {
  id: string
  type: string
  status: string
  lastSyncAt?: string | null
  errorMessage?: string | null
  metadata?: string | null
  createdAt: string
  updatedAt: string
}

export type AdminApproval = {
  id: string
  userId: string
  type: string
  status: string
  payload: string
  createdAt: string
  decidedAt?: string | null
  decidedById?: string | null
  decisionReason?: string | null
  user?: { id: string; email: string; name?: string | null } | null
  decidedBy?: { id: string; email: string; name?: string | null } | null
}

export type ForumMessage = {
  id: string
  text: string
  createdAt: string
  userId: string
  user?: { id: string; name?: string | null; email: string } | null
}
