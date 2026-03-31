import { Router } from 'express';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Env } from '../config/env.js';
import { verifyAnySecret } from '../middleware/guardlineSecret.js';
import { verifyHubspotSignatureV3 } from '../lib/hubspotSignature.js';
import { hubspotGetDeal } from '../services/hubspotClient.js';

type HubspotWebhookEvent = {
  subscriptionType?: string;
  objectId?: number | string;
  eventId?: number | string;
};

type DealUpsertRow = {
  hubspot_deal_id: string;
  deal_name: string | null;
  deal_stage: string | null;
  deal_amount: number;
  deal_probability: number;
  deal_close_date: string | null;
  pipeline_id: string | null;
  hubspot_owner_id: string | null;
  source: 'hubspot_webhook';
  metadata: Record<string, unknown>;
  updated_at: string;
};

function isDealEvent(e: HubspotWebhookEvent): boolean {
  const t = (e.subscriptionType ?? '').toLowerCase();
  return t.startsWith('deal.') || t.includes('.deal.');
}

function toNumber(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  const n = typeof value === 'number' ? value : Number(String(value));
  return Number.isFinite(n) ? n : null;
}

export function webhooksHubspotRoutes(env: Env, supabase: SupabaseClient) {
  const r = Router();
  let canWriteDealId: boolean | null = null;

  r.get('/', (_req, res) => {
    res.json({ ok: true });
  });

  r.post('/', async (req, res) => {
    const sigOk = env.HUBSPOT_APP_SECRET ? verifyHubspotSignatureV3(req, env.HUBSPOT_APP_SECRET) : false;
    const secretOk = verifyAnySecret(req, env.DASHBOARD_WEBHOOK_SECRET, env.N8N_WEBHOOK_SECRET);
    const authorized = sigOk || secretOk;

    if (!authorized) {
      res.status(401).json({ error: 'unauthorized' });
      return;
    }

    try {
      const events: HubspotWebhookEvent[] = Array.isArray(req.body) ? (req.body as HubspotWebhookEvent[]) : [];
      const ids = new Set<string>();
      const eventIds: (string | number)[] = [];

      for (const e of events) {
        if (!isDealEvent(e)) continue;
        if (e.objectId === undefined || e.objectId === null) continue;
        ids.add(String(e.objectId));
        if (e.eventId !== undefined && e.eventId !== null) eventIds.push(e.eventId);
      }

      if (!ids.size) {
        res.json({ ok: true, processedDeals: 0 });
        return;
      }

      const now = new Date().toISOString();
      const rows: DealUpsertRow[] = [];

      for (const id of ids) {
        const deal = await hubspotGetDeal(env, id);
        const p = deal.properties || {};

        const amount = toNumber(p.amount) ?? 0;
        const prob = toNumber(p.hs_probability);
        const dealProbability = prob === null ? 0 : Math.max(0, Math.min(100, Math.round(prob)));

        rows.push({
          hubspot_deal_id: String(deal.id),
          deal_name: (p.dealname ?? null) as string | null,
          deal_stage: (p.dealstage ?? null) as string | null,
          deal_amount: amount,
          deal_probability: dealProbability,
          deal_close_date: (p.closedate ?? null) as string | null,
          pipeline_id: (p.pipeline ?? null) as string | null,
          hubspot_owner_id: (p.hubspot_owner_id ?? null) as string | null,
          source: 'hubspot_webhook',
          metadata: {
            hubspot: {
              hs_lastmodifieddate: p.hs_lastmodifieddate ?? null,
            },
            webhook: {
              eventIds,
            },
          },
          updated_at: now,
        });
      }

      const tryUpsert = async (withDealId: boolean) => {
        const payload = withDealId
          ? rows.map((r) => ({ ...r, deal_id: r.hubspot_deal_id }))
          : rows;
        return supabase.from('deals').upsert(payload, { onConflict: 'hubspot_deal_id' });
      };

      let upsertRes = canWriteDealId === false ? await tryUpsert(false) : await tryUpsert(true);
      if (upsertRes.error && canWriteDealId !== false) {
        const msg = upsertRes.error.message || '';
        if (/deal_id/i.test(msg) && /does not exist/i.test(msg)) {
          canWriteDealId = false;
          upsertRes = await tryUpsert(false);
        }
      } else if (!upsertRes.error && canWriteDealId === null) {
        canWriteDealId = true;
      }

      if (upsertRes.error) {
        res.status(500).json({ error: upsertRes.error.message });
        return;
      }

      res.json({ ok: true, processedDeals: rows.length });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'internal error';
      res.status(500).json({ error: msg });
    }
  });

  return r;
}
