import crypto from 'node:crypto';
import type { Request } from 'express';

function safeEq(a: string, b: string): boolean {
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  if (aBuf.length !== bBuf.length) return false;
  return crypto.timingSafeEqual(aBuf, bBuf);
}

function readHeader(req: Request, name: string): string {
  const v = req.get(name) ?? req.get(name.toLowerCase());
  return (v ?? '').trim();
}

function requestUrlForHubspot(req: Request): string {
  const proto = (req.get('x-forwarded-proto') ?? req.protocol).split(',')[0]?.trim() || 'http';
  const host = (req.get('x-forwarded-host') ?? req.get('host') ?? '').split(',')[0]?.trim();
  const path = req.originalUrl || req.url;
  return `${proto}://${host}${path}`;
}

export function verifyHubspotSignatureV3(req: Request, appSecret: string): boolean {
  const signature = readHeader(req, 'X-HubSpot-Signature-v3');
  const timestamp = readHeader(req, 'X-HubSpot-Request-Timestamp');
  if (!signature || !timestamp) return false;

  const ts = Number(timestamp);
  if (!Number.isFinite(ts)) return false;
  const age = Math.abs(Date.now() - ts);
  if (age > 5 * 60 * 1000) return false;

  const method = (req.method || 'POST').toUpperCase();
  const url = requestUrlForHubspot(req);
  const body = req.rawBody ?? '';
  const base = `${method}${url}${body}${timestamp}`;
  const digest = crypto.createHmac('sha256', appSecret).update(base, 'utf8').digest('base64');

  return safeEq(signature, digest);
}

