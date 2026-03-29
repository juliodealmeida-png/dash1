const { prisma } = require('../config/database');
const { ok } = require('../utils/response');

function startOfMonth() {
  const d = new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
}

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

async function dashboard(req, res, next) {
  try {
    const userId = req.user.id;

    const [
      deals,
      leadsThisMonth,
      fraudToday,
      criticalSignals,
      recentSignals,
    ] = await Promise.all([
      prisma.deal.findMany({
        where: { ownerId: userId, deletedAt: null, stage: { notIn: ['won', 'lost'] } },
        select: { value: true, riskScore: true, probability: true, stage: true },
      }),
      prisma.lead.count({
        where: { ownerId: userId, createdAt: { gte: startOfMonth() } },
      }),
      prisma.fraudEvent.count({
        where: { detectedAt: { gte: startOfToday() } },
      }),
      prisma.signal.count({
        where: { read: false, severity: { in: ['critical', 'warning'] } },
      }),
      prisma.signal.findMany({
        where: { read: false },
        orderBy: { createdAt: 'desc' },
        take: 20,
        include: { deal: { select: { companyName: true, value: true } } },
      }),
    ]);

    const pipelineTotal = deals.reduce((sum, d) => sum + d.value, 0);
    const activeDeals = deals.length;
    const atRiskDeals = deals.filter((d) => d.riskScore >= 75).length;

    const forecastCommitted = deals
      .filter((d) => ['negotiation'].includes(d.stage))
      .reduce((sum, d) => sum + (d.value * d.probability) / 100, 0);
    const forecastBestCase = deals.reduce((sum, d) => sum + (d.value * d.probability) / 100, 0);

    const since90 = new Date(Date.now() - 90 * 86400000);
    const [wonDeals, totalClosedDeals] = await Promise.all([
      prisma.deal.count({
        where: {
          ownerId: userId,
          deletedAt: null,
          stage: 'won',
          actualCloseDate: { gte: since90 },
        },
      }),
      prisma.deal.count({
        where: {
          ownerId: userId,
          deletedAt: null,
          stage: { in: ['won', 'lost'] },
          actualCloseDate: { gte: since90 },
        },
      }),
    ]);

    const winRate = totalClosedDeals > 0 ? Math.round((wonDeals / totalClosedDeals) * 100) : 0;

    const denom = forecastCommitted * 3 || 1;
    const coverageRatio = pipelineTotal > 0 ? pipelineTotal / denom : 0;
    const avgRiskScore =
      deals.length > 0 ? Math.round(deals.reduce((s, d) => s + d.riskScore, 0) / deals.length) : 0;
    let healthScore = Math.max(0, 100 - avgRiskScore + Math.min(20, coverageRatio * 5));
    healthScore = Math.min(Math.round(healthScore), 100);

    return ok(res, {
      pipelineTotal,
      activeDeals,
      atRiskDeals,
      winRate,
      forecast: {
        committed: Math.round(forecastCommitted),
        bestCase: Math.round(forecastBestCase),
      },
      criticalAlerts: criticalSignals,
      fraudToday,
      leadsThisMonth,
      healthScore,
      coverageRatio: Number(coverageRatio.toFixed(2)),
      recentSignals,
    });
  } catch (e) {
    next(e);
  }
}

/** Compatível com Etapa 1 — KPIs resumidos. */
async function summary(req, res, next) {
  try {
    const userId = req.user.id;
    const openWhere = { ownerId: userId, deletedAt: null, stage: { notIn: ['won', 'lost'] } };
    const [openD, leadsCount, fraudCount, signalCount] = await Promise.all([
      prisma.deal.findMany({
        where: openWhere,
        select: { value: true, riskScore: true },
      }),
      prisma.lead.count({ where: { ownerId: userId } }),
      prisma.fraudEvent.count(),
      prisma.signal.count(),
    ]);

    const pipelineTotal = openD.reduce((a, d) => a + d.value, 0);
    const atRisk = openD.filter((d) => d.riskScore >= 75).length;

    const since90 = new Date(Date.now() - 90 * 86400000);
    const [won, closed] = await Promise.all([
      prisma.deal.count({
        where: {
          ownerId: userId,
          deletedAt: null,
          stage: 'won',
          actualCloseDate: { gte: since90 },
        },
      }),
      prisma.deal.count({
        where: {
          ownerId: userId,
          deletedAt: null,
          stage: { in: ['won', 'lost'] },
          actualCloseDate: { gte: since90 },
        },
      }),
    ]);
    const winRate = closed > 0 ? Math.round((won / closed) * 100) : 0;

    const forecastCommitted = await prisma.deal
      .findMany({
        where: { ...openWhere, stage: 'negotiation' },
        select: { value: true, probability: true },
      })
      .then((rows) => rows.reduce((s, d) => s + (d.value * d.probability) / 100, 0));

    const healthScore = Math.min(
      100,
      Math.max(42, 100 - atRisk * 6 - openD.filter((d) => d.riskScore > 50).length * 2)
    );

    return ok(res, {
      pipelineTotal,
      activeDeals: openD.length,
      atRisk,
      leadsTotal: leadsCount,
      winRate,
      forecastCommitted: Math.round(forecastCommitted),
      alerts: 7 + atRisk,
      fraudEvents: fraudCount,
      signals: signalCount,
      healthScore,
    });
  } catch (e) {
    next(e);
  }
}

module.exports = { dashboard, summary };
