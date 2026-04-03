import { Router, type Request, type Response, type NextFunction } from 'express';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Env } from '../config/env.js';
import { verifyAnySecret } from '../middleware/guardlineSecret.js';
import { sseBroadcast } from '../lib/sseHub.js';
import {
  extractLeadArray,
  extractLeadPayload,
  insertLead,
  insertLeadsBatch,
} from '../services/leadIngest.js';
import { geocodeSignal } from '../services/geocoder.js';

type Json = Record<string, unknown>;

function str(v: unknown): string | undefined {
  if (v == null) return undefined;
  if (typeof v === 'string') return v;
  return String(v);
}

function emitN8n(topic: string, payload: unknown) {
  sseBroadcast({
    source: 'n8n_webhook',
    topic,
    at: new Date().toISOString(),
    payload,
  });
}

export function webhooksN8nRoutes(env: Env, supabase: SupabaseClient) {
  const r = Router();

  const gate = (req: Request, res: Response, next: NextFunction) => {
    if (!verifyAnySecret(req, env.N8N_WEBHOOK_SECRET, env.DASHBOARD_WEBHOOK_SECRET)) {
      res.status(401).json({ ok: false, error: 'Unauthorized' });
      return;
    }
    next();
  };

  /** WF06 — processar lead único (entrada HubSpot / Julio → Supabase) */
  r.post('/wf06', gate, async (req, res) => {
    try {
      const raw = extractLeadPayload(req.body);
      if (!raw) {
        res.status(400).json({ ok: false, error: 'Body vazio ou inválido' });
        return;
      }
      const result = await insertLead(supabase, raw);
      if (result.error) {
        res.status(422).json({ ok: false, error: result.error });
        return;
      }
      emitN8n('wf06:lead_inserted', { leadId: result.id });
      res.json({ ok: true, leadId: result.id });
    } catch (e) {
      res.status(500).json({ ok: false, error: String(e) });
    }
  });

  /** WF07 — lote (CSV / batch intake) */
  r.post('/wf07', gate, async (req, res) => {
    try {
      let items = extractLeadArray(req.body);
      if (!items.length) {
        const one = extractLeadPayload(req.body);
        if (one) items = [one];
      }
      if (!items.length) {
        res.status(400).json({ ok: false, error: 'Nenhuma linha em rows/leads/data' });
        return;
      }
      const result = await insertLeadsBatch(supabase, items);
      if (result.error) {
        res.status(422).json({ ok: false, error: result.error });
        return;
      }
      emitN8n('wf07:batch_inserted', { inserted: result.inserted });
      res.json({ ok: true, inserted: result.inserted });
    } catch (e) {
      res.status(500).json({ ok: false, error: String(e) });
    }
  });

  /** WF08 — eventos / sinais / automações (grava `signals` + broadcast) */
  r.post('/wf08', gate, async (req, res) => {
    try {
      const b = (req.body && typeof req.body === 'object' ? req.body : {}) as Json;
      const description =
        str(b.description) ??
        str(b.message) ??
        (typeof b.text === 'string' ? b.text : JSON.stringify(b).slice(0, 800));
      const country = str(b.country) ?? str(b.company_country);
      const city = str(b.city);
      const coords = geocodeSignal({ country, city, description });
      const row: Json = {
        type: str(b.type) ?? 'n8n_wf08',
        severity: str(b.severity) ?? 'info',
        title: str(b.title) ?? 'Workflow WF08',
        description,
        country: country ?? null,
        city: city ?? null,
        lat: coords?.lat ?? null,
        lng: coords?.lng ?? null,
        map_layer: 'signal',
        metadata:
          typeof b.metadata === 'object' && b.metadata
            ? (b.metadata as Json)
            : { dealId: b.dealId, hubspotId: b.hubspotId, payload: b },
      };
      const { data, error } = await supabase.from('signals').insert(row).select('id').maybeSingle();
      if (error) {
        res.status(422).json({ ok: false, error: error.message });
        return;
      }
      emitN8n('wf08:signal', { signalId: data?.id, row });
      res.json({ ok: true, signalId: data?.id });
    } catch (e) {
      res.status(500).json({ ok: false, error: String(e) });
    }
  });

  /** Log genérico em wf_executions (qualquer workflow) */
  r.post('/execution-log', gate, async (req, res) => {
    try {
      const b = (req.body && typeof req.body === 'object' ? req.body : {}) as Json;
      const row = {
        workflow_id: str(b.workflow_id) ?? str(b.workflowId),
        workflow_name: str(b.workflow_name) ?? str(b.workflowName) ?? 'n8n',
        status: str(b.status) ?? 'ok',
        trigger_type: str(b.trigger_type) ?? str(b.triggerType),
        result_summary: typeof b.result === 'object' ? b.result : { note: b },
      };
      const { data, error } = await supabase.from('wf_executions').insert(row).select('id').maybeSingle();
      if (error) {
        res.status(422).json({ ok: false, error: error.message });
        return;
      }
      emitN8n('execution_log', { id: data?.id });
      res.json({ ok: true, id: data?.id });
    } catch (e) {
      res.status(500).json({ ok: false, error: String(e) });
    }
  });

  return r;
}
