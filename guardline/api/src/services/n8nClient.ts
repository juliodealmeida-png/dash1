import axios, { type AxiosInstance } from 'axios';
import type { Env } from '../config/env.js';

function client(env: Env): AxiosInstance | null {
  const base = env.N8N_BASE_URL?.replace(/\/$/, '');
  if (!base) return null;
  return axios.create({
    baseURL: base,
    timeout: 120_000,
    headers: {
      'Content-Type': 'application/json',
      ...(env.N8N_API_KEY ? { Authorization: `Bearer ${env.N8N_API_KEY}` } : {}),
    },
  });
}

async function post(c: AxiosInstance | null, path: string, body?: unknown) {
  if (!c) return { ok: false as const, error: 'N8N_BASE_URL não configurado' };
  const p = path.startsWith('/') ? path : `/${path}`;
  try {
    const res = await c.post(p, body ?? {});
    return { ok: true as const, status: res.status, data: res.data };
  } catch (e: unknown) {
    const err = e as { response?: { status?: number; data?: unknown }; message?: string };
    return {
      ok: false as const,
      status: err.response?.status ?? 0,
      error: String(err.response?.data ?? err.message ?? e),
    };
  }
}

async function get(c: AxiosInstance | null, path: string) {
  if (!c) return { ok: false as const, error: 'N8N_BASE_URL não configurado' };
  const p = path.startsWith('/') ? path : `/${path}`;
  try {
    const res = await c.get(p);
    return { ok: true as const, status: res.status, data: res.data };
  } catch (e: unknown) {
    const err = e as { response?: { status?: number; data?: unknown }; message?: string };
    return {
      ok: false as const,
      status: err.response?.status ?? 0,
      error: String(err.response?.data ?? err.message ?? e),
    };
  }
}

export const n8nWebhook = {
  triggerWF06: (env: Env, payload: object) =>
    post(client(env), '/webhook/wf06-guardline-autonomous-revenue-system-v52-execution-ready', payload),

  triggerBatchIntake: (env: Env, payload: object) =>
    post(client(env), '/webhook/wf07-guardline-batch-intake-v1', payload),

  triggerApolloCallback: (env: Env, payload: object) =>
    post(client(env), '/webhook/wf07-guardline-apollo-waterfall-callback-v1', payload),

  triggerFirstPartyIntent: (env: Env, payload: object) =>
    post(client(env), '/webhook/wf07-guardline-first-party-intent-v1', payload),

  triggerMeetingMemory: (env: Env, payload: object) =>
    post(client(env), '/webhook/wf07-guardline-meeting-memory-ingest-v1', payload),

  triggerReplyIntake: (env: Env, payload: object) =>
    post(client(env), '/webhook/wf07-guardline-reply-intake-v1', payload),

  triggerSignalRefresh: (env: Env, payload: object) =>
    post(client(env), '/webhook/wf07-guardline-signal-refresh-v1', payload),

  syncDeals: (env: Env) => get(client(env), '/webhook/hubspot-get-deals'),
  syncCompanies: (env: Env) => get(client(env), '/webhook/hubspot-get-companies'),
  syncContacts: (env: Env) => get(client(env), '/webhook/hubspot-get-contacts'),
  syncPipelines: (env: Env) => get(client(env), '/webhook/hubspot-get-pipelines'),
  syncOwners: (env: Env) => get(client(env), '/webhook/hubspot-get-owners'),

  /** Sink onde o WF06 publica o resultado (o próprio n8n chama a nossa API; isto é raramente usado no servidor) */
  postWf06ResultSink: (env: Env, payload: object) =>
    post(client(env), '/webhook/wf06-result-sink', payload),
};
