import { Router } from 'express';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Env } from '../config/env.js';
import { hubspotCreateDeal, hubspotGetDeal, hubspotUpdateDeal } from '../services/hubspotClient.js';

type DealRow = Record<string, unknown>;

function toNumber(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  const n = typeof value === 'number' ? value : Number(String(value));
  return Number.isFinite(n) ? n : null;
}

export function dealsRoutes(env: Env, supabase: SupabaseClient) {
  const r = Router();
  let canWriteDealId: boolean | null = null;

  r.get('/', async (req, res) => {
    const owner = typeof req.query.owner === 'string' ? req.query.owner : undefined;
    const stage = typeof req.query.stage === 'string' ? req.query.stage : undefined;
    const search = typeof req.query.search === 'string' ? req.query.search : undefined;

    let query = supabase.from('deals').select('*').order('deal_amount', { ascending: false });
    if (owner) query = query.eq('hubspot_owner_id', owner);
    if (stage) query = query.eq('deal_stage', stage);
    if (search) query = query.ilike('deal_name', `%${search}%`);

    const { data, error } = await query;
    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }

    const deals = (data ?? []) as DealRow[];
    const by_stage: Record<string, DealRow[]> = {};
    for (const d of deals) {
      const s = String(d.deal_stage ?? 'unknown');
      if (!by_stage[s]) by_stage[s] = [];
      by_stage[s].push(d);
    }

    res.json({ deals, by_stage });
  });

  r.post('/', async (req, res) => {
    const deal_name = typeof req.body?.deal_name === 'string' ? req.body.deal_name.trim() : '';
    const deal_stage = typeof req.body?.deal_stage === 'string' ? req.body.deal_stage.trim() : '';
    const pipeline_id = typeof req.body?.pipeline_id === 'string' ? req.body.pipeline_id.trim() : '';
    const hubspot_owner_id = typeof req.body?.hubspot_owner_id === 'string' ? req.body.hubspot_owner_id.trim() : undefined;
    const deal_amount = toNumber(req.body?.deal_amount);
    const deal_close_date = typeof req.body?.deal_close_date === 'string' ? req.body.deal_close_date.trim() : undefined;

    if (!deal_name || !deal_stage || !pipeline_id) {
      res.status(400).json({ error: 'deal_name, deal_stage e pipeline_id são obrigatórios' });
      return;
    }

    if (!env.HUBSPOT_PAT) {
      res.status(500).json({ error: 'HUBSPOT_PAT não configurado no servidor' });
      return;
    }

    try {
      const associations = Array.isArray(req.body?.associations) ? (req.body.associations as unknown[]) : undefined;
      const create = await hubspotCreateDeal(env, {
        properties: {
          dealname: deal_name,
          dealstage: deal_stage,
          pipeline: pipeline_id,
          ...(hubspot_owner_id ? { hubspot_owner_id } : {}),
          ...(deal_amount !== null ? { amount: String(deal_amount) } : {}),
          ...(deal_close_date ? { closedate: deal_close_date } : {}),
        },
        ...(associations ? { associations } : {}),
      });

      const hs = await hubspotGetDeal(env, String(create.id));
      const p = hs.properties || {};
      const amount = toNumber(p.amount) ?? 0;
      const prob = toNumber(p.hs_probability);
      const deal_probability = prob === null ? 0 : Math.max(0, Math.min(100, Math.round(prob)));

      const row = {
        hubspot_deal_id: String(hs.id),
        deal_name: (p.dealname ?? null) as string | null,
        deal_stage: (p.dealstage ?? null) as string | null,
        deal_amount: amount,
        deal_probability,
        deal_close_date: (p.closedate ?? null) as string | null,
        pipeline_id: (p.pipeline ?? null) as string | null,
        hubspot_owner_id: (p.hubspot_owner_id ?? null) as string | null,
        source: 'dashboard',
        metadata: {
          hubspot: {
            hs_lastmodifieddate: p.hs_lastmodifieddate ?? null,
          },
        },
        updated_at: new Date().toISOString(),
      };

      const tryUpsert = async (withDealId: boolean) => {
        const payload = withDealId ? { ...row, deal_id: row.hubspot_deal_id } : row;
        return supabase.from('deals').upsert(payload, { onConflict: 'hubspot_deal_id' }).select().single();
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
      res.status(201).json(upsertRes.data);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'internal error';
      res.status(500).json({ error: msg });
    }
  });

  r.get('/:id', async (req, res) => {
    const { data, error } = await supabase.from('deals').select('*').eq('id', req.params.id).maybeSingle();
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

  r.patch('/:id', async (req, res) => {
    try {
      const { data: existing, error: existingErr } = await supabase
        .from('deals')
        .select('*')
        .eq('id', req.params.id)
        .maybeSingle();
      if (existingErr) {
        res.status(500).json({ error: existingErr.message });
        return;
      }
      if (!existing) {
        res.status(404).json({ error: 'not found' });
        return;
      }

      const patch = { ...(req.body as object), updated_at: new Date().toISOString() } as Record<string, unknown>;
      const hubspotId = typeof existing.hubspot_deal_id === 'string' && existing.hubspot_deal_id ? existing.hubspot_deal_id : null;

      if (hubspotId && env.HUBSPOT_PAT) {
        const props: Record<string, unknown> = {};
        if (typeof patch.deal_name === 'string') props.dealname = patch.deal_name;
        if (typeof patch.deal_stage === 'string') props.dealstage = patch.deal_stage;
        if (typeof patch.pipeline_id === 'string') props.pipeline = patch.pipeline_id;
        if (patch.deal_amount !== undefined) {
          const n = toNumber(patch.deal_amount);
          if (n !== null) props.amount = String(n);
        }
        if (typeof patch.deal_close_date === 'string') props.closedate = patch.deal_close_date;
        if (typeof patch.hubspot_owner_id === 'string') props.hubspot_owner_id = patch.hubspot_owner_id;

        if (Object.keys(props).length) {
          await hubspotUpdateDeal(env, hubspotId, { properties: props });
          const hs = await hubspotGetDeal(env, hubspotId);
          const p = hs.properties || {};
          const amount = toNumber(p.amount) ?? 0;
          const prob = toNumber(p.hs_probability);
          const deal_probability = prob === null ? 0 : Math.max(0, Math.min(100, Math.round(prob)));

          patch.hubspot_deal_id = String(hs.id);
          patch.deal_name = (p.dealname ?? null) as string | null;
          patch.deal_stage = (p.dealstage ?? null) as string | null;
          patch.deal_amount = amount;
          patch.deal_probability = deal_probability;
          patch.deal_close_date = (p.closedate ?? null) as string | null;
          patch.pipeline_id = (p.pipeline ?? null) as string | null;
          patch.hubspot_owner_id = (p.hubspot_owner_id ?? null) as string | null;
          patch.metadata = {
            ...(typeof existing.metadata === 'object' && existing.metadata ? (existing.metadata as object) : {}),
            hubspot: {
              hs_lastmodifieddate: p.hs_lastmodifieddate ?? null,
            },
          };
          patch.source = 'dashboard';
        }
      }

      const { data, error } = await supabase.from('deals').update(patch).eq('id', req.params.id).select().single();
      if (error) {
        res.status(500).json({ error: error.message });
        return;
      }
      res.json(data);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'internal error';
      res.status(500).json({ error: msg });
    }
  });

  return r;
}
