import { Router } from 'express';
import type { SupabaseClient } from '@supabase/supabase-js';

export function executionsRoutes(_env: unknown, supabase: SupabaseClient) {
  const r = Router();

  r.get('/', async (req, res) => {
    const limit = Math.min(Number(req.query.limit ?? 100) || 100, 500);
    const { data, error } = await supabase
      .from('wf_executions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }
    res.json({ executions: data ?? [] });
  });

  return r;
}
