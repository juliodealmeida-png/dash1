const { prisma } = require('../config/database');
const { ok } = require('../utils/response');

async function listRecipes(req, res, next) {
  try {
    const recipes = await prisma.automationRecipe.findMany({ orderBy: { name: 'asc' } });
    return ok(res, recipes);
  } catch (e) {
    next(e);
  }
}

async function listLogs(req, res, next) {
  try {
    const take = Math.min(Number(req.query.take) || 50, 200);
    const logs = await prisma.automationLog.findMany({
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

module.exports = { listRecipes, listLogs };
