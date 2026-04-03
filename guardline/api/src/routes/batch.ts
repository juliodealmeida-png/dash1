import { Router } from 'express';
import type { Env } from '../config/env.js';
import { n8nWebhook } from '../services/n8nClient.js';

export function batchRoutes(env: Env) {
  const r = Router();

  r.post('/', async (req, res) => {
    const out = await n8nWebhook.triggerBatchIntake(env, req.body ?? {});
    res.status(out.ok ? 200 : 502).json({ ok: out.ok, wf07_response: out.ok ? out.data : out });
  });

  return r;
}
