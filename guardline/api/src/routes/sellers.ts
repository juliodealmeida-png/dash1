import { Router } from 'express';
import type { SupabaseClient } from '@supabase/supabase-js';

export function sellersRoutes(_env: unknown, supabase: SupabaseClient) {
  const r = Router();

  r.get('/', async (_req, res) => {
    const { data, error } = await supabase
      .from('seller_profiles')
      .select('*')
      .order('display_name', { ascending: true });
    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }
    res.json({ success: true, data: { sellers: data ?? [] } });
  });

  r.get('/:hubspot_owner_id', async (req, res) => {
    const { data, error } = await supabase
      .from('seller_profiles')
      .select('*')
      .eq('hubspot_owner_id', req.params.hubspot_owner_id)
      .maybeSingle();
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
