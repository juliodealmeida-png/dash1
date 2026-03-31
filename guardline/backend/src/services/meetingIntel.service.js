const { prisma } = require('../config/database');
const julioService = require('./julio.service');

/**
 * Process a meeting transcript to extract MEDDPICC insights.
 * @param {string} userId - ID of the user performing the analysis
 * @param {string} dealId - ID of the deal to update
 * @param {string} transcript - Full text transcript of the meeting
 * @returns {Promise<Object>} Analysis results
 */
async function processTranscript(userId, dealId, transcript) {
  if (!julioService.isConfigured()) throw new Error('NVIDIA_API_KEY não configurada');

  const deal = await prisma.deal.findUnique({
    where: { id: dealId },
    include: { meddpiccScore: true }
  });
  if (!deal) throw new Error('Deal não encontrado');

  const prompt = `Você é um especialista em Revenue Operations e framework MEDDPICC.
Analise a transcrição da reunião abaixo para o deal da empresa "${deal.companyName}".

Transcrição:
"""
${transcript.slice(0, 15000)}
"""

Sua tarefa é extrair informações para as 8 dimensões do MEDDPICC (Metrics, Economic Buyer, Decision Criteria, Decision Process, Paper Process, Identify Pain, Champion, Competition).

Retorne SOMENTE este JSON:
{
  "summary": "resumo de 2 frases da reunião",
  "meddpicc_updates": {
    "metrics": { "found": boolean, "info": "o que foi descoberto", "score_impact": -20 a 20 },
    "economicBuyer": { "found": boolean, "info": "...", "score_impact": -20 a 20 },
    "decisionCriteria": { "found": boolean, "info": "...", "score_impact": -20 a 20 },
    "decisionProcess": { "found": boolean, "info": "...", "score_impact": -20 a 20 },
    "paperProcess": { "found": boolean, "info": "...", "score_impact": -20 a 20 },
    "identifyPain": { "found": boolean, "info": "...", "score_impact": -20 a 20 },
    "champion": { "found": boolean, "info": "...", "score_impact": -20 a 20 },
    "competition": { "found": boolean, "info": "...", "score_impact": -20 a 20 }
  },
  "next_steps": ["ação 1", "ação 2"],
  "sentiment": "positive|neutral|negative"
}`;

  const raw = await julioService.nvidiaChat([
    { role: 'system', content: 'Você é um assistente de inteligência de vendas especializado em transcrições.' },
    { role: 'user', content: prompt }
  ], 1500);

  const analysis = julioService.extractJsonObject(raw);
  if (!analysis) throw new Error('Falha ao processar transcrição com IA');

  // Update MEDDPICC scores based on impact
  const current = deal.meddpiccScore || {
    metricsScore: 0, economicBuyerScore: 0, decisionCriteriaScore: 0,
    decisionProcessScore: 0, paperProcessScore: 0, identifyPainScore: 0,
    championScore: 0, competitionScore: 0, totalScore: 0
  };

  const updates = analysis.meddpicc_updates;
  const newScores = {
    metricsScore: Math.min(100, Math.max(0, current.metricsScore + (updates.metrics?.score_impact || 0))),
    economicBuyerScore: Math.min(100, Math.max(0, current.economicBuyerScore + (updates.economicBuyer?.score_impact || 0))),
    decisionCriteriaScore: Math.min(100, Math.max(0, current.decisionCriteriaScore + (updates.decisionCriteria?.score_impact || 0))),
    decisionProcessScore: Math.min(100, Math.max(0, current.decisionProcessScore + (updates.decisionProcess?.score_impact || 0))),
    paperProcessScore: Math.min(100, Math.max(0, current.paperProcessScore + (updates.paperProcess?.score_impact || 0))),
    identifyPainScore: Math.min(100, Math.max(0, current.identifyPainScore + (updates.identifyPain?.score_impact || 0))),
    championScore: Math.min(100, Math.max(0, current.championScore + (updates.champion?.score_impact || 0))),
    competitionScore: Math.min(100, Math.max(0, current.competitionScore + (updates.competition?.score_impact || 0))),
  };

  // Calculate new total score (weighted average as per julio.service logic)
  const total = Math.round(
    (newScores.metricsScore * 0.20) +
    (newScores.economicBuyerScore * 0.20) +
    (newScores.decisionCriteriaScore * 0.15) +
    (newScores.decisionProcessScore * 0.15) +
    (newScores.paperProcessScore * 0.10) +
    (newScores.identifyPainScore * 0.10) +
    (newScores.championScore * 0.10)
  );

  // Upsert the score
  await prisma.dealMeddpiccScore.upsert({
    where: { dealId },
    create: {
      dealId,
      ...newScores,
      totalScore: total,
      recommendation: analysis.summary,
      top3Gaps: JSON.stringify(analysis.next_steps),
      analyzedAt: new Date(),
      updatedAt: new Date()
    },
    update: {
      ...newScores,
      totalScore: total,
      recommendation: analysis.summary,
      top3Gaps: JSON.stringify(analysis.next_steps),
      updatedAt: new Date()
    }
  });

  // Record history
  await prisma.dealMeddpiccHistory.create({
    data: {
      dealId,
      totalScore: total,
      deltaScore: total - current.totalScore,
      analysisJson: JSON.stringify(analysis),
      triggeredBy: userId
    }
  });

  // Create an activity for the meeting
  await prisma.dealActivity.create({
    data: {
      dealId,
      type: 'meeting',
      title: `Transcrição Processada: ${analysis.sentiment.toUpperCase()}`,
      note: `RESUMO: ${analysis.summary}\n\nPRÓXIMOS PASSOS:\n${analysis.next_steps.join('\n')}`,
      date: new Date()
    }
  });

  return analysis;
}

module.exports = {
  processTranscript
};
