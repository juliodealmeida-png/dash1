const axios = require('axios');
const { prisma } = require('../config/database');
const { emitToUser } = require('../config/socket');

function n8nAxios() {
  const base = process.env.N8N_BASE_URL || 'http://localhost:5678';
  const key = process.env.N8N_API_KEY || '';
  return axios.create({
    baseURL: base.replace(/\/$/, ''),
    headers: key ? { 'X-N8N-API-KEY': key } : {},
    timeout: 15000,
    validateStatus: () => true,
  });
}

async function triggerN8nWebhook(webhookPath, payload) {
  const path = String(webhookPath || '').replace(/^\//, '');
  try {
    if (/^https?:\/\//i.test(path)) {
      const response = await axios.post(path, payload, { timeout: 15000, validateStatus: () => true });
      const ok = response.status >= 200 && response.status < 300;
      return { success: ok, data: response.data, status: response.status };
    }
    const client = n8nAxios();
    const url = `/webhook/${path}`;
    const response = await client.post(url, payload);
    const ok = response.status >= 200 && response.status < 300;
    return { success: ok, data: response.data, status: response.status };
  } catch (error) {
    console.error(`[n8n] webhook ${webhookPath}:`, error.message);
    return { success: false, error: error.message };
  }
}

async function executeAction(action, context) {
  const { deal, lead, userId } = context;

  switch (action.type) {
    case 'send_email': {
      if (!deal || !deal.contactEmail) throw new Error('Deal sem email de contato');
      const { sendEmail } = require('./gmail.service');
      return sendEmail({
        to: deal.contactEmail,
        subject: (action.subject || '').replace(/\{company\}/g, deal.companyName),
        body: (action.body || '')
          .replace(/\{company\}/g, deal.companyName)
          .replace(/\{value\}/g, `$${Number(deal.value).toLocaleString('en-US')}`),
        userId,
      });
    }
    case 'send_slack': {
      const { sendSlackMessage } = require('./slack.service');
      return sendSlackMessage({
        channel: action.channel || process.env.SLACK_CHANNEL_ALERTS,
        text: (action.message || '').replace(/\{company\}/g, deal?.companyName || lead?.name || ''),
      });
    }
    case 'create_task': {
      if (!deal) throw new Error('Deal ausente');
      return prisma.dealActivity.create({
        data: {
          dealId: deal.id,
          type: 'task',
          title: (action.title || 'Task').replace(/\{company\}/g, deal.companyName),
          note: action.note || null,
          date: new Date(Date.now() + (action.daysFromNow || 1) * 86400000),
        },
      });
    }
    case 'n8n_webhook':
      return triggerN8nWebhook(action.webhookPath, { deal, lead, ...context });
    default:
      throw new Error(`Tipo de ação desconhecido: ${action.type}`);
  }
}

/**
 * @param {string} eventType ex.: stage_changed, new_lead
 * @param {{ deal?: object; lead?: object; io?: import('socket.io').Server; userId?: string; previousStage?: string; newStage?: string }} ctx
 */
async function triggerAutomations(eventType, ctx) {
  const { deal, lead, io, userId } = ctx;

  const recipes = await prisma.automationRecipe.findMany({
    where: { active: true },
  });

  const matched = recipes.filter((r) => r.trigger === eventType || r.trigger === '*' || r.trigger === 'all');
  const ownerId = deal?.ownerId || lead?.ownerId || userId;

  for (const recipe of matched) {
    const log = await prisma.automationLog.create({
      data: {
        recipeId: recipe.id,
        dealId: deal?.id || null,
        triggeredBy: eventType,
        status: 'running',
        userId: ownerId || null,
      },
    });

    const startTime = Date.now();

    try {
      let actions = [];
      try {
        actions = JSON.parse(recipe.actions || '[]');
      } catch {
        actions = [];
      }

      const results = [];
      for (const action of actions) {
        const result = await executeAction(action, { deal, lead, userId: ownerId, ...ctx });
        results.push(result);
      }

      const duration = Date.now() - startTime;
      await prisma.automationLog.update({
        where: { id: log.id },
        data: {
          status: 'success',
          result: JSON.stringify(results),
          duration,
        },
      });

      await prisma.automationRecipe.update({
        where: { id: recipe.id },
        data: { timesActivated: { increment: 1 }, lastActivated: new Date() },
      });

      if (io && ownerId) {
        emitToUser(io, ownerId, 'automation:completed', {
          logId: log.id,
          recipeName: recipe.name,
          status: 'success',
          dealName: deal?.companyName,
        });
      }
    } catch (error) {
      await prisma.automationLog.update({
        where: { id: log.id },
        data: {
          status: 'error',
          errorMessage: error.message,
          duration: Date.now() - startTime,
        },
      });

      if (io && ownerId) {
        emitToUser(io, ownerId, 'automation:completed', {
          logId: log.id,
          recipeName: recipe.name,
          status: 'error',
          error: error.message,
        });
      }
    }
  }
}

module.exports = {
  triggerAutomations,
  triggerN8nWebhook,
  executeAction,
};
