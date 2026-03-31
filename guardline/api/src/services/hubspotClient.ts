import type { Env } from '../config/env.js';

type HubspotObject<TProps extends Record<string, unknown>> = {
  id: string;
  properties: TProps;
  createdAt?: string;
  updatedAt?: string;
  archived?: boolean;
};

type HubspotErrorBody = {
  status?: string;
  message?: string;
  correlationId?: string;
  category?: string;
};

async function hubspotFetch<T>(env: Env, path: string, init?: RequestInit): Promise<T> {
  if (!env.HUBSPOT_PAT) throw new Error('HUBSPOT_PAT não configurado');

  const url = `https://api.hubapi.com${path}`;
  const res = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${env.HUBSPOT_PAT}`,
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  });

  if (!res.ok) {
    let body: HubspotErrorBody | undefined;
    try {
      body = (await res.json()) as HubspotErrorBody;
    } catch {
      body = undefined;
    }
    const msg = body?.message || `HubSpot HTTP ${res.status}`;
    const err = new Error(msg);
    (err as Error & { status?: number; details?: HubspotErrorBody }).status = res.status;
    (err as Error & { status?: number; details?: HubspotErrorBody }).details = body;
    throw err;
  }

  return (await res.json()) as T;
}

export type HubspotDealProps = {
  dealname?: string | null;
  dealstage?: string | null;
  amount?: string | null;
  pipeline?: string | null;
  closedate?: string | null;
  hubspot_owner_id?: string | null;
  hs_lastmodifieddate?: string | null;
  hs_probability?: string | null;
};

export async function hubspotGetDeal(env: Env, id: string): Promise<HubspotObject<HubspotDealProps>> {
  const props = [
    'dealname',
    'dealstage',
    'amount',
    'pipeline',
    'closedate',
    'hubspot_owner_id',
    'hs_lastmodifieddate',
    'hs_probability',
  ].join(',');
  return hubspotFetch(env, `/crm/v3/objects/deals/${encodeURIComponent(id)}?properties=${encodeURIComponent(props)}`);
}

export type HubspotCreateDealBody = {
  properties: Record<string, unknown>;
  associations?: unknown[];
};

export async function hubspotCreateDeal(env: Env, body: HubspotCreateDealBody): Promise<HubspotObject<Record<string, unknown>>> {
  return hubspotFetch(env, `/crm/v3/objects/deals`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function hubspotUpdateDeal(
  env: Env,
  id: string,
  body: { properties: Record<string, unknown> }
): Promise<HubspotObject<Record<string, unknown>>> {
  return hubspotFetch(env, `/crm/v3/objects/deals/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}

