import type { Express, Request, Response } from 'express';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Env } from '../config/env.js';
import { DEAL_INACTIVE_STAGES, HUBSPOT_CONFIG } from '../config/hubspotConfig.js';

/** Respostas no formato do backend Express legado (`{ success, data }`). */
function ok(res: Response, data: unknown) {
  res.json({ success: true, data });
}

function err(res: Response, status: number, message: string) {
  res.status(status).json({ success: false, error: message });
}

const HS_STAGE_TO_API: Record<string, string> = (() => {
  const m: Record<string, string> = {};
  const sm = HUBSPOT_CONFIG.stage_map as Record<string, string>;
  m[sm.new_lead] = 'prospecting';
  m[sm.intro_call] = 'qualification';
  m[sm.discovery_demo] = 'qualification';
  m[sm.nda] = 'proposal';
  m[sm.poc_planning] = 'proposal';
  m[sm.poc] = 'proposal';
  m[sm.proposal_sent] = 'proposal';
  m[sm.contract_negotiation] = 'negotiation';
  m[sm.proposal_accepted] = 'negotiation';
  m[sm.contract_sent] = 'negotiation';
  m[sm.closed_won] = 'won';
  m[sm.closed_lost] = 'lost';
  m[sm.unqualified] = 'lost';
  m[sm.freezer] = 'prospecting';
  return m;
})();

function stageToApi(stage: string | null | undefined): string {
  const s = String(stage ?? '');
  if (['closed_won', 'won'].includes(s)) return 'won';
  if (['closed_lost', 'lost', 'unqualified'].includes(s)) return 'lost';
  if (['negotiation', 'proposal', 'qualification', 'prospecting'].includes(s)) return s;
  return HS_STAGE_TO_API[s] ?? 'prospecting';
}

function dealInactive(stage: string | null | undefined): boolean {
  return DEAL_INACTIVE_STAGES.has(String(stage ?? ''));
}

function mapDealRow(d: Record<string, unknown>) {
  const prob = Number(d.deal_probability ?? 0);
  const riskScore = prob <= 50 && prob >= 25 ? 62 : prob > 0 && prob < 25 ? 78 : 100 - Math.min(100, prob);
  return {
    id: d.id,
    companyName: d.deal_name ?? 'Deal',
    value: Number(d.deal_amount ?? 0),
    stage: stageToApi(d.deal_stage as string),
    riskScore: Math.round(Math.min(100, Math.max(0, riskScore))),
    probability: prob,
    createdAt: d.created_at,
    source: d.source ?? 'hubspot_sync',
    contactName: null,
    notes: null,
  };
}

/**
 * Rotas compatíveis com `guardline.html` + `API.request` (Bearer opcional).
 * Registar no Express **antes** de `app.use('/api/deals', …)` para GET /api/deals em branco.
 */
export function mountLegacyExpressCompat(app: Express, _env: Env, supabase: SupabaseClient) {
  app.get('/api/metrics/dashboard', async (_req: Request, res: Response) => {
    try {
      const { data: dealsRaw } = await supabase.from('deals').select('*');
      const deals = (dealsRaw ?? []) as Record<string, unknown>[];
      const active = deals.filter((d) => !dealInactive(d.deal_stage as string));
      const closedWon = deals.filter(
        (d) => String(d.deal_stage) === 'closed_won' || String(d.deal_stage) === HUBSPOT_CONFIG.stage_map.closed_won
      );
      const totalClosed = deals.filter(
        (d) =>
          ['closed_won', 'closed_lost'].includes(String(d.deal_stage)) ||
          String(d.deal_stage) === HUBSPOT_CONFIG.stage_map.closed_won ||
          String(d.deal_stage) === HUBSPOT_CONFIG.stage_map.closed_lost
      );

      const pipelineTotal = active.reduce((s, d) => s + Number(d.deal_amount ?? 0), 0);
      const forecastCommitted = active.reduce(
        (s, d) => s + (Number(d.deal_amount ?? 0) * Number(d.deal_probability ?? 0)) / 100,
        0
      );
      const atRiskDeals = active.filter((d) => {
        const p = Number(d.deal_probability ?? 0);
        return p >= 25 && p <= 50;
      }).length;

      const winRate =
        totalClosed.length > 0 ? Math.round((closedWon.length / totalClosed.length) * 100) : 0;

      const { count: crit } = await supabase
        .from('signals')
        .select('id', { count: 'exact', head: true })
        .eq('is_read', false)
        .in('severity', ['critical', 'warning']);

      const { data: recentSig } = await supabase
        .from('signals')
        .select('*')
        .eq('is_read', false)
        .order('created_at', { ascending: false })
        .limit(20);

      const pipelineValue = pipelineTotal;
      const denom = forecastCommitted * 3 || 1;
      const coverageRatio = pipelineValue > 0 ? Number((pipelineValue / denom).toFixed(2)) : 0;
      const avgProb =
        active.length > 0
          ? active.reduce((s, d) => s + Number(d.deal_probability ?? 0), 0) / active.length
          : 0;
      let healthScore = Math.max(0, Math.round(100 - avgProb * 0.5 + Math.min(20, coverageRatio * 5)));
      healthScore = Math.min(healthScore, 100);

      const { count: leadsMonth } = await supabase
        .from('leads')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString());

      ok(res, {
        pipelineTotal,
        activeDeals: active.length,
        atRiskDeals,
        winRate,
        forecast: {
          committed: Math.round(forecastCommitted),
          bestCase: Math.round(forecastCommitted * 1.15),
        },
        criticalAlerts: crit ?? 0,
        fraudToday: 0,
        leadsThisMonth: leadsMonth ?? 0,
        healthScore,
        coverageRatio,
        recentSignals: (recentSig ?? []).map((s) => ({
          id: s.id,
          severity: s.severity,
          title: s.title,
          message: s.description,
          read: s.is_read,
          createdAt: s.created_at,
          deal: s.company_name ? { companyName: s.company_name } : null,
        })),
      });
    } catch (e) {
      err(res, 500, String(e));
    }
  });

  app.get('/api/julio/brief/latest', async (_req: Request, res: Response) => {
    try {
      const { data } = await supabase
        .from('leads')
        .select('company_name, lead_score, owner_name, next_action, primary_solution')
        .gte('lead_score', 70)
        .order('lead_score', { ascending: false })
        .limit(5);
      const items = (data ?? []).map(
        (l) =>
          `${l.company_name ?? 'Lead'} — score ${l.lead_score ?? 0}; priorizar follow-up nas próximas 48h.`
      );
      ok(res, {
        brief: { items, bullets: items, generated_at: new Date().toISOString() },
      });
    } catch (e) {
      err(res, 500, String(e));
    }
  });

  app.get('/api/signals', async (req: Request, res: Response) => {
    try {
      const take = Math.min(Number(req.query.take ?? 40) || 40, 200);
      const unread = req.query.unread === 'true';
      let q = supabase.from('signals').select('*').order('created_at', { ascending: false }).limit(take);
      if (unread) q = q.eq('is_read', false);
      const { data, error } = await q;
      if (error) {
        err(res, 500, error.message);
        return;
      }
      const mapped = (data ?? []).map((s) => ({
        id: s.id,
        severity: s.severity,
        title: s.title,
        message: s.description,
        read: s.is_read,
        createdAt: s.created_at,
        dealId: s.deal_id,
        deal: s.company_name ? { companyName: s.company_name, company_name: s.company_name } : null,
      }));
      ok(res, mapped);
    } catch (e) {
      err(res, 500, String(e));
    }
  });

  app.get('/api/deals', async (req: Request, res: Response) => {
    try {
      const perPage = Math.min(Number(req.query.perPage ?? 100) || 100, 500);
      const { data, error } = await supabase
        .from('deals')
        .select('*')
        .order('deal_amount', { ascending: false })
        .limit(perPage);
      if (error) {
        err(res, 500, error.message);
        return;
      }
      ok(res, (data ?? []).map((d) => mapDealRow(d as Record<string, unknown>)));
    } catch (e) {
      err(res, 500, String(e));
    }
  });

  app.get('/api/leads', async (req: Request, res: Response) => {
    try {
      const perPage = Math.min(Number(req.query.perPage ?? 100) || 100, 500);
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .order('lead_score', { ascending: false })
        .limit(perPage);
      if (error) {
        err(res, 500, error.message);
        return;
      }
      const mapped = (data ?? []).map((l) => {
        const ps = String(l.pipeline_stage ?? '');
        const won =
          ps === 'closed_won' || ps === HUBSPOT_CONFIG.stage_map.closed_won || ps === 'won';
        return {
          id: l.id,
          score: l.lead_score,
          lead_score: l.lead_score,
          companyName: l.company_name,
          company_name: l.company_name,
          name: l.contact_name || l.company_name,
          source: l.primary_solution || 'Outro',
          status: won ? 'converted' : '',
          stage: 'prospecting',
          createdAt: l.created_at,
        };
      });
      ok(res, mapped);
    } catch (e) {
      err(res, 500, String(e));
    }
  });

  app.patch('/api/signals/:id/read', async (req: Request, res: Response) => {
    try {
      const { error } = await supabase
        .from('signals')
        .update({ is_read: true })
        .eq('id', req.params.id);
      if (error) {
        err(res, 500, error.message);
        return;
      }
      ok(res, { ok: true });
    } catch (e) {
      err(res, 500, String(e));
    }
  });
}
