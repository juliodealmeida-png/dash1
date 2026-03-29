import type { Request } from 'express';
import type { Env } from '../config/env.js';

export function readGuardlineToken(req: Request): string {
  const header = req.get('x-guardline-secret') ?? req.get('X-Guardline-Secret');
  const auth = req.get('authorization');
  const bearer = auth?.replace(/^Bearer\s+/i, '').trim();
  return (header || bearer || '').trim();
}

/** Aceita se qualquer um dos segredos definidos coincidir (útil: N8N + dashboard). */
export function verifyAnySecret(req: Request, ...secrets: (string | undefined)[]): boolean {
  const expected = secrets.filter(Boolean) as string[];
  if (!expected.length) return true;
  const token = readGuardlineToken(req);
  return expected.some((s) => s === token);
}

export function verifyDashboardWebhook(req: Request, env: Env): boolean {
  return verifyAnySecret(req, env.DASHBOARD_WEBHOOK_SECRET, env.N8N_WEBHOOK_SECRET);
}
