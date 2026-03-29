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
      const DATA_API = String(
        process.env.DATA_API_BASE_URL || process.env.GUARDLINE_DATA_API_BASE || ''
      ).replace(/\/$/, '');
      const staleDays = 7;
      const staleThreshold = new Date(Date.now() - staleDays * 86400000);
      const recentCutoff = new Date(Date.now() - 24 * 3600000);

      let staleDeals = [];

      if (DATA_API) {
        // Read stale deals from Supabase via Data API
        try {
          const r = await fetch(
            `${DATA_API}/api/deals?perPage=200`,
            { headers: { 'Content-Type': 'application/json' } }
          );
          if (r.ok) {
            const json = await r.json();
            const allDeals = (json.data || json.deals || []);
            const INACTIVE = new Set(['won', 'lost', 'closed_won', 'closed_lost', 'unqualified', 'freezer',
              '1031112083', '1031112084', '1031127595', '1123039270']);
            staleDeals = allDeals.filter((d) => {
              if (INACTIVE.has(d.stage || d.deal_stage || '')) return false;
              const updated = d.updatedAt || d.updated_at || d.createdAt || d.created_at;
              return updated ? new Date(updated) < staleThreshold : true;
            }).map((d) => ({
              id: d.id,
              companyName: d.companyName || d.deal_name || d.company_name || 'Deal',
              value: d.value || d.deal_amount || 0,
              supabase: true,
            }));
          }
        } catch (fetchErr) {
          console.warn('[scheduler] Stale deals fetch from Data API:', fetchErr.message);
        }
      }

      // Fall back to Prisma SQLite if Data API not available
      if (!DATA_API || staleDeals.length === 0) {
        const prismaDeals = await prisma.deal.findMany({
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
        staleDeals = prismaDeals.map((d) => ({ ...d, supabase: false }));
      }

      for (const deal of staleDeals) {
        // Check for recent signal in SQLite to avoid duplicates
        const recentSignal = await prisma.signal.findFirst({
          where: {
            type: 'deal_stalled',
            createdAt: { gte: recentCutoff },
            OR: [
              { dealId: deal.id },
              { message: { contains: deal.companyName } },
            ],
          },
        }).catch(() => null);

        if (!recentSignal) {
          const signalData = {
            type: 'deal_stalled',
            severity: 'warning',
            title: 'Deal sem atividade',
            message: `${deal.companyName} está parado há mais de ${staleDays} dias`,
          };

          // Write to SQLite
          const signal = await prisma.signal.create({ data: { ...signalData, dealId: deal.supabase ? undefined : deal.id } }).catch(() => null);
          if (io && deal.ownerId) emitToUser(io, deal.ownerId, 'signal:new', signal || signalData);

          // Also write to Supabase via Data API
          if (DATA_API) {
            fetch(`${DATA_API}/api/signals`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ ...signalData, companyName: deal.companyName }),
            }).catch((e) => console.warn('[scheduler] Signal POST to Data API:', e.message));
          }
        }
      }
    } catch (error) {
      console.error('[scheduler] Stale deals:', error);
    }
  }, 60 * 60 * 1000);

  // Gmail email → deal sync every 10 minutes (only when credentials exist)
  if (process.env.GMAIL_CLIENT_ID && process.env.GMAIL_CLIENT_SECRET && process.env.GMAIL_REFRESH_TOKEN) {
    gmailInterval = setInterval(async () => {
      try {
        await syncEmailsToDeals();
      } catch (error) {
        console.error('[scheduler] Gmail sync:', error.message);
      }
    }, 10 * 60 * 1000);
    console.log('📧 Gmail sync agendado a cada 10min');
  }

  scheduleDailyBriefJob(io);

  startFraudSimulation(io);

  // Cleanup expired refresh tokens every 24 hours
  setInterval(async () => {
    try {
      const { count } = await prisma.refreshToken.deleteMany({
        where: { expiresAt: { lt: new Date() } },
      });
      if (count > 0) console.log(`   [scheduler] Limpeza: ${count} refresh tokens expirados removidos`);
    } catch (error) {
      console.error('[scheduler] Refresh token cleanup:', error.message);
    }
  }, 24 * 60 * 60 * 1000);

  console.log('⚡ Jobs periódicos: risk 5min, stale 1h, fraud sim, daily brief 8h, token cleanup 24h');
}

module.exports = { startScheduledJobs };
