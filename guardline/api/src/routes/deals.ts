import { Router } from 'express';
import type { SupabaseClient } from '@supabase/supabase-js';

type DealRow = Record<string, unknown>;

export function dealsRoutes(_env: unknown, supabase: SupabaseClient) {
  const r = Router();

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
    const patch = { ...(req.body as object), updated_at: new Date().toISOString() };
    const { data, error } = await supabase
      .from('deals')
      .update(patch)
      .eq('id', req.params.id)
      .select()
      .single();
    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }
    res.json(data);
  });

  return r;
}
