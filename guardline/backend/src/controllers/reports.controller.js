const { prisma } = require('../config/database');
const { ok } = require('../utils/response');

async function summary(req, res, next) {
  try {
    let data = {
      deals: { total: 0, open: 0, won: 0, lost: 0, pipelineValue: 0 },
      leads: { total: 0, thisWeek: 0, avgScore: 0 },
      winRate: 0,
      topStages: [],
    };

    try {
      const now = new Date();
      const weekAgo = new Date(now - 7 * 86400000);
      const ownerId = req.user ? req.user.id : undefined;
      const ownerFilter = ownerId ? { ownerId } : {};

      const [dealStats, leadTotal, leadWeek, dealsByStage] = await Promise.all([
        prisma.deal.aggregate({
          where: { ...ownerFilter, deletedAt: null },
          _count: { id: true },
          _sum: { value: true },
        }),
        prisma.lead.count({ where: ownerFilter }),
        prisma.lead.count({ where: { ...ownerFilter, createdAt: { gte: weekAgo } } }),
        prisma.deal.groupBy({
          by: ['stage'],
          where: { ...ownerFilter, deletedAt: null },
          _count: { id: true },
          _sum: { value: true },
        }),
      ]);

      const wonDeals = dealsByStage.find((s) => s.stage === 'won');
      const lostDeals = dealsByStage.find((s) => s.stage === 'lost');
      const closedCount = (wonDeals?._count.id || 0) + (lostDeals?._count.id || 0);

      data = {
        deals: {
          total: dealStats._count.id || 0,
          open: (dealStats._count.id || 0) - (wonDeals?._count.id || 0) - (lostDeals?._count.id || 0),
          won: wonDeals?._count.id || 0,
          lost: lostDeals?._count.id || 0,
          pipelineValue: dealStats._sum.value || 0,
        },
        leads: { total: leadTotal, thisWeek: leadWeek },
        winRate: closedCount > 0 ? Math.round(((wonDeals?._count.id || 0) / closedCount) * 100) : 0,
        topStages: dealsByStage
          .filter((s) => s.stage !== 'won' && s.stage !== 'lost')
          .map((s) => ({ stage: s.stage, count: s._count.id, value: s._sum.value || 0 }))
          .sort((a, b) => b.value - a.value),
      };
    } catch (dbErr) {
      console.warn('[reports] DB unavailable:', dbErr.message);
    }

    return ok(res, data);
  } catch (e) {
    next(e);
  }
}

module.exports = { summary };
