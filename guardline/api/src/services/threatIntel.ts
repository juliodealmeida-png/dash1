import { createHash } from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Env } from '../config/env.js';
import { jitter, resolveCoords } from '../data/geocoords.js';

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const THREAT_MODEL = 'llama-3.1-8b-instant';

const FRAUD_TYPE_KEYWORDS = [
  'money laundering',
  'lavagem de dinheiro',
  'wire fraud',
  'fraude',
  'phishing',
  'account takeover',
  'synthetic id',
  'identity theft',
  'roubo de identidade',
  'aml',
  'terrorist financing',
  'sanctions',
  'crypto fraud',
  'pix',
  'segurança',
];

interface ThreatIntelItem {
  title: string;
  description: string;
  source: string;
  country?: string;
  city?: string;
  fraud_type?: string;
  amount?: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  published_at?: string;
}

interface ParsedThreat {
  country?: string;
  city?: string;
  fraud_type?: string;
  amount?: number;
  severity?: 'low' | 'medium' | 'high' | 'critical';
}

const GROQ_CACHE = new Map<string, ParsedThreat>();

function dedupeKey(title: string, source: string) {
  return createHash('sha256')
    .update(`${source}|${title}`.toLowerCase().trim())
    .digest('hex');
}

async function parseWithGroq(env: Env, text: string): Promise<ParsedThreat> {
  const key = env.GROQ_API_KEY;
  if (!key) return {};
  const cacheKey = text.slice(0, 120);
  if (GROQ_CACHE.has(cacheKey)) return GROQ_CACHE.get(cacheKey)!;

  try {
    const res = await fetch(GROQ_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: env.GROQ_MODEL || THREAT_MODEL,
        temperature: 0,
        max_tokens: 180,
        messages: [
          {
            role: 'system',
            content: `Extract from financial fraud/AML text. Return ONLY valid JSON with keys: country, city, fraud_type, amount (number or null), severity (low|medium|high|critical). No markdown.`,
          },
          { role: 'user', content: text.slice(0, 500) },
        ],
      }),
      signal: AbortSignal.timeout(12000),
    });
    const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const raw = json.choices?.[0]?.message?.content || '{}';
    const m = raw.match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(m?.[0] || '{}') as ParsedThreat;
    GROQ_CACHE.set(cacheKey, parsed);
    return parsed;
  } catch {
    return {};
  }
}

async function fetchFATF(env: Env): Promise<ThreatIntelItem[]> {
  try {
    const rssUrl = 'https://www.fatf-gafi.org/en/publications.rss';
    const resp = await fetch(rssUrl, {
      headers: { 'User-Agent': 'Guardline-ThreatIntel/1.0' },
      signal: AbortSignal.timeout(15000),
    });
    if (!resp.ok) return [];
    const text = await resp.text();
    const items = [...text.matchAll(/<item>([\s\S]*?)<\/item>/g)].map((m) => m[1]);
    const parsed: ThreatIntelItem[] = [];
    for (const item of items.slice(0, 10)) {
      const title =
        item.match(/<title><!\[CDATA\[(.*?)\]\]>/)?.[1] ||
        item.match(/<title>(.*?)<\/title>/)?.[1] ||
        '';
      const desc =
        item.match(/<description><!\[CDATA\[(.*?)\]\]>/)?.[1] ||
        item.match(/<description>(.*?)<\/description>/)?.[1] ||
        '';
      const pubDate = item.match(/<pubDate>(.*?)<\/pubDate>/)?.[1];
      const structured = await parseWithGroq(env, `${title} ${desc}`);
      parsed.push({
        title: title.slice(0, 200),
        description: desc.slice(0, 500),
        source: 'FATF',
        country: structured.country,
        fraud_type: structured.fraud_type || 'AML',
        severity: structured.severity || 'high',
        amount: structured.amount,
        published_at: pubDate ? new Date(pubDate).toISOString() : new Date().toISOString(),
      });
    }
    return parsed;
  } catch (e) {
    console.warn('[ThreatIntel] FATF fetch failed:', (e as Error)?.message ?? e);
    return [];
  }
}

async function fetchBacen(env: Env): Promise<ThreatIntelItem[]> {
  try {
    const rssUrl = 'https://www.bcb.gov.br/api/feed/pt-br/notas-imprensa.rss';
    const resp = await fetch(rssUrl, {
      headers: { 'User-Agent': 'Guardline-ThreatIntel/1.0' },
      signal: AbortSignal.timeout(15000),
    });
    if (!resp.ok) return [];
    const text = await resp.text();
    const items = [...text.matchAll(/<item>([\s\S]*?)<\/item>/g)].map((m) => m[1]);
    const parsed: ThreatIntelItem[] = [];
    for (const item of items.slice(0, 12)) {
      const title =
        item.match(/<title>(.*?)<\/title>/)?.[1]?.replace(/&lt;/g, '<').replace(/&gt;/g, '>') || '';
      const link = item.match(/<link>(.*?)<\/link>/)?.[1] || '';
      const pubDate = item.match(/<pubDate>(.*?)<\/pubDate>/)?.[1];
      const lowerTitle = title.toLowerCase();
      if (!FRAUD_TYPE_KEYWORDS.some((k) => lowerTitle.includes(k))) continue;
      const structured = await parseWithGroq(env, title);
      parsed.push({
        title: title.slice(0, 200),
        description: `Fonte: Banco Central do Brasil. ${link}`,
        source: 'BACEN',
        country: structured.country || 'Brasil',
        city: structured.city,
        fraud_type: structured.fraud_type || 'Regulatório',
        severity: 'medium',
        published_at: pubDate ? new Date(pubDate).toISOString() : new Date().toISOString(),
      });
    }
    return parsed;
  } catch (e) {
    console.warn('[ThreatIntel] BACEN fetch failed:', (e as Error)?.message ?? e);
    return [];
  }
}

async function fetchCryptoFraud(env: Env): Promise<ThreatIntelItem[]> {
  try {
    const rssUrl = 'https://www.coindesk.com/arc/outboundfeeds/rss/';
    const resp = await fetch(rssUrl, {
      headers: { 'User-Agent': 'Guardline-ThreatIntel/1.0' },
      signal: AbortSignal.timeout(15000),
    });
    if (!resp.ok) return [];
    const text = await resp.text();
    const items = [...text.matchAll(/<item>([\s\S]*?)<\/item>/g)].map((m) => m[1]);
    const parsed: ThreatIntelItem[] = [];
    for (const item of items.slice(0, 15)) {
      const title =
        item.match(/<title><!\[CDATA\[(.*?)\]\]>/)?.[1] || item.match(/<title>(.*?)<\/title>/)?.[1] || '';
      const lowerTitle = title.toLowerCase();
      if (!['fraud', 'scam', 'hack', 'exploit', 'theft', 'laundering', 'sanctioned'].some((k) => lowerTitle.includes(k)))
        continue;
      const pubDate = item.match(/<pubDate>(.*?)<\/pubDate>/)?.[1];
      const structured = await parseWithGroq(env, title);
      parsed.push({
        title: title.slice(0, 200),
        description: 'Crypto/Fintech fraud alert via CoinDesk',
        source: 'CoinDesk',
        country: structured.country,
        city: structured.city,
        fraud_type: structured.fraud_type || 'Crypto Fraud',
        amount: structured.amount,
        severity: structured.severity || 'high',
        published_at: pubDate ? new Date(pubDate).toISOString() : new Date().toISOString(),
      });
    }
    return parsed.slice(0, 5);
  } catch (e) {
    console.warn('[ThreatIntel] CoinDesk fetch failed:', (e as Error)?.message ?? e);
    return [];
  }
}

export async function ingestThreatIntel(env: Env, supabase: SupabaseClient): Promise<number> {
  if (!env.GROQ_API_KEY) {
    console.warn('[ThreatIntel] GROQ_API_KEY ausente — ingestão limitada (sem parse LLM)');
  }
  const [fatfItems, bacenItems, cryptoItems] = await Promise.all([
    fetchFATF(env),
    fetchBacen(env),
    fetchCryptoFraud(env),
  ]);
  const allItems = [...fatfItems, ...bacenItems, ...cryptoItems];
  let n = 0;
  for (const item of allItems) {
    const dk = dedupeKey(item.title, item.source);
    const coords = resolveCoords(item.country, item.city);
    const jittered = coords ? jitter(coords, 0.3) : { lat: null as number | null, lng: null as number | null };
    const { error } = await supabase.from('threat_intel').upsert(
      {
        dedupe_key: dk,
        title: item.title,
        description: item.description,
        source: item.source,
        country: item.country ?? null,
        city: item.city ?? null,
        lat: jittered.lat,
        lng: jittered.lng,
        fraud_type: item.fraud_type ?? null,
        amount: item.amount ?? null,
        severity: item.severity,
        published_at: item.published_at || new Date().toISOString(),
      },
      { onConflict: 'dedupe_key' }
    );
    if (!error) n++;
  }
  console.log(`[ThreatIntel] ${n}/${allItems.length} itens upsert`);
  return n;
}
