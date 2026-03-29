import { Router } from 'express';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Env } from '../config/env.js';
import { n8nWebhook } from '../services/n8nClient.js';
import { normalizeLeadRow } from '../services/leadIngest.js';

function str(v: unknown): string | undefined {
  if (v == null) return undefined;
  if (typeof v === 'string') return v;
  return String(v);
}

export function leadsRoutes(env: Env, supabase: SupabaseClient) {
  const r = Router();

  r.get('/', async (req, res) => {
    const owner = str(req.query.owner);
    const temperature = str(req.query.temperature);
    const route = str(req.query.route);
    const search = str(req.query.search);
    const limit = Math.min(Number(req.query.limit ?? 50) || 50, 200);
    const offset = Number(req.query.offset ?? 0) || 0;

    let query = supabase
      .from('leads')
      .select('*', { count: 'exact' })
      .order('lead_score', { ascending: false });
    if (owner) query = query.eq('owner_name', owner);
    if (temperature) query = query.eq('lead_temperature', temperature);
    if (route) query = query.eq('route', route);
    if (search) query = query.ilike('company_name', `%${search}%`);
    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;
    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }
    res.json({ leads: data ?? [], count });
  });

  r.post('/batch', async (req, res) => {
    const out = await n8nWebhook.triggerBatchIntake(env, req.body ?? {});
    res.status(out.ok ? 200 : 502).json({ ok: out.ok, wf07_response: out.ok ? out.data : out });
  });

  r.post('/signal-refresh', async (req, res) => {
    const out = await n8nWebhook.triggerSignalRefresh(env, req.body ?? {});
    res.status(out.ok ? 200 : 502).json({ ok: out.ok, wf07_response: out.ok ? out.data : out });
  });

  r.get('/:id', async (req, res) => {
    const { data, error } = await supabase.from('leads').select('*').eq('id', req.params.id).maybeSingle();
    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }
    if (!data) {
      res.status(404).json({ error: 'not found' });
      return;
    }
    res.json(data);
  });

  r.post('/', async (req, res) => {
    const payload = (req.body && typeof req.body === 'object' ? req.body : {}) as Record<
      string,
      unknown
    >;
    n8nWebhook.triggerWF06(env, payload).catch((e) => console.error('triggerWF06', e));

    const row = normalizeLeadRow(payload);
    row.lead_id =
      str(payload.email) ??
      str(payload.company_domain) ??
      str(payload.domain) ??
      `lead_${Date.now()}`;
    row.company_name = row.company_name ?? str(payload.company_name) ?? str(payload.account);
    row.company_domain = row.company_domain ?? str(payload.company_domain) ?? str(payload.domain);
    row.contact_name =
      row.contact_name ?? str(payload.full_name) ?? str(payload.contact) ?? str(payload.first_name);
    row.contact_email = row.contact_email ?? str(payload.email);
    row.contact_title = row.contact_title ?? str(payload.title);
    row.company_industry = row.company_industry ?? str(payload.industry);
    row.company_country = row.company_country ?? str(payload.country);
    row.route = 'processing';
    row.lead_score = 0;
    row.processed_at = new Date().toISOString();

    const { data, error } = await supabase.from('leads').insert(row).select().single();
    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }
    res.status(201).json({ ok: true, id: data?.id, status: 'processing_in_wf06' });
  });

  r.patch('/:id', async (req, res) => {
    const patch = { ...(req.body as object), updated_at: new Date().toISOString() };
    const { data, error } = await supabase
      .from('leads')
      .update(patch)
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }
    if (!data) {
      res.status(404).json({ error: 'not found' });
      return;
    }

    const body = req.body as Record<string, unknown>;
    if (body.reply_text) {
      n8nWebhook
        .triggerReplyIntake(env, {
          company_name: data.company_name,
          company_domain: data.company_domain,
          email: data.contact_email,
          reply_text: body.reply_text,
          reply_channel: str(body.reply_channel) ?? 'email',
        })
        .catch((e) => console.error('triggerReplyIntake', e));
    }

    res.json(data);
  });

  r.post('/:id/trigger-wf06', async (req, res) => {
    const { data: lead, error } = await supabase.from('leads').select('*').eq('id', req.params.id).maybeSingle();
    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }
    if (!lead) {
      res.status(404).json({ error: 'not found' });
      return;
    }
    const out = await n8nWebhook.triggerWF06(env, {
      company_name: lead.company_name,
      company_domain: lead.company_domain,
      email: lead.contact_email,
      title: lead.contact_title,
      industry: lead.company_industry,
      country: lead.company_country,
      ...((req.body && typeof req.body === 'object' ? req.body : {}) as object),
    });
    res.status(out.ok ? 200 : 502).json({ ok: out.ok, triggered: 'wf06', n8n: out });
  });

  return r;
}
