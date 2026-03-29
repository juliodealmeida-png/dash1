const { prisma } = require('../config/database');
const { recalculateAllRiskScores } = require('./riskScore.service');
const { startFraudSimulation } = require('./fraudSimulation.service');
const { syncEmailsToDeals } = require('./gmail.service');
const { broadcastToAll, emitToUser } = require('../config/socket');

let riskInterval = null;
let staleInterval = null;
let gmailInterval = null;
let dailyBriefTimeout = null;

function scheduleDailyBriefJob(io) {
  const run = () => {
    const now = new Date();
    const next8 = new Date();
    next8.setHours(8, 0, 0, 0);
    if (next8 <= now) next8.setDate(next8.getDate() + 1);
    const ms = next8.getTime() - now.getTime();

    dailyBriefTimeout = setTimeout(async () => {
      if (!process.env.ANTHROPIC_API_KEY) {
        console.log('   [scheduler] Daily brief ignorado — sem ANTHROPIC_API_KEY');
        scheduleDailyBriefJob(io);
        return;
      }

      try {
        const { generateDailyBrief } = require('./julio.service');
        const users = await prisma.user.findMany({ select: { id: true, name: true } });
        for (const user of users) {
          try {
            const brief = await generateDailyBrief(user.id);
            if (io) emitToUser(io, user.id, 'julio:brief:ready', brief);
            console.log(`   [scheduler] Brief gerado para ${user.name}`);
          } catch (err) {
            console.error(`   [scheduler] Brief falhou (${user.name}):`, err.message);
          }
        }
      } catch (error) {
        console.error('[scheduler] Daily brief job:', error);
      }

      scheduleDailyBriefJob(io);
    }, ms);

    console.log(`📅 Daily brief agendado para ${next8.toLocaleString('pt-BR')}`);
  };

  run();
}

/**
 * @param {import('socket.io').Server | null} io
 */
function startScheduledJobs(io) {
  if (riskInterval) clearInterval(riskInterval);
  if (staleInterval) clearInterval(staleInterval);
  if (gmailInterval) clearInterval(gmailInterval);
  if (dailyBriefTimeout) clearTimeout(dailyBriefTimeout);

  riskInterval = setInterval(async () => {
    try {
      const result = await recalculateAllRiskScores(io);
      if (result.updated > 0) {
        console.log(
          `   [scheduler] Risk scores: ${result.updated} atualizados, ${result.newCritical} novos críticos`
        );
        if (io) broadcastToAll(io, 'metrics:refresh', { at: Date.now() });
      }
    } catch (error) {
      console.error('[scheduler] Risk scores:', error);
    }
  }, 5 * 60 * 1000);

  staleInterval = setInterval(async () => {
    try {
      const staleDays = 7;
      const staleThreshold = new Date(Date.now() - staleDays * 86400000);

      const staleDeals = await prisma.deal.findMany({
        where: {
          deletedAt: null,
          stage: { notIn: ['won', 'lost'] },
          OR: [
            { lastContactAt: { lt: staleThreshold } },
            { lastContactAt: null, createdAt: { lt: staleThreshold } },
          ],
        },
        select: { id: true, companyName: true, value: true, ownerId: true },
      });

      for (const deal of staleDeals) {
        const recentSignal = await prisma.signal.findFirst({
          where: {
            dealId: deal.id,
            type: 'deal_stalled',
            createdAt: { gte: new Date(Date.now() - 24 * 3600000) },
          },
        });

        if (!recentSignal) {
          const signal = await prisma.signal.create({
            data: {
              type: 'deal_stalled',
              severity: 'warning',
              title: 'Deal sem atividade',
              message: `${deal.companyName} está parado há mais de ${staleDays} dias`,
              dealId: deal.id,
            },
          });
          if (io) emitToUser(io, deal.ownerId, 'signal:new', signal);
        }
      }
    } catch (error) {
      console.error('[scheduler] Stale deals:', error);
    }
  }, 60 * 60 * 1000);

  scheduleDailyBriefJob(io);

  startFraudSimulation(io);

  console.log('⚡ Jobs periódicos: risk 5min, stale 1h, gmail 10min, fraud sim, daily brief 8h');
}

module.exports = { startScheduledJobs };
