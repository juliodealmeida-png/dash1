import type { Env } from '../config/env.js';

/**
 * Dispara um POST para o webhook n8n (cloud). Usado para sincronização de saída (dashboard → n8n).
 */
export async function n8nTriggerWebhook(
  env: Env,
  pathSegment: string,
  body: unknown
): Promise<{ ok: boolean; status: number; text: string }> {
  const base = env.N8N_BASE_URL?.replace(/\/$/, '') ?? '';
  if (!base) {
    return { ok: false, status: 0, text: 'N8N_BASE_URL não configurado' };
  }
  const path = pathSegment.replace(/^\//, '');
  const url = `${base}/${path}`;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (env.N8N_API_KEY) headers.Authorization = `Bearer ${env.N8N_API_KEY}`;
  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body ?? {}),
  });
  const text = await res.text();
  return { ok: res.ok, status: res.status, text: text.slice(0, 2000) };
}
