import { Router } from 'express';
import type { SupabaseClient } from '@supabase/supabase-js';

export function analyticsRoutes(_env: unknown, supabase: SupabaseClient) {
  const r = Router();

  r.get('/campaigns', async (req, res) => {
    const limit = Math.min(Number(req.query.limit ?? 200) || 200, 1000);
    const { data, error } = await supabase
      .from('campaign_analytics')
      .select('*')
      .order('period_start', { ascending: false })
      .limit(limit);
    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }
    res.json({ campaigns: data ?? [] });
  });

  r.post('/campaigns', async (req, res) => {
    const row = req.body as Record<string, unknown>;
    const { data, error } = await supabase
      .from('campaign_analytics')
      .upsert(row, { onConflict: 'period,period_start,campaign_name' })
      .select()
      .single();
    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }
    res.status(201).json(data);
  });

  return r;
}
