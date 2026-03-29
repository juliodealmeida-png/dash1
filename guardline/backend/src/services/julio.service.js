const Anthropic = require('@anthropic-ai/sdk');
const { prisma } = require('../config/database');

function getAnthropic() {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return null;
  return new Anthropic({ apiKey: key });
}

function getModel() {
  return process.env.ANTHROPIC_MODEL || 'claude-3-5-sonnet-20241022';
}

const JULIO_SYSTEM_PROMPT = `
Você é Julio, o AI Revenue Intelligence do Guardline Revenue OS.
Seu papel é ser o Chief of Staff de Receita do usuário.

SUAS RESPONSABILIDADES PRINCIPAIS:
1. Analisar o pipeline e identificar riscos antes que o usuário perceba
2. Narrar mudanças de forecast em linguagem humana, não apenas números
3. Recomendar próximas ações específicas e acionáveis, não genéricas
4. Detectar padrões em dados históricos de perda e oportunidade
5. Preparar o usuário para conversas com investidores

ESTILO DE COMUNICAÇÃO:
- Direto ao ponto. Sem enrolação.
- Linguagem de startup operator, não de consultor
- Números sempre em contexto (não "Win Rate: 28%", mas "28% — 6pp abaixo do mês passado")
- Prioridades sempre claras: o que fazer AGORA vs. pode esperar
- Honesto sobre riscos, mesmo quando são incômodos

FORMATO DAS RESPOSTAS NO CHAT:
- Máximo 300 palavras por resposta
- Use **negrito** (markdown) para números e nomes de empresas
- Termine com UMA ação concreta recomendada
- Quando relevante, mencione o deal específico pelo nome da empresa

RESTRIÇÕES:
- Nunca invente dados. Só use os dados do pipeline fornecidos no contexto
- Se não tiver dados suficientes para uma análise, diga claramente
- Não seja bajulador. Se o pipeline está ruim, diga que está ruim
`.trim();

function extractJsonObject(text) {
  const m = String(text).match(/\{[\s\S]*\}/);
  if (!m) return null;
  try {
    return JSON.parse(m[0]);
  } catch {
    return null;
  }
}

function sanitizeApiMessages(messages) {
  const out = [];
  const slice = messages.slice(-40);
  for (const m of slice) {
    if (!m || (m.role !== 'user' && m.role !== 'assistant')) continue;
    const c = typeof m.content === 'string' ? m.content : String(m.content || '');
    if (!c.trim()) continue;
    out.push({ role: m.role, content: c });
  }
  return out;
}

async function buildPipelineContext(userId) {
  const [deals, leadsWeek, recentLosses, fraud24h] = await Promise.all([
    prisma.deal.findMany({
      where: { ownerId: userId, deletedAt: null, stage: { notIn: ['won', 'lost'] } },
      include: {
        activities: { orderBy: { date: 'desc' }, take: 3 },
        _count: { select: { activities: true } },
      },
      orderBy: { riskScore: 'desc' },
      take: 25,
    }),
    prisma.lead.count({
      where: {
        ownerId: userId,
        createdAt: { gte: new Date(Date.now() - 7 * 86400000) },
      },
    }),
    prisma.deal.findMany({
      where: {
        ownerId: userId,
        deletedAt: null,
        stage: 'lost',
        actualCloseDate: { gte: new Date(Date.now() - 90 * 86400000) },
      },
      select: { companyName: true, value: true, lostReason: true, actualCloseDate: true },
      take: 15,
    }),
    prisma.fraudEvent.count({
      where: { detectedAt: { gte: new Date(Date.now() - 24 * 3600000) } },
    }),
  ]);

  const pipelineTotal = deals.reduce((s, d) => s + d.value, 0);
  const committed = deals
    .filter((d) => d.stage === 'negotiation')
    .reduce((s, d) => s + (d.value * d.probability) / 100, 0);
  const atRisk = deals.filter((d) => d.riskScore >= 75);

  return `
=== CONTEXTO DO PIPELINE (${new Date().toLocaleDateString('pt-BR')}) ===

PIPELINE ATIVO:
- Total: $${pipelineTotal.toLocaleString('pt-BR')} em ${deals.length} deals
- Committed (forecast negociação): $${committed.toLocaleString('pt-BR')}
- Deals em risco crítico (score ≥75): ${atRisk.length}

DEALS ATIVOS (ordenados por risco):
${deals
  .map(
    (d) => `
- ${d.companyName} | $${d.value.toLocaleString('pt-BR')} | Estágio: ${d.stage}
  Risk Score: ${d.riskScore}/100
  Último contato: ${
    d.lastContactAt
      ? `${Math.floor((Date.now() - new Date(d.lastContactAt).getTime()) / 86400000)} dias atrás`
      : 'nunca registrado'
  }
  Atividades: ${d._count.activities}
  Última atividade: ${d.activities[0]?.title || 'nenhuma'}
`
  )
  .join('')}

LEADS RECENTES (últimos 7 dias): ${leadsWeek} novos leads

PERDAS RECENTES (últimos 90 dias): ${recentLosses.length} deals perdidos
${recentLosses
  .map(
    (l) =>
      `• ${l.companyName}: $${l.value.toLocaleString('pt-BR')} — Razão: ${l.lostReason || 'não registrada'}`
  )
  .join('\n')}

FRAUDES (últimas 24h): ${fraud24h} eventos detectados
=== FIM DO CONTEXTO ===
`;
}

async function generateDailyBrief(userId) {
  const client = getAnthropic();
  if (!client) throw new Error('ANTHROPIC_API_KEY não configurada');

  const context = await buildPipelineContext(userId);
  const response = await client.messages.create({
    model: getModel(),
    max_tokens: 1000,
    system: JULIO_SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: `${context}

Gere o Daily Revenue Brief de hoje. Formato OBRIGATÓRIO — retorne SOMENTE este JSON, sem texto adicional:

{
  "date": "data de hoje",
  "overallStatus": "healthy|warning|critical",
  "items": [
    {
      "priority": 1,
      "type": "risk|opportunity|info|alert|celebration",
      "title": "título curto (máx 60 chars)",
      "detail": "detalhe acionável (máx 150 chars)",
      "dealName": "nome da empresa se aplicável ou null",
      "action": "ação específica recomendada ou null"
    }
  ],
  "forecastNarrative": "2-3 frases sobre o forecast desta semana",
  "topDealToFocus": "nome da empresa com maior urgência"
}

Gere exatamente 5 items, ordenados por prioridade (1 = mais urgente).`,
      },
    ],
  });

  const block = response.content.find((b) => b.type === 'text');
  const content = block && block.type === 'text' ? block.text : '';
  const brief = extractJsonObject(content);
  if (!brief) throw new Error('Julio não retornou JSON válido');

  const saved = await prisma.julioBrief.create({
    data: {
      content: JSON.stringify(brief),
      date: new Date(),
      type: 'daily',
      userId,
    },
  });

  return { ...brief, id: saved.id };
}

async function loadConversationMessages(userId, conversationId) {
  if (!conversationId) return [];
  const conversation = await prisma.julioConversation.findFirst({
    where: { id: conversationId, userId },
  });
  if (!conversation) return [];
  try {
    return JSON.parse(conversation.messages);
  } catch {
    return [];
  }
}

async function persistConversation(userId, conversationId, messages) {
  const clean = sanitizeApiMessages(messages);
  if (conversationId) {
    const existing = await prisma.julioConversation.findFirst({
      where: { id: conversationId, userId },
    });
    if (existing) {
      await prisma.julioConversation.update({
        where: { id: conversationId },
        data: { messages: JSON.stringify(clean) },
      });
      return conversationId;
    }
  }
  const firstUser = clean.find((m) => m.role === 'user');
  const title = firstUser ? String(firstUser.content).substring(0, 60) : 'Conversa';
  const created = await prisma.julioConversation.create({
    data: {
      userId,
      messages: JSON.stringify(clean),
      title,
    },
  });
  return created.id;
}

/**
 * Chat síncrono (sem stream) — útil para testes ou clientes simples.
 */
async function chatWithJulio(userId, conversationId, userMessage) {
  const client = getAnthropic();
  if (!client) throw new Error('ANTHROPIC_API_KEY não configurada');

  const context = await buildPipelineContext(userId);
  let messages = await loadConversationMessages(userId, conversationId);
  messages = sanitizeApiMessages(messages);
  messages.push({ role: 'user', content: userMessage });

  const response = await client.messages.create({
    model: getModel(),
    max_tokens: 600,
    system: `${JULIO_SYSTEM_PROMPT}\n\n${context}`,
    messages,
  });

  const block = response.content.find((b) => b.type === 'text');
  const assistantMessage = block && block.type === 'text' ? block.text : '';

  messages.push({ role: 'assistant', content: assistantMessage });
  const id = await persistConversation(userId, conversationId, messages);

  return { message: assistantMessage, conversationId: id };
}

/**
 * Stream SSE — chama onChunk para cada delta de texto.
 * Retorna { fullText, conversationId }.
 */
async function streamJulioChat(userId, conversationId, userMessage, onChunk) {
  const client = getAnthropic();
  if (!client) throw new Error('ANTHROPIC_API_KEY não configurada');

  const context = await buildPipelineContext(userId);
  let messages = await loadConversationMessages(userId, conversationId);
  messages = sanitizeApiMessages(messages);
  messages.push({ role: 'user', content: userMessage });

  const stream = client.messages.stream({
    model: getModel(),
    max_tokens: 600,
    system: `${JULIO_SYSTEM_PROMPT}\n\n${context}`,
    messages,
  });

  stream.on('text', (delta) => {
    if (onChunk && delta) onChunk(delta);
  });

  const fullText = await stream.finalText();
  messages.push({ role: 'assistant', content: fullText });
  const id = await persistConversation(userId, conversationId, messages);

  return { fullText, conversationId: id };
}

async function analyzeLossPatterns(userId) {
  const client = getAnthropic();
  if (!client) throw new Error('ANTHROPIC_API_KEY não configurada');

  const losses = await prisma.deal.findMany({
    where: {
      ownerId: userId,
      deletedAt: null,
      stage: 'lost',
      actualCloseDate: { gte: new Date(Date.now() - 180 * 86400000) },
    },
    select: {
      companyName: true,
      value: true,
      lostReason: true,
      source: true,
      stage: true,
      actualCloseDate: true,
      activities: { select: { date: true }, orderBy: { date: 'desc' }, take: 1 },
    },
  });

  if (losses.length === 0) {
    return {
      patterns: [],
      totalLost: 0,
      mainReason: null,
      message: 'Sem deals perdidos no período para analisar.',
    };
  }

  const response = await client.messages.create({
    model: getModel(),
    max_tokens: 500,
    system: JULIO_SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: `Analise estes ${losses.length} deals perdidos nos últimos 6 meses e identifique os 3 principais padrões:

${JSON.stringify(losses, null, 2)}

Retorne SOMENTE JSON:
{
  "patterns": [
    {
      "title": "título do padrão",
      "description": "explicação em 1-2 frases",
      "frequency": "X de Y deals",
      "impact": "$valor total afetado",
      "recommendation": "ação específica para evitar no futuro"
    }
  ],
  "totalLost": 0,
  "mainReason": "razão mais comum"
}`,
      },
    ],
  });

  const block = response.content.find((b) => b.type === 'text');
  const text = block && block.type === 'text' ? block.text : '';
  const parsed = extractJsonObject(text);
  if (!parsed) return { patterns: [], totalLost: 0, mainReason: null, raw: text };
  return parsed;
}

async function generateInvestorUpdate(userId) {
  const client = getAnthropic();
  if (!client) throw new Error('ANTHROPIC_API_KEY não configurada');

  const context = await buildPipelineContext(userId);
  const response = await client.messages.create({
    model: getModel(),
    max_tokens: 800,
    system: JULIO_SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: `${context}

Gere um Investor Update profissional baseado nos dados do pipeline.
Formato: texto estruturado em markdown, pronto para enviar a investidores.
Inclua: MRR estimado, pipeline, principais wins, riscos e próximos 30 dias.
Seja conciso e honesto. Máximo 400 palavras.`,
      },
    ],
  });

  const block = response.content.find((b) => b.type === 'text');
  return block && block.type === 'text' ? block.text : '';
}

async function listConversations(userId, take = 30) {
  return prisma.julioConversation.findMany({
    where: { userId },
    orderBy: { updatedAt: 'desc' },
    take,
    select: { id: true, title: true, createdAt: true, updatedAt: true },
  });
}

async function getConversation(userId, id) {
  return prisma.julioConversation.findFirst({
    where: { id, userId },
  });
}

async function getLatestBrief(userId) {
  return prisma.julioBrief.findFirst({
    where: { userId, type: 'daily' },
    orderBy: { date: 'desc' },
  });
}

module.exports = {
  JULIO_SYSTEM_PROMPT,
  getAnthropic,
  getModel,
  buildPipelineContext,
  generateDailyBrief,
  chatWithJulio,
  streamJulioChat,
  analyzeLossPatterns,
  generateInvestorUpdate,
  listConversations,
  getConversation,
  getLatestBrief,
};
