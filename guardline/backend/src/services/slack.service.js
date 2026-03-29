const { WebClient } = require('@slack/web-api');

function getSlackClient() {
  const token = process.env.SLACK_BOT_TOKEN;
  if (!token) return null;
  return new WebClient(token);
}

/**
 * @param {{ channel?: string; text: string; blocks?: unknown[] }} opts
 */
async function sendSlackMessage({ channel, text, blocks }) {
  try {
    const client = getSlackClient();
    if (!client) {
      return { skipped: true, reason: 'SLACK_BOT_TOKEN ausente' };
    }

    const res = await client.chat.postMessage({
      channel: channel || process.env.SLACK_CHANNEL_ALERTS || '#general',
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

async function sendDailyBrief(brief) {
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
    channel: process.env.SLACK_CHANNEL_DAILY,
    text: `☀️ Julio Daily Brief — ${new Date().toLocaleDateString('pt-BR')}`,
    blocks,
  });
}

async function sendDealClosedNotification(deal, ownerName) {
  const name = ownerName || 'Responsável';
  return sendSlackMessage({
    channel: process.env.SLACK_CHANNEL_ALERTS,
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
