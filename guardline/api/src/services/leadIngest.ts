import type { SupabaseClient } from '@supabase/supabase-js';

type Json = Record<string, unknown>;

function str(v: unknown): string | undefined {
  if (v == null) return undefined;
  if (typeof v === 'string') return v;
  return String(v);
}

function num(v: unknown): number | undefined {
  if (v == null || v === '') return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

/**
 * Normaliza payloads típicos do n8n (WF06 / WF07) para colunas da tabela `leads` no Supabase.
 */
export function normalizeLeadRow(raw: Json): Json {
  const company =
    str(raw.company_name) ??
    str(raw.companyName) ??
    str(raw.account) ??
    str((raw.company as Json)?.name) ??
    undefined;
  const contact =
    str(raw.contact_name) ??
    str(raw.contactName) ??
    str(raw.contact) ??
    str(raw.full_name) ??
    str(raw.name) ??
    undefined;
  const email =
    str(raw.contact_email) ??
    str(raw.contactEmail) ??
    str(raw.email) ??
    undefined;
  const row: Json = {
    lead_id: str(raw.lead_id) ?? str(raw.leadId),
    company_name: company,
    contact_name: contact,
    contact_email: email,
    contact_title: str(raw.contact_title) ?? str(raw.contactTitle) ?? str(raw.title) ?? str(raw.jobTitle),
    company_domain: str(raw.company_domain) ?? str(raw.companyDomain) ?? str(raw.domain),
    company_industry: str(raw.company_industry) ?? str(raw.companyIndustry) ?? str(raw.industry),
    company_country: str(raw.company_country) ?? str(raw.companyCountry) ?? str(raw.country),
    primary_solution: str(raw.primary_solution) ?? str(raw.primarySolution) ?? str(raw.source),
    pipeline_stage: str(raw.pipeline_stage) ?? str(raw.pipelineStage) ?? str(raw.stage),
    lead_score: num(raw.lead_score) ?? num(raw.leadScore) ?? num(raw.score),
    lead_temperature: str(raw.lead_temperature) ?? str(raw.leadTemperature),
    account_tier: str(raw.account_tier) ?? str(raw.accountTier),
    market_priority: str(raw.market_priority) ?? str(raw.marketPriority),
    route: str(raw.route),
    owner_name: str(raw.owner_name) ?? str(raw.ownerName) ?? str(raw.owner),
    owner_email: str(raw.owner_email) ?? str(raw.ownerEmail),
    hubspot_owner_id: str(raw.hubspot_owner_id) ?? str(raw.hubspotOwnerId),
    language: str(raw.language),
    confidence: raw.confidence != null && raw.confidence !== '' ? Number(raw.confidence) : undefined,
    why_now: str(raw.why_now) ?? str(raw.whyNow),
    meddpicc_completion: num(raw.meddpicc_completion) ?? num(raw.meddpiccCompletion),
    meeting_status: str(raw.meeting_status) ?? str(raw.meetingStatus),
    reply_status: str(raw.reply_status) ?? str(raw.replyStatus),
    next_action: str(raw.next_action) ?? str(raw.nextAction),
    workflow_version: str(raw.workflow_version) ?? str(raw.workflowVersion),
    provider_used: str(raw.provider_used) ?? str(raw.providerUsed),
    meddpicc: typeof raw.meddpicc === 'object' && raw.meddpicc ? raw.meddpicc : undefined,
    signals: typeof raw.signals === 'object' && raw.signals ? raw.signals : undefined,
    research_pack: typeof raw.research_pack === 'object' ? raw.research_pack : undefined,
    execution_blueprint: typeof raw.execution_blueprint === 'object' ? raw.execution_blueprint : undefined,
    processed_at: str(raw.processed_at) ?? new Date().toISOString(),
  };
  Object.keys(row).forEach((k) => {
    if (row[k] === undefined) delete row[k];
  });
  return row;
}

/** Payload “PREPARE DASHBOARD” do WF06 (n8n → upsert em `leads`). */
export function wf06DashboardPayloadToRow(body: Json): Json {
  const email = str(body.email);
  const domain = str(body.domain);
  const lead_id = str(body.lead_id) ?? email ?? domain ?? `lead_${Date.now()}`;
  const row: Json = {
    lead_id,
    workflow_version: str(body.workflow_version) ?? 'v5.2',
    provider_used: str(body.provider_used) ?? '',
    route: str(body.route) ?? '',
    lead_score: num(body.lead_score) ?? 0,
    lead_temperature: str(body.lead_temperature) ?? '',
    account_tier: str(body.account_tier) ?? '',
    market_priority: str(body.market_priority) ?? '',
    contact_name: str(body.contact) ?? str(body.contact_name) ?? '',
    contact_email: email ?? '',
    contact_title: str(body.title) ?? str(body.contact_title) ?? '',
    company_name: str(body.account) ?? str(body.company_name) ?? '',
    company_domain: domain ?? str(body.company_domain) ?? '',
    company_industry: str(body.industry) ?? str(body.company_industry) ?? '',
    company_country: str(body.country) ?? str(body.company_country) ?? '',
    owner_name: str(body.owner) ?? str(body.owner_name) ?? '',
    owner_email: str(body.owner_email) ?? '',
    hubspot_owner_id: str(body.hubspot_owner_id) ?? '',
    language: str(body.language) ?? '',
    primary_solution: str(body.primary_solution) ?? '',
    confidence: body.confidence != null && body.confidence !== '' ? Number(body.confidence) : 0,
    why_now: str(body.why_now) ?? '',
    meddpicc:
      typeof body.meddpicc === 'object' && body.meddpicc
        ? (body.meddpicc as Json)
        : undefined,
    meddpicc_completion: num(body.meddpicc_completion) ?? 0,
    meeting_status: str(body.meeting_status) ?? 'none',
    reply_status: str(body.reply_status) ?? 'no_reply',
    next_action: str(body.next_action) ?? '',
    processed_at: str(body.processed_at) ?? new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  Object.keys(row).forEach((k) => {
    if (row[k] === undefined) delete row[k];
  });
  if (row.confidence === undefined) row.confidence = 0;
  return row;
}

export function extractLeadPayload(body: unknown): Json | null {
  if (!body || typeof body !== 'object') return null;
  const b = body as Json;
  if (b.lead && typeof b.lead === 'object') return b.lead as Json;
  if (b.body && typeof b.body === 'object') return b.body as Json;
  if (b.data && typeof b.data === 'object' && !Array.isArray(b.data)) return b.data as Json;
  return b;
}

export function extractLeadArray(body: unknown): Json[] {
  if (!body || typeof body !== 'object') return [];
  const b = body as Json;
  const arr =
    (Array.isArray(b.rows) && b.rows) ||
    (Array.isArray(b.leads) && b.leads) ||
    (Array.isArray(b.data) && b.data) ||
    (Array.isArray(b) && b) ||
    [];
  return arr.filter((x): x is Json => x != null && typeof x === 'object');
}

export async function insertLead(supabase: SupabaseClient, raw: Json) {
  const row = normalizeLeadRow(raw);
  if (!row.company_name && !row.contact_email) {
    return { error: 'Payload sem company_name nem contact_email' };
  }
  if (!row.lead_id) {
    row.lead_id =
      str(row.contact_email) ?? str(row.company_domain) ?? `lead_${Date.now()}`;
  }
  const { data, error } = await supabase.from('leads').insert(row).select('id').maybeSingle();
  if (error) return { error: error.message };
  return { id: data?.id };
}

export async function insertLeadsBatch(supabase: SupabaseClient, items: Json[]) {
  const rows = items.map(normalizeLeadRow).filter((r) => r.company_name || r.contact_email);
  for (const row of rows) {
    if (!row.lead_id) {
      row.lead_id = str(row.contact_email) ?? str(row.company_domain) ?? `lead_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    }
  }
  if (!rows.length) return { inserted: 0, error: 'Nenhuma linha válida' };
  const { data, error } = await supabase.from('leads').insert(rows).select('id');
  if (error) return { inserted: 0, error: error.message };
  return { inserted: data?.length ?? 0 };
}
