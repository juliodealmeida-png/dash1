import { Router, type Request, type Response, type NextFunction } from 'express';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Env } from '../config/env.js';
import { verifyDashboardWebhook } from '../middleware/guardlineSecret.js';
import { wf06DashboardPayloadToRow } from '../services/leadIngest.js';
import { emitDbChange } from '../services/realtimeHub.js';
import { geocodeSignal } from '../services/geocoder.js';

type Json = Record<string, unknown>;

function str(v: unknown): string | undefined {
  if (v == null) return undefined;
  if (typeof v === 'string') return v;
  return String(v);
}

function isWf06LikePayload(b: Json): boolean {
  if (!b || typeof b !== 'object') return false;
  return Boolean(
    b.ok === true ||
      b.route ||
      b.lead_score != null ||
      b.email ||
      b.account ||
      b.domain ||
      b.contact
  );
}

async function handleWf06Result(supabase: SupabaseClient, req: Request, res: Response) {
  const body = (req.body && typeof req.body === 'object' ? req.body : {}) as Json;
  if (!isWf06LikePayload(body)) {
    res.json({ stored: false, reason: 'invalid_payload' });
    return;
  }

  const row = wf06DashboardPayloadToRow(body);
  const { data, error } = await supabase
    .from('leads')
    .upsert(row, { onConflict: 'lead_id' })
    .select()
    .single();

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  emitDbChange('leads', 'UPSERT', data);

  const score = Number(body.lead_score ?? 0);
  if (score >= 80) {
    const description = `Score ${score} — ${str(body.primary_solution) ?? ''} — ${str(body.owner) ?? ''}`.trim();
    const country = str(body.country) ?? str(body.company_country) ?? str(row.company_country);
    const city = str(body.city) ?? str(row.city);
    const coords = geocodeSignal({ country, city, description });
    await supabase.from('signals').insert({
      type: 'lead',
      severity: 'positive',
      title: `Hot lead: ${str(body.account) ?? str(body.company_name) ?? 'Lead'}`,
      description,
      company_name: str(body.account) ?? str(body.company_name),
      owner_name: str(body.owner),
      source: 'wf06',
      country: country ?? null,
      city: city ?? null,
      lat: coords?.lat ?? null,
      lng: coords?.lng ?? null,
      map_layer: 'signal',
    });
  }

  res.json({ stored: true, id: data?.id });
}

export function webhooksDashboardRoutes(env: Env, supabase: SupabaseClient) {
  const r = Router();

  const gate = (req: Request, res: Response, next: NextFunction) => {
    if (!verifyDashboardWebhook(req, env)) {
      res.status(401).json({ error: 'unauthorized' });
      return;
    }
    next();
  };

  r.post('/wf06-result', gate, (req, res) => handleWf06Result(supabase, req, res));
  r.post('/n8nWebhookReceiver/invoke', gate, (req, res) => handleWf06Result(supabase, req, res));

  return r;
}
