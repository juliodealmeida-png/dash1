'use strict';

const crypto = require('crypto');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// ── Stage map: HubSpot internal stage value → Guardline stage ──
const HS_STAGE_MAP = {
  appointmentscheduled: 'qualification',
  qualifiedtobuy: 'qualification',
  presentationscheduled: 'scope',
  decisionmakerboughtin: 'active',
  contractsent: 'proposal',
  closedwon: 'won',
  closedlost: 'lost',
  // custom stages (add more as needed)
  qualification: 'qualification',
  scope: 'scope',
  active: 'active',
  proposal: 'proposal',
  negotiate: 'negotiate',
  commit: 'commit',
  won: 'won',
  lost: 'lost',
};

function mapStage(hsStage) {
  if (!hsStage) return null;
  return HS_STAGE_MAP[String(hsStage).toLowerCase()] || String(hsStage).toLowerCase();
}

function verifySignature(req) {
  const secret = process.env.HUBSPOT_WEBHOOK_SECRET;
  if (!secret) return true; // skip verification if not configured
  const sig = req.headers['x-hubspot-signature-v3'] || req.headers['x-hubspot-signature'];
  if (!sig) return false;
  const body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
  const expected = crypto
    .createHmac('sha256', secret)
    .update(body)
    .digest('hex');
  return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
}

// GET /webhooks/hubspot — challenge verification
async function verify(req, res) {
  return res.json({ ok: true });
}

// POST /webhooks/hubspot — receive events
async function receive(req, res) {
  if (!verifySignature(req)) {
    return res.status(401).json({ ok: false, error: 'Invalid signature' });
  }

  const events = Array.isArray(req.body) ? req.body : [req.body];
  const results = [];

  for (const event of events) {
    try {
      const result = await processEvent(event);
      results.push({ subscriptionType: event.subscriptionType, objectId: event.objectId, result });
    } catch (err) {
      results.push({ subscriptionType: event.subscriptionType, objectId: event.objectId, error: err.message });
    }
  }

  return res.json({ ok: true, processed: results.length, results });
}

async function processEvent(event) {
  const { subscriptionType, objectId, propertyValue, propertyName } = event;

  if (!subscriptionType) return 'skipped:no-type';

  // ── deal.propertyChange (stage change) ──
  if (subscriptionType === 'deal.propertyChange' && propertyName === 'dealstage') {
    return handleStageChange(objectId, propertyValue, event);
  }

  // ── deal.creation ──
  if (subscriptionType === 'deal.creation') {
    return handleDealCreation(objectId, event);
  }

  // ── deal.deletion ──
  if (subscriptionType === 'deal.deletion') {
    return handleDealDeletion(objectId, event);
  }

  return 'skipped:unhandled-type';
}

async function handleStageChange(hsObjectId, hsStage, event) {
  const stage = mapStage(hsStage);
  if (!stage) return 'skipped:unmapped-stage';

  const existing = await prisma.deal.findFirst({
    where: { tags: { contains: `hs:${hsObjectId}` }, deletedAt: null },
  });

  if (!existing) {
    // Deal não existe localmente — cria placeholder para rastreio
    return await createPlaceholderDeal(hsObjectId, stage, event);
  }

  await prisma.deal.update({
    where: { id: existing.id },
    data: {
      stage,
      stageChangedAt: new Date(),
      updatedAt: new Date(),
    },
  });
  return `updated:${existing.id}:stage=${stage}`;
}

async function handleDealCreation(hsObjectId, event) {
  const existing = await prisma.deal.findFirst({
    where: { tags: { contains: `hs:${hsObjectId}` }, deletedAt: null },
  });
  if (existing) return `already-exists:${existing.id}`;
  return await createPlaceholderDeal(hsObjectId, 'qualification', event);
}

async function handleDealDeletion(hsObjectId) {
  const existing = await prisma.deal.findFirst({
    where: { tags: { contains: `hs:${hsObjectId}` }, deletedAt: null },
  });
  if (!existing) return 'not-found';
  await prisma.deal.update({
    where: { id: existing.id },
    data: { deletedAt: new Date() },
  });
  return `soft-deleted:${existing.id}`;
}

async function createPlaceholderDeal(hsObjectId, stage, event) {
  // Find or use system owner
  const owner = await prisma.user.findFirst({ orderBy: { createdAt: 'asc' } });
  if (!owner) return 'error:no-owner';

  const deal = await prisma.deal.create({
    data: {
      title: `HubSpot Deal #${hsObjectId}`,
      companyName: event.companyName || 'HubSpot Import',
      value: parseFloat(event.amount || 0),
      stage,
      source: 'hubspot',
      tags: `hs:${hsObjectId}`,
      ownerId: owner.id,
      stageChangedAt: new Date(),
    },
  });
  return `created:${deal.id}`;
}

module.exports = { verify, receive };
