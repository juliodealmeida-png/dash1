import { Router, type Request, type Response } from 'express';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Env } from '../config/env.js';
import { geocodeLeads, geocodeSignal } from '../services/geocoder.js';
import { sseBroadcast } from '../lib/sseHub.js';

export function fraudMapRoutes(env: Env, supabase: SupabaseClient) {
  const r = Router();

  const toFeature = (item: Record<string, unknown>, layer: string) => ({
    type: 'Feature' as const,
    geometry: { type: 'Point' as const, coordinates: [Number(item.lng), Number(item.lat)] },
    properties: { ...item, _layer: layer },
  });

  r.get('/layers', async (req: Request, res: Response) => {
    const period = (req.query.period as string) || '24h';
    const layerFilter = (req.query.layer as string) || 'all';
    const hours = period === '7d' ? 168 : period === '15d' ? 360 : period === '30d' ? 720 : 24;
    const cutoff = new Date(Date.now() - hours * 3600 * 1000).toISOString();
    const countryParam = ((req.query.country as string) || '').trim();

    const COUNTRY_PATTERNS: Record<string, string[]> = {
      BR: ['Brasil', 'Brazil', 'BR'],
      MX: ['México', 'Mexico', 'MX'],
      AR: ['Argentina', 'AR'],
      CO: ['Colombia', 'CO'],
      CL: ['Chile', 'CL'],
      PE: ['Perú', 'Peru', 'PE'],
      US: ['United States', 'USA', 'US', 'EUA'],
      PT: ['Portugal', 'PT'],
      ES: ['España', 'Espanha', 'Spain', 'ES'],
    };

    const countryPatterns =
      countryParam.length > 0 ? COUNTRY_PATTERNS[countryParam.toUpperCase()] ?? [countryParam] : null;

    const orIlike = (col: string) =>
      (countryPatterns || []).map((p) => `${col}.ilike.%${p.replace(/%/g, '')}%`).join(',');

    const empty = { data: [] as unknown[], error: null };

    const [leadsResult, signalsResult, threatResult] = await Promise.all([
      layerFilter === 'all' || layerFilter === 'lead_risk'
        ? (() => {
            let q = supabase
            .from('leads')
            .select(
              'id, company_name, company_domain, company_country, city, lat, lng, lead_score, account_tier, market_priority, owner_name, company_industry, processed_at'
            )
            .not('lat', 'is', null)
            .gte('lead_score', 50)
            .order('lead_score', { ascending: false })
            .limit(200);
            if (countryPatterns) q = q.or(orIlike('company_country'));
            return q;
          })()
        : Promise.resolve(empty),

      layerFilter === 'all' || layerFilter === 'signal'
        ? (() => {
            let q = supabase
            .from('signals')
            .select(
              'id, type, title, description, severity, lat, lng, city, country, fraud_type, amount, created_at, lead_id, deal_id'
            )
            .not('lat', 'is', null)
            .gte('created_at', cutoff)
            .order('created_at', { ascending: false })
            .limit(100);
            if (countryPatterns) q = q.or(orIlike('country'));
            return q;
          })()
        : Promise.resolve(empty),

      layerFilter === 'all' || layerFilter === 'threat_intel'
        ? (() => {
            let q = supabase
            .from('threat_intel')
            .select(
              'id, title, description, source, country, city, lat, lng, fraud_type, amount, severity, published_at'
            )
            .not('lat', 'is', null)
            .gte('published_at', cutoff)
            .order('published_at', { ascending: false })
            .limit(50);
            if (countryPatterns) q = q.or(orIlike('country'));
            return q;
          })()
        : Promise.resolve(empty),
    ]);

    const leadRows = ((leadsResult.data ?? []) as Record<string, unknown>[]).map((l) => ({
      ...l,
      account: l.company_name,
      domain: l.company_domain,
      country: l.company_country,
      owner: l.owner_name,
      industry: l.company_industry,
    }));

    const signalRows = ((signalsResult.data ?? []) as Record<string, unknown>[]).map((s) => ({
      ...s,
      detail: s.description,
    }));

    const leadFeatures = leadRows.map((l) => toFeature(l, 'lead_risk'));
    const signalFeatures = signalRows.map((s) => toFeature(s, 'signal'));
    const threatFeatures = ((threatResult.data ?? []) as Record<string, unknown>[]).map((t) => toFeature(t, 'threat_intel'));

    const num = (v: unknown) => (typeof v === 'number' && !Number.isNaN(v) ? v : Number(v) || 0);
    const prop = (f: { properties: Record<string, unknown> }, k: string) => (f.properties as Record<string, unknown>)[k];

    const stats = {
      total_events: signalFeatures.length + threatFeatures.length,
      total_leads_at_risk: leadFeatures.filter((f) => num(prop(f, 'lead_score')) >= 75).length,
      total_value_at_risk: [...signalFeatures, ...threatFeatures].reduce((a, f) => a + num(prop(f, 'amount')), 0),
      blocked_count: signalFeatures.filter((f) => prop(f, 'severity') === 'critical').length,
      countries_affected: [
        ...new Set(
          [...leadFeatures, ...signalFeatures]
            .map((f) => prop(f, 'country') as string | undefined)
            .filter(Boolean)
        ),
      ].length,
    };

    res.json({
      layers: {
        lead_risk: { type: 'FeatureCollection', features: leadFeatures },
        signal: { type: 'FeatureCollection', features: signalFeatures },
        threat_intel: { type: 'FeatureCollection', features: threatFeatures },
      },
      stats,
      generated_at: new Date().toISOString(),
    });
  });

  r.post('/signal', async (req: Request, res: Response) => {
    const { type, title, detail, description, severity, country, city, fraud_type, amount, lead_id } = req.body as Record<
      string,
      unknown
    >;
    const desc = (typeof detail === 'string' ? detail : typeof description === 'string' ? description : '') || '';
    const coords = geocodeSignal({
      country: typeof country === 'string' ? country : null,
      city: typeof city === 'string' ? city : null,
      description: desc,
    });

    const { data, error } = await supabase
      .from('signals')
      .insert({
        type: (typeof type === 'string' ? type : null) || 'threat',
        title: typeof title === 'string' ? title : 'Signal',
        description: desc || null,
        severity: (typeof severity === 'string' ? severity : null) || 'medium',
        lat: coords?.lat ?? null,
        lng: coords?.lng ?? null,
        city: typeof city === 'string' ? city : null,
        country: typeof country === 'string' ? country : null,
        fraud_type: typeof fraud_type === 'string' ? fraud_type : null,
        amount: amount != null ? Number(amount) : null,
        lead_id: typeof lead_id === 'string' ? lead_id : null,
        map_layer: 'signal',
        is_read: false,
      })
      .select()
      .maybeSingle();

    if (error) {
      res.status(400).json({ error: error.message });
      return;
    }

    if (data && coords) {
      const row = data as Record<string, unknown>;
      sseBroadcast({
        source: 'system',
        topic: 'map:new_signal',
        at: new Date().toISOString(),
        payload: {
          feature: {
            type: 'Feature',
            geometry: { type: 'Point', coordinates: [coords.lng, coords.lat] },
            properties: { ...row, detail: row.description, _layer: 'signal' },
          },
        },
      });
    }

    res.json({ ok: true, signal: data });
  });

  r.post('/geocode-leads', async (_req: Request, res: Response) => {
    const n = await geocodeLeads(supabase);
    res.json({ ok: true, updated: n });
  });

  r.post('/ingest-threat-intel', async (_req: Request, res: Response) => {
    const { ingestThreatIntel } = await import('../services/threatIntel.js');
    const n = await ingestThreatIntel(env, supabase);
    res.json({ ok: true, upserted: n });
  });

  r.get('/heatmap', async (_req: Request, res: Response) => {
    const { data: leads } = await supabase
      .from('leads')
      .select('company_country, lat, lng, lead_score')
      .not('lat', 'is', null);

    const features = (leads || []).map((l: { lng?: number; lat?: number; lead_score?: number }) => ({
      type: 'Feature' as const,
      geometry: { type: 'Point' as const, coordinates: [Number(l.lng), Number(l.lat)] },
      properties: { weight: ((l.lead_score ?? 50) as number) / 100 },
    }));

    res.json({ type: 'FeatureCollection', features });
  });

  return r;
}
