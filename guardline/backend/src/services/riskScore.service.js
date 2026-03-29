const { prisma } = require('../config/database');
const { emitToUser } = require('../config/socket');

function calculateRiskScore(deal) {
  let score = 0;
  const reasons = [];

  if (deal.lastContactAt) {
    const days = Math.floor((Date.now() - new Date(deal.lastContactAt).getTime()) / 86400000);
    if (days > 14) {
      score += 40;
      reasons.push(`${days} dias sem contato`);
    } else if (days > 7) {
      score += 25;
      reasons.push(`${days} dias sem contato`);
    } else if (days > 3) {
      score += 10;
      reasons.push(`${days} dias sem contato`);
    }
  } else {
    score += 35;
    reasons.push('Nunca houve contato registrado');
  }

  const stageAvgDays = {
    prospecting: 5,
    qualified: 7,
    presentation: 10,
    proposal: 14,
    negotiation: 21,
    won: 0,
    lost: 0,
  };
  const daysInStage = Math.floor((Date.now() - new Date(deal.stageChangedAt).getTime()) / 86400000);
  const avgDays = stageAvgDays[deal.stage] || 10;
  if (daysInStage > avgDays * 2.5) {
    score += 30;
    reasons.push(`${daysInStage} dias no estágio (média: ${avgDays}d)`);
  } else if (daysInStage > avgDays * 1.5) {
    score += 15;
    reasons.push('Acima da média no estágio');
  }

  const activityCount = deal._count?.activities ?? 0;
  if (activityCount === 0) {
    score += 20;
    reasons.push('Nenhuma atividade registrada');
  } else if (activityCount < 3) {
    score += 10;
    reasons.push('Poucas atividades registradas');
  }

  if (['proposal', 'negotiation'].includes(deal.stage) && daysInStage > 10) {
    score += 10;
    reasons.push('Estágio crítico com pouco avanço');
  }

  const final = Math.min(score, 100);
  return {
    score: final,
    reasons,
    level: final >= 75 ? 'critical' : final >= 50 ? 'warning' : 'healthy',
  };
}

async function recalculateAllRiskScores(io) {
  const deals = await prisma.deal.findMany({
    where: { stage: { notIn: ['won', 'lost'] }, deletedAt: null },
    include: { _count: { select: { activities: true } } },
  });

  const updates = [];
  const newCriticalDeals = [];

  for (const deal of deals) {
    const { score, level } = calculateRiskScore(deal);
    const previousScore = deal.riskScore;

    if (score !== previousScore) {
      updates.push(
        prisma.deal.update({
          where: { id: deal.id },
          data: { riskScore: score },
        })
      );

      if (io) {
        emitToUser(io, deal.ownerId, 'deal:risk:changed', {
          dealId: deal.id,
          previousScore,
          newScore: score,
          level,
        });
      }

      if (score >= 75 && previousScore < 75) {
        newCriticalDeals.push({ deal, score });
      }
    }
  }

  if (updates.length) await prisma.$transaction(updates);

  for (const { deal, score } of newCriticalDeals) {
    const signal = await prisma.signal.create({
      data: {
        type: 'deal_risk',
        severity: 'critical',
        title: 'Risk Score Crítico',
        message: `${deal.companyName}: risk score subiu para ${score}/100`,
        dealId: deal.id,
      },
    });
    if (io) emitToUser(io, deal.ownerId, 'signal:new', signal);
  }

  return { updated: updates.length, newCritical: newCriticalDeals.length };
}

module.exports = { calculateRiskScore, recalculateAllRiskScores };
