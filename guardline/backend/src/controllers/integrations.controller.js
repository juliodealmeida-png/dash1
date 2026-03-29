const jwt = require('jsonwebtoken');
const { prisma } = require('../config/database');
const { ok, fail } = require('../utils/response');
const {
  getAuthUrl,
  exchangeCodeForTokens,
  syncEmailsToDeals,
} = require('../services/gmail.service');
const { sendSlackMessage } = require('../services/slack.service');

const INTEGRATION_TYPES = ['gmail', 'slack', 'n8n', 'whatsapp'];

function frontendOrigin() {
  const raw = process.env.FRONTEND_URL || 'http://localhost:4000';
  return raw.split(',')[0].trim().replace(/\/$/, '');
}

function maskIntegrationRow(row) {
  if (!row) return null;
  let meta = {};
  try {
    meta = row.metadata ? JSON.parse(row.metadata) : {};
  } catch {
    meta = {};
  }
  let configPublic = {};
  if (row.config) {
    try {
      const c = JSON.parse(row.config);
      configPublic = {
        email: c.email || null,
        hasTokens: !!(c.tokens && (c.tokens.access_token || c.tokens.refresh_token)),
      };
    } catch {
      configPublic = {};
    }
  }
  return {
    id: row.id,
    type: row.type,
    status: row.status,
    lastSyncAt: row.lastSyncAt,
    errorMessage: row.errorMessage,
    userId: row.userId,
    metadata: meta,
    config: configPublic,
  };
}

async function integrationForUser(type, userId) {
  let row = await prisma.integration.findFirst({
    where: { type, userId },
    orderBy: { updatedAt: 'desc' },
  });
  if (!row) {
    row = await prisma.integration.findFirst({
      where: { type, userId: null },
      orderBy: { updatedAt: 'desc' },
    });
  }
  return row;
}

async function list(req, res, next) {
  try {
    const items = [];
    for (const type of INTEGRATION_TYPES) {
      const row = await integrationForUser(type, req.user.id);
      if (row) {
        items.push(maskIntegrationRow(row));
        continue;
      }
      let status = 'disconnected';
      if (type === 'slack' && process.env.SLACK_BOT_TOKEN) status = 'connected';
      if (type === 'n8n' && process.env.N8N_BASE_URL) status = 'connected';
      items.push({
        type,
        status,
        lastSyncAt: null,
        errorMessage: null,
        userId: null,
        metadata: {},
        config: {},
      });
    }
    return ok(res, items);
  } catch (e) {
    next(e);
  }
}

async function gmailAuth(req, res, next) {
  try {
    if (!process.env.GMAIL_CLIENT_ID || !process.env.GMAIL_CLIENT_SECRET) {
      return fail(res, 503, 'Gmail OAuth não configurado (GMAIL_CLIENT_ID / GMAIL_CLIENT_SECRET)', 'GMAIL_NOT_CONFIGURED');
    }
    const state = jwt.sign(
      { purpose: 'gmail_oauth', userId: req.user.id },
      process.env.JWT_SECRET,
      { expiresIn: '15m' }
    );
    const authUrl = getAuthUrl(state);
    return ok(res, { authUrl, state });
  } catch (e) {
    next(e);
  }
}

async function gmailCallback(req, res, next) {
  try {
    const { code, state, error } = req.query;
    const base = frontendOrigin();

    if (error) {
      return res.redirect(`${base}/?gmail=error&reason=${encodeURIComponent(String(error))}`);
    }
    if (!code || !state) {
      return res.redirect(`${base}/?gmail=error&reason=missing_params`);
    }

    let payload;
    try {
      payload = jwt.verify(String(state), process.env.JWT_SECRET);
    } catch {
      return res.redirect(`${base}/?gmail=error&reason=invalid_state`);
    }

    if (payload.purpose !== 'gmail_oauth' || !payload.userId) {
      return res.redirect(`${base}/?gmail=error&reason=bad_state`);
    }

    const { tokens, email } = await exchangeCodeForTokens(String(code));
    const config = JSON.stringify({ tokens, email });

    const existing = await prisma.integration.findFirst({
      where: { type: 'gmail', userId: payload.userId },
    });

    if (existing) {
      await prisma.integration.update({
        where: { id: existing.id },
        data: {
          status: 'connected',
          config,
          errorMessage: null,
          metadata: JSON.stringify({ email }),
        },
      });
    } else {
      await prisma.integration.create({
        data: {
          type: 'gmail',
          status: 'connected',
          config,
          userId: payload.userId,
          metadata: JSON.stringify({ email }),
        },
      });
    }

    return res.redirect(`${base}/?gmail=connected`);
  } catch (e) {
    console.error('[integrations] gmail callback:', e.message);
    const base = frontendOrigin();
    return res.redirect(`${base}/?gmail=error&reason=exchange_failed`);
  }
}

async function syncGmail(req, res, next) {
  try {
    const result = await syncEmailsToDeals(req.user.id);
    return ok(res, result);
  } catch (e) {
    next(e);
  }
}

async function testSlack(req, res, next) {
  try {
    if (!process.env.SLACK_BOT_TOKEN) {
      return fail(res, 503, 'SLACK_BOT_TOKEN não configurado', 'SLACK_NOT_CONFIGURED');
    }
    const r = await sendSlackMessage({
      channel: process.env.SLACK_CHANNEL_ALERTS,
      text: '✅ Teste Guardline — integração Slack OK',
    });
    if (r.skipped) {
      return fail(res, 503, r.reason || 'Slack indisponível', 'SLACK_SKIPPED');
    }
    if (!r.ok) {
      return fail(res, 502, r.error || 'Falha ao postar no Slack', 'SLACK_API_ERROR');
    }
    return ok(res, { posted: true, ts: r.ts });
  } catch (e) {
    next(e);
  }
}

async function disconnect(req, res, next) {
  try {
    const type = String(req.params.type || '').toLowerCase();
    if (!INTEGRATION_TYPES.includes(type)) {
      return fail(res, 400, 'Tipo de integração inválido', 'INVALID_TYPE');
    }

    if (type === 'slack' || type === 'n8n') {
      return fail(
        res,
        400,
        'Slack e n8n são configurados via variáveis de ambiente; remova SLACK_BOT_TOKEN / N8N_* no servidor para desligar.',
        'ENV_MANAGED'
      );
    }

    await prisma.integration.deleteMany({
      where: { type, userId: req.user.id },
    });

    return ok(res, { disconnected: true, type });
  } catch (e) {
    next(e);
  }
}

module.exports = {
  list,
  gmailAuth,
  gmailCallback,
  syncGmail,
  testSlack,
  disconnect,
};
