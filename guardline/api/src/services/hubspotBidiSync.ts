/**
 * HubSpot Bidirectional Sync Service
 * Handles real-time sync for Deals and Contacts between Supabase ↔ HubSpot
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Env } from '../config/env.js';

const HS_API = 'https://api.hubapi.com';

async function hsRequest(env: Env, method: string, path: string, body?: unknown) {
  const res = await fetch(`${HS_API}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${env.HUBSPOT_PAT}`,
      'Content-Type': 'application/json',
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`HubSpot ${method} ${path} failed (${res.status}): ${text.slice(0, 200)}`);
  }
  return res.json();
}

/* ═══════════════════════════════════════════════════════════
   OUTBOUND: Supabase → HubSpot (push changes)
   ═══════════════════════════════════════════════════════════ */

export async function pushDealToHubSpot(env: Env, deal: Record<string, unknown>) {
  const hsId = deal.hubspot_deal_id as string | undefined;
  const props: Record<string, string> = {};
  if (deal.deal_name) props.dealname = String(deal.deal_name);
  if (deal.deal_stage) props.dealstage = String(deal.deal_stage);
  if (deal.deal_amount != null) props.amount = String(deal.deal_amount);
  if (deal.deal_close_date) props.closedate = String(deal.deal_close_date);
  if (deal.hubspot_owner_id) props.hubspot_owner_id = String(deal.hubspot_owner_id);

  if (hsId) {
    return hsRequest(env, 'PATCH', `/crm/v3/objects/deals/${hsId}`, { properties: props });
  }
  return hsRequest(env, 'POST', '/crm/v3/objects/deals', { properties: props });
}

export async function pushContactToHubSpot(env: Env, contact: Record<string, unknown>) {
  const hsId = contact.hubspot_contact_id as string | undefined;
  const props: Record<string, string> = {};
  if (contact.email) props.email = String(contact.email);
  if (contact.first_name || contact.company_name) props.firstname = String(contact.first_name || contact.company_name);
  if (contact.last_name) props.lastname = String(contact.last_name);
  if (contact.phone) props.phone = String(contact.phone);
  if (contact.company_name) props.company = String(contact.company_name);

  if (hsId) {
    return hsRequest(env, 'PATCH', `/crm/v3/objects/contacts/${hsId}`, { properties: props });
  }
  return hsRequest(env, 'POST', '/crm/v3/objects/contacts', { properties: props });
}

/* ═══════════════════════════════════════════════════════════
   INBOUND: HubSpot → Supabase (webhook events for Contacts)
   ═══════════════════════════════════════════════════════════ */

export async function syncContactFromHubSpot(env: Env, supabase: SupabaseClient, contactId: string) {
  const hs = await hsRequest(env, 'GET', `/crm/v3/objects/contacts/${contactId}?properties=email,firstname,lastname,phone,company,lifecyclestage,hubspot_owner_id`);
  const p = hs.properties || {};
  const row = {
    hubspot_contact_id: String(hs.id),
    email: p.email ?? null,
    company_name: p.company ?? p.firstname ?? null,
    first_name: p.firstname ?? null,
    last_name: p.lastname ?? null,
    phone: p.phone ?? null,
    lifecycle_stage: p.lifecyclestage ?? null,
    hubspot_owner_id: p.hubspot_owner_id ?? null,
    source: 'hubspot_webhook',
    updated_at: new Date().toISOString(),
  };
  const { error } = await supabase.from('leads').upsert(row, { onConflict: 'hubspot_contact_id' });
  if (error) throw new Error(`Supabase upsert contact failed: ${error.message}`);
  return row;
}

/* ═══════════════════════════════════════════════════════════
   FULL SYNC: Pull all recent from HubSpot (batch)
   ═══════════════════════════════════════════════════════════ */

export async function fullSyncDeals(env: Env, supabase: SupabaseClient, limit = 100) {
  const data = await hsRequest(env, 'GET', `/crm/v3/objects/deals?limit=${limit}&properties=dealname,dealstage,amount,closedate,pipeline,hubspot_owner_id,hs_probability`);
  const results = (data.results || []) as Array<{ id: string; properties: Record<string, string> }>;
  const now = new Date().toISOString();
  const rows = results.map((d) => ({
    hubspot_deal_id: String(d.id),
    deal_name: d.properties.dealname ?? null,
    deal_stage: d.properties.dealstage ?? null,
    deal_amount: Number(d.properties.amount || 0),
    deal_probability: Math.round(Math.min(100, Math.max(0, Number(d.properties.hs_probability || 0)))),
    deal_close_date: d.properties.closedate ?? null,
    pipeline_id: d.properties.pipeline ?? null,
    hubspot_owner_id: d.properties.hubspot_owner_id ?? null,
    source: 'hubspot_sync' as const,
    updated_at: now,
  }));
  if (rows.length) {
    const { error } = await supabase.from('deals').upsert(rows, { onConflict: 'hubspot_deal_id' });
    if (error) throw new Error(`Bulk deal sync failed: ${error.message}`);
  }
  return { synced: rows.length };
}

export async function fullSyncContacts(env: Env, supabase: SupabaseClient, limit = 100) {
  const data = await hsRequest(env, 'GET', `/crm/v3/objects/contacts?limit=${limit}&properties=email,firstname,lastname,phone,company,lifecyclestage,hubspot_owner_id`);
  const results = (data.results || []) as Array<{ id: string; properties: Record<string, string> }>;
  const now = new Date().toISOString();
  const rows = results.map((c) => ({
    hubspot_contact_id: String(c.id),
    email: c.properties.email ?? null,
    company_name: c.properties.company ?? null,
    first_name: c.properties.firstname ?? null,
    last_name: c.properties.lastname ?? null,
    phone: c.properties.phone ?? null,
    lifecycle_stage: c.properties.lifecyclestage ?? null,
    hubspot_owner_id: c.properties.hubspot_owner_id ?? null,
    source: 'hubspot_sync' as const,
    updated_at: now,
  }));
  if (rows.length) {
    const { error } = await supabase.from('leads').upsert(rows, { onConflict: 'hubspot_contact_id' });
    if (error) throw new Error(`Bulk contact sync failed: ${error.message}`);
  }
  return { synced: rows.length };
}
