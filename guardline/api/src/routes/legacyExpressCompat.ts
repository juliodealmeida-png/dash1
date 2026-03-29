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

      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const [critResult, recentSigResult, leadsMonthResult, fraudTodayResult] = await Promise.all([
        supabase.from('signals').select('id', { count: 'exact', head: true })
          .eq('is_read', false).in('severity', ['critical', 'warning']),
        supabase.from('signals').select('*').eq('is_read', false)
          .order('created_at', { ascending: false }).limit(20),
        supabase.from('leads').select('id', { count: 'exact', head: true })
          .gte('created_at', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()),
        supabase.from('fraud_events').select('id', { count: 'exact', head: true })
          .gte('detected_at', todayStart.toISOString()),
      ]);

      const crit = critResult.count;
      const recentSig = recentSigResult.data;
      const leadsMonth = leadsMonthResult.count;
      const fraudToday = fraudTodayResult.count ?? 0;

      const pipelineValue = pipelineTotal;
      const denom = forecastCommitted * 3 || 1;
      const coverageRatio = pipelineValue > 0 ? Number((pipelineValue / denom).toFixed(2)) : 0;
      const atRiskScore = active.length > 0
        ? Math.round(active.reduce((s, d) => s + Math.max(0, 100 - Number(d.deal_probability ?? 0)), 0) / active.length)
        : 50;
      let healthScore = Math.max(0, Math.round(100 - atRiskScore * 0.6 + Math.min(20, coverageRatio * 5)));
      healthScore = Math.min(healthScore, 100);

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
        fraudToday,
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
      // Try julio_insights first (real AI-generated briefs)
      const { data: insights, error: insightsErr } = await supabase
        .from('julio_insights')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1);

      if (!insightsErr && insights && insights.length > 0) {
        const row = insights[0] as Record<string, unknown>;
        const content = String(row.content ?? row.brief ?? row.text ?? '');
        const items = content
          ? content.split('\n').filter((l: string) => l.trim()).slice(0, 8)
          : [];
        if (items.length > 0) {
          ok(res, {
            brief: { items, bullets: items, generated_at: String(row.created_at ?? new Date().toISOString()) },
          });
          return;
        }
      }

      // Try julio_ai_chats for most recent assistant message
      const { data: chats, error: chatsErr } = await supabase
        .from('julio_ai_chats')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);

      if (!chatsErr && chats && chats.length > 0) {
        const assistantMsgs = (chats as Record<string, unknown>[]).filter(
          (c) => String(c.role ?? c.type ?? '') === 'assistant'
        );
        if (assistantMsgs.length > 0) {
          const msg = assistantMsgs[0];
          const content = String(msg.content ?? msg.message ?? msg.text ?? '');
          const items = content.split('\n').filter((l: string) => l.trim()).slice(0, 8);
          if (items.length > 0) {
            ok(res, {
              brief: { items, bullets: items, generated_at: String(msg.created_at ?? new Date().toISOString()) },
            });
            return;
          }
        }
      }

      // Fallback: build contextual brief from top leads + deals
      const [leadsRes, dealsRes] = await Promise.all([
        supabase.from('leads').select('company_name, lead_score, owner_name, next_action, primary_solution, lead_temperature')
          .gte('lead_score', 65).order('lead_score', { ascending: false }).limit(5),
        supabase.from('deals').select('deal_name, deal_amount, deal_stage, deal_probability')
          .not('deal_stage', 'in', '("1031112083","1031112084","closed_won","closed_lost","won","lost")')
          .order('deal_amount', { ascending: false }).limit(3),
      ]);

      const leads = leadsRes.data ?? [];
      const deals = dealsRes.data ?? [];

      const items: string[] = [];
      if (deals.length > 0) {
        items.push(`📊 Pipeline ativo: ${deals.length} deals prioritários em andamento.`);
        for (const d of deals) {
          const val = Number(d.deal_amount ?? 0);
          items.push(`  • ${d.deal_name ?? 'Deal'} — R$ ${val.toLocaleString('pt-BR')} (prob. ${d.deal_probability ?? 0}%)`);
        }
      }
      if (leads.length > 0) {
        items.push(`🔥 Leads quentes para follow-up hoje:`);
        for (const l of leads) {
          items.push(`  • ${l.company_name ?? 'Lead'} — score ${l.lead_score ?? 0}${l.next_action ? '; próxima ação: ' + l.next_action : ''}`);
        }
      }
      if (items.length === 0) {
        items.push('Nenhum dado disponível para o briefing de hoje.');
      }

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

  // ── Reverse stage map: internal names → Supabase deal_stage ──────────────
  const STAGE_TO_DB: Record<string, string> = {
    prospecting: '1031112078',
    qualification: '1031112080',
    proposal: '1160559924',
    negotiation: '1311981861',
    won: '1031112083',
    lost: '1031112084',
  };

  // ── PATCH /api/deals/:id/stage ────────────────────────────────────────────
  app.patch('/api/deals/:id/stage', async (req: Request, res: Response) => {
    try {
      const body = (req.body ?? {}) as Record<string, unknown>;
      const stageInput = String(body.stage ?? '');
      const dealStage = STAGE_TO_DB[stageInput] ?? stageInput;
      const { data, error } = await supabase
        .from('deals')
        .update({ deal_stage: dealStage, updated_at: new Date().toISOString() })
        .eq('id', req.params.id)
        .select()
        .maybeSingle();
      if (error) { err(res, 500, error.message); return; }
      if (!data) { err(res, 404, 'Deal não encontrado'); return; }
      ok(res, mapDealRow(data as Record<string, unknown>));
    } catch (e) {
      err(res, 500, String(e));
    }
  });

  // ── POST /api/deals ───────────────────────────────────────────────────────
  app.post('/api/deals', async (req: Request, res: Response) => {
    try {
      const body = (req.body ?? {}) as Record<string, unknown>;
      const stageInput = String(body.stage ?? 'prospecting');
      const row: Record<string, unknown> = {
        deal_name: body.companyName ?? body.deal_name ?? body.name ?? 'Novo Deal',
        deal_stage: STAGE_TO_DB[stageInput] ?? stageInput,
        deal_amount: Number(body.value ?? body.deal_amount ?? 0),
        deal_probability: Number(body.probability ?? body.deal_probability ?? 0),
        company_name: String(body.companyName ?? body.company_name ?? ''),
        contact_name: String(body.contactName ?? body.contact_name ?? ''),
        contact_email: String(body.email ?? body.contact_email ?? ''),
        source: String(body.source ?? 'dashboard'),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      const { data, error } = await supabase.from('deals').insert(row).select().single();
      if (error) { err(res, 500, error.message); return; }
      ok(res, mapDealRow(data as Record<string, unknown>));
    } catch (e) {
      err(res, 500, String(e));
    }
  });

  // ── DELETE /api/deals/:id ─────────────────────────────────────────────────
  app.delete('/api/deals/:id', async (req: Request, res: Response) => {
    try {
      const { error } = await supabase.from('deals').delete().eq('id', req.params.id);
      if (error) { err(res, 500, error.message); return; }
      ok(res, { deleted: true });
    } catch (e) {
      err(res, 500, String(e));
    }
  });

  // ── PATCH /api/leads/:id ──────────────────────────────────────────────────
  app.patch('/api/leads/:id', async (req: Request, res: Response) => {
    try {
      const body = (req.body ?? {}) as Record<string, unknown>;
      const patch = { ...body, updated_at: new Date().toISOString() };
      const { data, error } = await supabase
        .from('leads')
        .update(patch)
        .eq('id', req.params.id)
        .select()
        .maybeSingle();
      if (error) { err(res, 500, error.message); return; }
      if (!data) { err(res, 404, 'Lead não encontrado'); return; }
      ok(res, data);
    } catch (e) {
      err(res, 500, String(e));
    }
  });

  // ── POST /api/leads ───────────────────────────────────────────────────────
  app.post('/api/leads', async (req: Request, res: Response) => {
    try {
      const body = (req.body ?? {}) as Record<string, unknown>;
      const row: Record<string, unknown> = {
        company_name: body.companyName ?? body.company_name ?? '',
        contact_name: body.contactName ?? body.contact_name ?? body.name ?? '',
        contact_email: body.email ?? body.contact_email ?? '',
        contact_title: body.title ?? body.contact_title ?? '',
        company_industry: body.industry ?? body.company_industry ?? '',
        company_country: body.country ?? body.company_country ?? '',
        company_headcount: body.teamSize ?? body.company_headcount ?? '',
        primary_solution: body.problem ?? body.primary_solution ?? '',
        pipeline_stage: 'new_lead',
        lead_score: 0,
        route: 'processing',
        lead_id: String(body.email ?? body.contact_email ?? `lead_${Date.now()}`),
        processed_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      const { data, error } = await supabase.from('leads').insert(row).select().single();
      if (error) { err(res, 500, error.message); return; }
      ok(res, data);
    } catch (e) {
      err(res, 500, String(e));
    }
  });
}
