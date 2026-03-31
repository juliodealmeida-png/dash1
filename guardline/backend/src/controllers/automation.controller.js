const { prisma } = require('../config/database');
const { emitToUser } = require('../config/socket');
const { ok, fail } = require('../utils/response');
const { executeAction, triggerN8nWebhook } = require('../services/n8n.service');

async function listRecipes(req, res, next) {
  try {
    const recipes = await prisma.automationRecipe.findMany({
      where: { ownerId: req.user.id },
      orderBy: { name: 'asc' },
    });
    return ok(res, recipes);
  } catch (e) {
    next(e);
  }
}

async function listLogs(req, res, next) {
  try {
    const take = Math.min(Number(req.query.take) || 50, 200);
    const logs = await prisma.automationLog.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
      take,
      include: {
        recipe: true,
        deal: { select: { id: true, title: true, companyName: true } },
      },
    });
    return ok(res, logs);
  } catch (e) {
    next(e);
  }
}

async function trigger(req, res, next) {
  try {
    const b = req.body || {};
    const recipeId = b.recipeId ? String(b.recipeId) : '';
    if (!recipeId) return fail(res, 400, 'recipeId é obrigatório', 'VALIDATION_ERROR');

    const recipe = await prisma.automationRecipe.findFirst({ where: { id: recipeId, ownerId: req.user.id } });
    if (!recipe) return fail(res, 404, 'Recipe não encontrada', 'NOT_FOUND');

    const dealId = b.dealId ? String(b.dealId) : null;
    const leadId = b.leadId ? String(b.leadId) : null;

    const [deal, lead] = await Promise.all([
      dealId ? prisma.deal.findFirst({ where: { id: dealId, ownerId: req.user.id } }) : Promise.resolve(null),
      leadId ? prisma.lead.findFirst({ where: { id: leadId, ownerId: req.user.id } }) : Promise.resolve(null),
    ]);

    const log = await prisma.automationLog.create({
      data: {
        recipeId: recipe.id,
        dealId: deal ? deal.id : null,
        triggeredBy: b.triggeredBy ? String(b.triggeredBy).slice(0, 80) : 'manual',
        status: 'running',
        userId: req.user.id,
      },
    });

    const start = Date.now();

    try {
      let actions = [];
      try {
        actions = JSON.parse(recipe.actions || '[]');
      } catch {
        actions = [];
      }
      if (!Array.isArray(actions)) actions = [];

      const ctx = {
        deal,
        lead,
        userId: req.user.id,
        recipeId: recipe.id,
        payload: b.payload || null,
        source: b.source || null,
      };

      const results = [];
      for (const action of actions) {
        results.push(await executeAction(action, ctx));
      }

      const hasN8nAction = actions.some((a) => a && a.type === 'n8n_webhook');
      if (recipe.n8nWorkflowId && !hasN8nAction) {
        results.push(await triggerN8nWebhook(recipe.n8nWorkflowId, ctx));
      }

      const duration = Date.now() - start;
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

      const io = req.app.get('io');
      if (io) {
        emitToUser(io, req.user.id, 'automation:completed', {
          logId: log.id,
          recipeName: recipe.name,
          status: 'success',
          dealName: deal?.companyName,
        });
      }

      return ok(res, { logId: log.id, status: 'success' });
    } catch (err) {
      const duration = Date.now() - start;
      await prisma.automationLog.update({
        where: { id: log.id },
        data: {
          status: 'error',
          errorMessage: (err && err.message) || String(err),
          duration,
        },
      });

      const io = req.app.get('io');
      if (io) {
        emitToUser(io, req.user.id, 'automation:completed', {
          logId: log.id,
          recipeName: recipe.name,
          status: 'error',
          error: (err && err.message) || String(err),
        });
      }

      return fail(res, 500, 'Falha ao executar recipe', 'AUTOMATION_ERROR', { logId: log.id });
    }
  } catch (e) {
    next(e);
  }
}

module.exports = { listRecipes, listLogs, trigger };
