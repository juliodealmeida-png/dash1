import { Router, type Request, type Response } from 'express';
import { sseAddClient, sseBroadcast, sseRemoveClient } from '../lib/sseHub.js';
import type { Env } from '../config/env.js';

export function sseRoutes(_env: Env) {
  const r = Router();

  r.get('/stream', (req: Request, res: Response) => {
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    if (typeof res.flushHeaders === 'function') res.flushHeaders();

    const id = sseAddClient(res);
    res.write(`event: connected\n`);
    res.write(`data: ${JSON.stringify({ clientId: id, at: new Date().toISOString() })}\n\n`);

    const ping = setInterval(() => {
      try {
        res.write(`: ping ${Date.now()}\n\n`);
      } catch {
        clearInterval(ping);
      }
    }, 25000);

    req.on('close', () => {
      clearInterval(ping);
      sseRemoveClient(id);
    });
  });

  r.post('/ping', (_req, res) => {
    sseBroadcast({
      source: 'system',
      topic: 'manual_ping',
      at: new Date().toISOString(),
      payload: { message: 'ping' },
    });
    res.json({ ok: true });
  });

  return r;
}
