import { Router } from 'express';
import type { Env } from '../config/env.js';
import { n8nWebhook } from '../services/n8nClient.js';

export function hubspotSyncRoutes(env: Env) {
  const r = Router();

  r.get('/deals', async (_req, res) => {
    const out = await n8nWebhook.syncDeals(env);
    res.status(out.ok ? 200 : 502).json(out);
  });

  r.get('/companies', async (_req, res) => {
    const out = await n8nWebhook.syncCompanies(env);
    res.status(out.ok ? 200 : 502).json(out);
  });

  r.get('/contacts', async (_req, res) => {
    const out = await n8nWebhook.syncContacts(env);
    res.status(out.ok ? 200 : 502).json(out);
  });

  r.get('/pipelines', async (_req, res) => {
    const out = await n8nWebhook.syncPipelines(env);
    res.status(out.ok ? 200 : 502).json(out);
  });

  r.get('/owners', async (_req, res) => {
    const out = await n8nWebhook.syncOwners(env);
    res.status(out.ok ? 200 : 502).json(out);
  });

  return r;
}
