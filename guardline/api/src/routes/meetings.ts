import { Router } from 'express';
import type { SupabaseClient } from '@supabase/supabase-js';

export function meetingsRoutes(_env: unknown, supabase: SupabaseClient) {
  const r = Router();

  r.get('/', async (req, res) => {
    const owner = typeof req.query.owner === 'string' ? req.query.owner : undefined;
    const limit = Math.min(Number(req.query.limit ?? 100) || 100, 500);
    let q = supabase.from('meetings').select('*').order('scheduled_at', { ascending: false }).limit(limit);
    if (owner) q = q.eq('hubspot_owner_id', owner);
    const { data, error } = await q;
    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }
    res.json({ success: true, data: { meetings: data ?? [] } });
  });

  r.post('/', async (req, res) => {
    const row = {
      ...(req.body as object),
      updated_at: new Date().toISOString(),
    };
    const { data, error } = await supabase.from('meetings').insert(row).select().single();
    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }
    res.status(201).json(data);
  });

  r.patch('/:id', async (req, res) => {
    const patch = { ...(req.body as object), updated_at: new Date().toISOString() };
    const { data, error } = await supabase
      .from('meetings')
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
    res.json(data);
  });

  return r;
}
