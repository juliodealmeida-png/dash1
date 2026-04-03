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
    res.json({ success: true, data: { campaigns: data ?? [] } });
  });

  r.get('/pipeline', async (_req, res) => {
    const { data, error } = await supabase
      .from('deals')
      .select('deal_stage, deal_amount, deal_probability')
      .not('deal_stage', 'in', '("1031112083","1031112084","closed_won","closed_lost","won","lost","unqualified","freezer")');
    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }
    const byStage: Record<string, { count: number; total: number }> = {};
    for (const d of data ?? []) {
      const s = String(d.deal_stage ?? 'unknown');
      if (!byStage[s]) byStage[s] = { count: 0, total: 0 };
      byStage[s].count++;
      byStage[s].total += Number(d.deal_amount ?? 0);
    }
    res.json({ pipeline: byStage, total: (data ?? []).reduce((s, d) => s + Number(d.deal_amount ?? 0), 0) });
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
