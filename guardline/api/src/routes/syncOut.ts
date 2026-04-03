import { Router } from 'express';
import type { Env } from '../config/env.js';
import { n8nTriggerWebhook } from '../lib/n8nOutbound.js';
import { n8nWebhook } from '../services/n8nClient.js';

/**
 * Dashboard → n8n (URLs fixas em n8nClient ou paths do .env).
 */
export function syncOutRoutes(env: Env) {
  const r = Router();

  r.post('/wf06', async (req, res) => {
    if (env.N8N_BASE_URL) {
      const out = await n8nWebhook.triggerWF06(env, req.body);
      res.status(out.ok ? 200 : 502).json(out);
      return;
    }
    const path = env.N8N_PATH_WF06;
    if (!path) {
      res.status(503).json({ ok: false, error: 'N8N_BASE_URL ou N8N_PATH_WF06' });
      return;
    }
    const out = await n8nTriggerWebhook(env, path, req.body);
    res.status(out.ok ? 200 : 502).json({ ok: out.ok, status: out.status, body: out.text });
  });

  r.post('/wf07', async (req, res) => {
    if (env.N8N_BASE_URL) {
      const out = await n8nWebhook.triggerBatchIntake(env, req.body);
      res.status(out.ok ? 200 : 502).json(out);
      return;
    }
    const path = env.N8N_PATH_WF07_BATCH;
    if (!path) {
      res.status(503).json({ ok: false, error: 'N8N_BASE_URL ou N8N_PATH_WF07_BATCH' });
      return;
    }
    const out = await n8nTriggerWebhook(env, path, req.body);
    res.status(out.ok ? 200 : 502).json({ ok: out.ok, status: out.status, body: out.text });
  });

  r.post('/wf08', async (req, res) => {
    const path = env.N8N_PATH_WF08;
    if (!path) {
      res.status(503).json({ ok: false, error: 'N8N_PATH_WF08 não configurado' });
      return;
    }
    const out = await n8nTriggerWebhook(env, path, req.body);
    res.status(out.ok ? 200 : 502).json({ ok: out.ok, status: out.status, body: out.text });
  });

  return r;
}
