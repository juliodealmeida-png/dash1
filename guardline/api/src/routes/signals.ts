import { Router } from 'express';
import type { SupabaseClient } from '@supabase/supabase-js';

export function signalsRoutes(_env: unknown, supabase: SupabaseClient) {
  const r = Router();

  r.get('/', async (req, res) => {
    const unreadOnly = req.query.unread === '1' || req.query.unread === 'true';
    const limit = Math.min(Number(req.query.limit ?? 100) || 100, 500);

    let q = supabase.from('signals').select('*').order('created_at', { ascending: false }).limit(limit);
    if (unreadOnly) q = q.eq('is_read', false).eq('is_ignored', false);

    const { data, error } = await q;
    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }
    res.json({ success: true, data: { signals: data ?? [] } });
  });

  r.post('/', async (req, res) => {
    const body = (req.body ?? {}) as Record<string, unknown>;
    const row: Record<string, unknown> = {
      type: body.type ?? 'info',
      severity: body.severity ?? 'info',
      title: String(body.title ?? ''),
      description: body.description ?? body.message ?? '',
      company_name: body.companyName ?? body.company_name ?? null,
      is_read: false,
      is_ignored: false,
      created_at: new Date().toISOString(),
    };
    if (body.dealId ?? body.deal_id) row.deal_id = body.dealId ?? body.deal_id;
    const { data, error } = await supabase.from('signals').insert(row).select().single();
    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }
    res.status(201).json(data);
  });

  r.patch('/:id', async (req, res) => {
    const patch = req.body as Record<string, unknown>;
    const allowed: Record<string, unknown> = {};
    if (typeof patch.is_read === 'boolean') allowed.is_read = patch.is_read;
    if (typeof patch.is_ignored === 'boolean') allowed.is_ignored = patch.is_ignored;

    const { data, error } = await supabase
      .from('signals')
      .update(allowed)
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
