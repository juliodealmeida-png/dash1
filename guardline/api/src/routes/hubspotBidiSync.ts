import { Router } from 'express';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { AppEnv } from '../config/env.js';
import {
  pushDealToHubSpot,
  pushContactToHubSpot,
  syncContactFromHubSpot,
  fullSyncDeals,
  fullSyncContacts,
} from '../services/hubspotBidiSync.js';

export function hubspotBidiSyncRoutes(env: AppEnv, supabase: SupabaseClient) {
  const r = Router();

  /* POST /api/hubspot-bidi/sync-all — full bidirectional sync */
  r.post('/sync-all', async (_req, res) => {
    try {
      const [deals, contacts] = await Promise.all([
        fullSyncDeals(env, supabase),
        fullSyncContacts(env, supabase),
      ]);
      res.json({ success: true, data: { deals: deals.synced, contacts: contacts.synced } });
    } catch (e) {
      res.status(500).json({ success: false, error: (e as Error).message });
    }
  });

  /* POST /api/hubspot-bidi/push-deal — push single deal to HubSpot */
  r.post('/push-deal', async (req, res) => {
    try {
      const result = await pushDealToHubSpot(env, req.body);
      res.json({ success: true, data: result });
    } catch (e) {
      res.status(500).json({ success: false, error: (e as Error).message });
    }
  });

  /* POST /api/hubspot-bidi/push-contact — push single contact to HubSpot */
  r.post('/push-contact', async (req, res) => {
    try {
      const result = await pushContactToHubSpot(env, req.body);
      res.json({ success: true, data: result });
    } catch (e) {
      res.status(500).json({ success: false, error: (e as Error).message });
    }
  });

  /* POST /api/hubspot-bidi/webhook-contacts — receive HubSpot contact webhooks */
  r.post('/webhook-contacts', async (req, res) => {
    try {
      const events = Array.isArray(req.body) ? req.body : [];
      let synced = 0;
      for (const e of events) {
        const t = (e.subscriptionType ?? '').toLowerCase();
        if (!t.startsWith('contact.')) continue;
        const id = String(e.objectId ?? '');
        if (!id) continue;
        await syncContactFromHubSpot(env, supabase, id);
        synced++;
      }
      res.json({ ok: true, synced });
    } catch (e) {
      res.status(500).json({ error: (e as Error).message });
    }
  });

  return r;
}
