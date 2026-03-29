import { Router } from 'express';
import type { SupabaseClient } from '@supabase/supabase-js';
import { DEAL_INACTIVE_STAGES } from '../config/hubspotConfig.js';

export function dashboardRoutes(_env: unknown, supabase: SupabaseClient) {
  const r = Router();

  r.get('/kpis', async (req, res) => {
    const owner = typeof req.query.owner === 'string' ? req.query.owner : undefined;

    let dealsQuery = supabase
      .from('deals')
      .select('deal_amount, deal_stage, deal_probability, hubspot_owner_id');
    if (owner) dealsQuery = dealsQuery.eq('hubspot_owner_id', owner);

    const [dealsResult, leadsResult, signalsResult] = await Promise.all([
      dealsQuery,
      supabase.from('leads').select('lead_score, lead_temperature, route').gte('lead_score', 50),
      supabase.from('signals').select('id, severity').eq('is_read', false).eq('is_ignored', false),
    ]);

    const deals = dealsResult.data ?? [];
    const leads = leadsResult.data ?? [];
    const signals = signalsResult.data ?? [];

    const inactive = (stage: string | null | undefined) =>
      DEAL_INACTIVE_STAGES.has(String(stage ?? ''));

    const activeDeals = deals.filter((d) => !inactive(d.deal_stage));
    const closedWon = deals.filter((d) => d.deal_stage === 'closed_won');
    const totalClosed = deals.filter((d) =>
      ['closed_won', 'closed_lost'].includes(String(d.deal_stage ?? ''))
    );

    const pipelineTotal = activeDeals.reduce((s, d) => s + Number(d.deal_amount ?? 0), 0);
    const forecast90d = activeDeals.reduce(
      (s, d) => s + (Number(d.deal_amount ?? 0) * Number(d.deal_probability ?? 0)) / 100,
      0
    );
    const winRate =
      totalClosed.length > 0 ? Math.round((closedWon.length / totalClosed.length) * 100) : 0;
    const atRisk = activeDeals.filter((d) => {
      const p = Number(d.deal_probability ?? 0);
      return p >= 25 && p <= 50;
    }).length;
    const criticalAlerts = signals.filter((s) => s.severity === 'critical').length;

    res.json({
      pipeline_total: pipelineTotal,
      active_deals: activeDeals.length,
      at_risk_count: atRisk,
      win_rate: winRate,
      forecast_90d: forecast90d,
      alerts_count: signals.length,
      critical_alerts: criticalAlerts,
      hot_leads: leads.filter((l) => l.lead_temperature === 'hot').length,
      warm_leads: leads.filter((l) => l.lead_temperature === 'warm').length,
    });
  });

  r.get('/pipeline-health', async (_req, res) => {
    const { data: deals } = await supabase.from('deals').select('*');
    const list = deals ?? [];
    const inactive = (stage: string | null | undefined) =>
      DEAL_INACTIVE_STAGES.has(String(stage ?? ''));
    const active = list.filter((d) => !inactive(d.deal_stage));
    const closedWon = list.filter((d) => d.deal_stage === 'closed_won');
    const pipelineValue = active.reduce((s, d) => s + Number(d.deal_amount ?? 0), 0);
    const targetQuota = pipelineValue / 2.4;
    const coverageRatio = targetQuota > 0 ? Number((pipelineValue / targetQuota).toFixed(1)) : 2.4;
    const healthScore = Math.min(
      100,
      Math.round(
        (coverageRatio > 2 ? 40 : coverageRatio * 20) +
          (closedWon.length / Math.max(active.length, 1)) * 30 +
          Math.min(30, active.length)
      )
    );
    res.json({
      health_score: healthScore,
      coverage_ratio: coverageRatio,
      active_deals: active.length,
      pipeline_value: pipelineValue,
    });
  });

  r.get('/focus-today', async (_req, res) => {
    const { data } = await supabase
      .from('leads')
      .select(
        'company_name, lead_score, lead_temperature, primary_solution, owner_name, next_action, pipeline_stage'
      )
      .gte('lead_score', 60)
      .order('lead_score', { ascending: false })
      .limit(10);
    res.json({ leads: data ?? [] });
  });

  r.get('/julio-ai-briefing', async (_req, res) => {
    const { data } = await supabase
      .from('leads')
      .select('company_name, lead_score, owner_name, next_action, primary_solution')
      .gte('lead_score', 70)
      .order('lead_score', { ascending: false })
      .limit(5);
    const briefing = (data ?? []).map((l, i) => ({
      rank: i + 1,
      text: `${l.company_name} — score ${l.lead_score}; priorizar follow-up nas próximas 48h.`,
    }));
    res.json({ briefing, generated_at: new Date().toISOString() });
  });

  return r;
}
