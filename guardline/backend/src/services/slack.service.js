const { WebClient } = require('@slack/web-api');
const crypto = require('crypto');
const { prisma } = require('../config/database');

function getSlackClient() {
  const token = process.env.SLACK_BOT_TOKEN;
  if (!token) return null;
  return new WebClient(token);
}

function encryptionKey() {
  const raw = process.env.ENCRYPTION_KEY;
  if (!raw) return null;
  const key = Buffer.from(String(raw), 'utf8');
  if (key.length !== 32) return null;
  return key;
}

function decryptConfigString(config) {
  if (!config || typeof config !== 'string') return config;
  if (!config.startsWith('enc:v1:')) return config;
  const key = encryptionKey();
  if (!key) return config;
  const payload = config.slice('enc:v1:'.length);
  const parts = payload.split('.');
  if (parts.length !== 3) return config;
  try {
    const iv = Buffer.from(parts[0], 'base64');
    const tag = Buffer.from(parts[1], 'base64');
    const enc = Buffer.from(parts[2], 'base64');
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(tag);
    const dec = Buffer.concat([decipher.update(enc), decipher.final()]);
    return dec.toString('utf8');
  } catch {
    return config;
  }
}

async function slackConfigForUser(userId) {
  if (!userId) return null;
  const row = await prisma.integration.findFirst({
    where: { type: 'slack', status: 'connected', userId },
    orderBy: { updatedAt: 'desc' },
  });
  if (!row || !row.config) return null;
  try {
    return JSON.parse(decryptConfigString(row.config));
  } catch {
    return null;
  }
}

/**
 * @param {{ channel?: string; text: string; blocks?: unknown[]; userId?: string; kind?: 'alerts' | 'daily' }} opts
 */
async function sendSlackMessage({ channel, text, blocks, userId, kind = 'alerts' }) {
  try {
    const client = getSlackClient();
    if (!client) {
      return { skipped: true, reason: 'SLACK_BOT_TOKEN ausente' };
    }

    let resolvedChannel = channel;
    if (!resolvedChannel && userId) {
      const cfg = await slackConfigForUser(userId);
      if (cfg) {
        if (kind === 'daily') resolvedChannel = cfg.channelDaily || null;
        else resolvedChannel = cfg.channelAlerts || null;
      }
    }

    const res = await client.chat.postMessage({
      channel: resolvedChannel || process.env.SLACK_CHANNEL_ALERTS || '#general',
      text: text || 'Guardline',
      ...(blocks && blocks.length ? { blocks } : {}),
    });

    if (!res.ok) {
      return { ok: false, error: res.error || 'slack_api_error' };
    }
    return { ok: true, ts: res.ts };
  } catch (error) {
    console.error('[slack]', error.message);
    return { ok: false, error: error.message };
  }
}

async function sendDailyBrief(brief, userId) {
  if (!brief || !brief.items) return { skipped: true };
  const items = Array.isArray(brief.items) ? brief.items : [];
  const blocks = [
    {
      type: 'header',
      text: {
        type: 'plain_text',
        text: `☀️ Julio Daily Brief — ${new Date().toLocaleDateString('pt-BR')}`,
      },
    },
    { type: 'divider' },
    ...items.slice(0, 5).map((item) => ({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*${item.priority}.* ${item.title}\n${item.detail || ''}${
          item.action ? `\n→ _${item.action}_` : ''
        }`,
      },
    })),
    { type: 'divider' },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `📈 *Forecast:* ${brief.forecastNarrative || '—'}`,
      },
    },
  ];

  return sendSlackMessage({
    userId,
    kind: 'daily',
    text: `☀️ Julio Daily Brief — ${new Date().toLocaleDateString('pt-BR')}`,
    blocks,
  });
}

async function sendDealClosedNotification(deal, ownerName, userId) {
  const name = ownerName || 'Responsável';
  return sendSlackMessage({
    userId,
    kind: 'alerts',
    text: `🎉 Deal fechado: ${deal.companyName}`,
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `🎉 *Deal Fechado!*\n*${deal.companyName}* · $${Number(deal.value).toLocaleString('pt-BR')}\nResponsável: ${name}`,
        },
      },
    ],
  });
}

module.exports = {
  sendSlackMessage,
  sendDailyBrief,
  sendDealClosedNotification,
  getSlackClient,
};
