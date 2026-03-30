const { prisma } = require('../config/database');

const NVIDIA_API_BASE = 'https://integrate.api.nvidia.com/v1';

const _pipelineContextCache = new Map();

function getNvidiaKey() {
  return process.env.NVIDIA_API_KEY || process.env.ANTHROPIC_API_KEY || null;
}

function getModel() {
  return process.env.JULIO_MODEL || process.env.NVIDIA_MODEL || 'moonshotai/kimi-k2.5';
}

function isConfigured() {
  return !!getNvidiaKey();
}

/**
 * Call NVIDIA NIMs chat completions (non-streaming).
 * @param {Array} messages - OpenAI-style [{role, content}]
 * @param {number} maxTokens
 * @returns {Promise<string>} assistant text
 */
async function nvidiaChat(messages, maxTokens = 600) {
  const key = getNvidiaKey();
  if (!key) throw new Error('NVIDIA_API_KEY não configurada');

  const signal = AbortSignal.timeout(parseInt(process.env.AI_HTTP_TIMEOUT_MS) || 20000);
  const res = await fetch(`${NVIDIA_API_BASE}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    signal,
    body: JSON.stringify({
      model: getModel(),
      messages,
      max_tokens: maxTokens,
      stream: false,
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`NVIDIA NIMs error ${res.status}: ${errText.slice(0, 200)}`);
  }

  const data = await res.json();
  return (data.choices?.[0]?.message?.content) || '';
}

/**
 * Stream NVIDIA NIMs chat completions via SSE.
 * Calls onChunk(delta_text) for each token.
 * @returns {Promise<string>} full text
 */
async function nvidiaChatStream(messages, maxTokens = 600, onChunk) {
  const key = getNvidiaKey();
  if (!key) throw new Error('NVIDIA_API_KEY não configurada');

  const signal = AbortSignal.timeout(parseInt(process.env.AI_HTTP_TIMEOUT_MS) || 20000);
  const res = await fetch(`${NVIDIA_API_BASE}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    signal,
    body: JSON.stringify({
      model: getModel(),
      messages,
      max_tokens: maxTokens,
      stream: true,
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`NVIDIA NIMs error ${res.status}: ${errText.slice(0, 200)}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = '';
  let full = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    const lines = buf.split('\n');
    buf = lines.pop() || '';
    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      const raw = line.slice(6).trim();
      if (raw === '[DONE]') break;
      try {
        const ev = JSON.parse(raw);
        const chunk = ev.choices?.[0]?.delta?.content || '';
        if (chunk) {
          full += chunk;
          if (onChunk) onChunk(chunk);
        }
      } catch {
        // ignore parse errors on malformed lines
      }
    }
  }

  return full;
}

function buildJulioSystemPrompt() {
  const hour = new Date().getHours();
  let greeting;
  if (hour >= 5 && hour < 12) {
    greeting = 'Bom dia! ☀️ Pipeline fresco para analisar — vamos nessa.';
  } else if (hour >= 12 && hour < 18) {
    greeting = 'Boa tarde! ⚡ Metade do dia passou — hora de garantir o forecast.';
  } else if (hour >= 18 && hour < 23) {
    greeting = 'Boa noite! 🌙 Revisão do dia — o que fechou, o que precisa de push amanhã.';
  } else {
    greeting = 'Madrugada produtiva! 🦉 Pipeline não dorme, então eu também não.';
  }

  return `Você é Júlio, o Chief of Staff de Receita do Guardline Revenue OS.
${greeting}

PERSONALIDADE:
- Inteligente, descontraído, empático, direto e proativo
- Fala como um sócio que conhece cada deal de cor, não como um consultor
- Honesto mesmo quando o diagnóstico é ruim: não bajula, não suaviza riscos reais
- Responde QUALQUER pergunta — vendas, vida pessoal, culinária, piadas, o que for
  Se for fora do contexto de negócios, responde de forma leve e depois volta ao ponto
- Usa linguagem de startup operator: "prioridade 1", "needle mover", "closing rate"

MEDDPICC — FRAMEWORK COMPLETO (7 dimensões com pesos):
| Dimensão          | Peso | O que avalia                                      |
|-------------------|------|---------------------------------------------------|
| Metrics           | 20%  | ROI/valor quantificado para o comprador           |
| Economic Buyer    | 20%  | Acesso ao decisor com orçamento real              |
| Decision Criteria | 15%  | Critérios formais/informais de decisão conhecidos |
| Decision Process  | 15%  | Passos e timeline do processo de compra mapeados  |
| Paper Process     | 10%  | Jurídico, procurement, assinaturas mapeados       |
| Identify Pain     | 10%  | Dor crítica confirmada e quantificada             |
| Champion          | 10%  | Campeão interno identificado e treinado           |
| Competition       | (bônus) | Competidores mapeados e diferenciação clara   |

Score total = média ponderada de 0-100 de cada dimensão.
Top 3 gaps = dimensões com menor score → maior risco de perda.

FORMATO DAS RESPOSTAS:
- Máximo 280 palavras para respostas de chat
- **Negrito** para números, empresas e termos de ação
- Termine com UMA próxima ação concreta
- Para análises MEDDPICC: retorne JSON estruturado quando solicitado

CONTEXTO INJETADO DINAMICAMENTE:
- Hora atual: ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}
- Pipeline, deals, win rate, ARR e fraudes são fornecidos abaixo

RESTRIÇÕES:
- Nunca invente dados não presentes no contexto
- Se dados insuficientes: diga claramente e peça informação específica
`.trim();
}

const JULIO_SYSTEM_PROMPT = buildJulioSystemPrompt();

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
  const ttlMs = parseInt(process.env.JULIO_CONTEXT_CACHE_MS) || 30000;
  const cached = _pipelineContextCache.get(userId);
  if (cached && (Date.now() - cached.ts) < ttlMs) return cached.text;

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

async function maybeHandleFastTool(userMessage) {
  const m = String(userMessage || '').trim();
  const lower = m.toLowerCase();

  const wantsUsdBrl = /\b(d[oó]lar|usd)\b/.test(lower);
  const wantsWeather = /\b(clima|tempo|vai chover|chuva)\b/.test(lower);
  const wantsNews = /\b(not[ií]cias?|news)\b/.test(lower);

  if (!wantsUsdBrl && !wantsWeather && !wantsNews) return null;

  if (wantsUsdBrl) {
    try {
      const r = await fetch('https://api.exchangerate.host/latest?base=USD&symbols=BRL', {
        signal: AbortSignal.timeout(8000),
      });
      const j = await r.json().catch(() => ({}));
      const rate = j.rates && j.rates.BRL;
      if (rate) {
        return `Cotação agora: **US$1 = R$${Number(rate).toFixed(3)}** (${j.date || 'hoje'}). Próxima ação: quer que eu compare com a média dos últimos 7 dias?`;
      }
    } catch (_) {}
    return 'Não consegui puxar a cotação agora. Próxima ação: tente novamente em 30s.';
  }

  if (wantsWeather) {
    const cityMatch = m.match(/\bem\s+([A-Za-zÀ-ÿ\s-]{2,60})/i);
    const city = cityMatch ? cityMatch[1].trim() : '';
    if (!city) {
      return 'Me diga a cidade (ex.: “vai chover **em São Paulo**?”). Próxima ação: informe a cidade.';
    }
    try {
      const geores = await fetch(
        'https://geocoding-api.open-meteo.com/v1/search?name=' + encodeURIComponent(city) + '&count=1&language=pt&format=json',
        { signal: AbortSignal.timeout(8000) }
      );
      const geo = await geores.json().catch(() => ({}));
      const loc = geo.results && geo.results[0];
      if (!loc) return `Não achei a cidade “${city}”. Próxima ação: tente com outro nome (ex.: “São Paulo”).`;
      const wres = await fetch(
        'https://api.open-meteo.com/v1/forecast?latitude=' +
          loc.latitude +
          '&longitude=' +
          loc.longitude +
          '&current=temperature_2m,precipitation,rain,weather_code&timezone=auto',
        { signal: AbortSignal.timeout(8000) }
      );
      const data = await wres.json().catch(() => ({}));
      const c = data.current || {};
      const temp = c.temperature_2m != null ? `${c.temperature_2m}°C` : 'n/d';
      const rain = c.rain ? 'sim' : 'não';
      return `Clima agora em **${loc.name}**: **${temp}** · chuva: **${rain}**. Próxima ação: quer previsão para as próximas 6h?`;
    } catch (_) {
      return 'Não consegui consultar o clima agora. Próxima ação: tente novamente em 30s.';
    }
  }

  if (wantsNews) {
    const q = m.replace(/not[ií]cias?|news/gi, '').trim() || 'tecnologia';
    const key = process.env.NEWS_API_KEY || '';
    try {
      if (key) {
        const r = await fetch(
          'https://gnews.io/api/v4/search?q=' + encodeURIComponent(q) + '&lang=pt&country=br&max=5&token=' + key,
          { signal: AbortSignal.timeout(9000) }
        );
        const j = await r.json().catch(() => ({}));
        const items = (j.articles || []).slice(0, 5).map((a) => `- ${a.title} (${a.url})`).join('\n');
        return `Top notícias sobre **${q}**:\n${items}\n\nPróxima ação: quer que eu resuma uma dessas?`;
      }
      const r = await fetch(
        'https://hn.algolia.com/api/v1/search?query=' + encodeURIComponent(q) + '&tags=story&hitsPerPage=5',
        { signal: AbortSignal.timeout(9000) }
      );
      const j = await r.json().catch(() => ({}));
      const items = (j.hits || []).slice(0, 5).map((h) => `- ${h.title} (${h.url || ('https://news.ycombinator.com/item?id=' + h.objectID)})`).join('\n');
      return `Top notícias sobre **${q}**:\n${items}\n\nPróxima ação: quer que eu filtre por “Brasil” ou por “mercado”?`;
    } catch (_) {
      return 'Não consegui buscar notícias agora. Próxima ação: tente novamente em 30s.';
    }
  }

  return null;
}

async function generateDailyBrief(userId) {
  if (!isConfigured()) throw new Error('NVIDIA_API_KEY não configurada');

  const context = await buildPipelineContext(userId);
  const content = await nvidiaChat(
    [
      { role: 'system', content: JULIO_SYSTEM_PROMPT },
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
    1000
  );
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
  if (!isConfigured()) throw new Error('NVIDIA_API_KEY não configurada');

  const fast = await maybeHandleFastTool(userMessage);
  let messages = await loadConversationMessages(userId, conversationId);
  messages = sanitizeApiMessages(messages);

  if (fast) {
    messages.push({ role: 'user', content: userMessage });
    messages.push({ role: 'assistant', content: fast });
    const id = await persistConversation(userId, conversationId, messages);
    return { message: fast, conversationId: id };
  }

  const context = await buildPipelineContext(userId);
  const fullMessages = [
    { role: 'system', content: `${buildJulioSystemPrompt()}\n\n${context}` },
    ...messages,
    { role: 'user', content: userMessage },
  ];

  const assistantMessage = await nvidiaChat(fullMessages, 600);

  messages.push({ role: 'user', content: userMessage });
  messages.push({ role: 'assistant', content: assistantMessage });
  const id = await persistConversation(userId, conversationId, messages);

  return { message: assistantMessage, conversationId: id };
}

/**
 * Stream SSE — chama onChunk para cada delta de texto.
 * Retorna { fullText, conversationId }.
 */
async function streamJulioChat(userId, conversationId, userMessage, onChunk) {
  if (!isConfigured()) throw new Error('NVIDIA_API_KEY não configurada');

  const fast = await maybeHandleFastTool(userMessage);
  let messages = await loadConversationMessages(userId, conversationId);
  messages = sanitizeApiMessages(messages);

  if (fast) {
    if (onChunk) onChunk(fast);
    messages.push({ role: 'user', content: userMessage });
    messages.push({ role: 'assistant', content: fast });
    const id = await persistConversation(userId, conversationId, messages);
    return { fullText: fast, conversationId: id };
  }

  const context = await buildPipelineContext(userId);
  const fullMessages = [
    { role: 'system', content: `${buildJulioSystemPrompt()}\n\n${context}` },
    ...messages,
    { role: 'user', content: userMessage },
  ];

  const maxTokens = parseInt(process.env.AI_MAX_TOKENS) || 1024;
  const fullText = await nvidiaChatStream(fullMessages, maxTokens, onChunk);

  messages.push({ role: 'user', content: userMessage });
  messages.push({ role: 'assistant', content: fullText });
  const id = await persistConversation(userId, conversationId, messages);

  return { fullText, conversationId: id };
}

async function analyzeLossPatterns(userId) {
  if (!isConfigured()) throw new Error('NVIDIA_API_KEY não configurada');

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

  const text = await nvidiaChat(
    [
      { role: 'system', content: JULIO_SYSTEM_PROMPT },
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
    500
  );
  const parsed = extractJsonObject(text);
  if (!parsed) return { patterns: [], totalLost: 0, mainReason: null, raw: text };
  return parsed;
}

async function generateInvestorUpdate(userId) {
  if (!isConfigured()) throw new Error('NVIDIA_API_KEY não configurada');

  const context = await buildPipelineContext(userId);
  return nvidiaChat(
    [
      { role: 'system', content: JULIO_SYSTEM_PROMPT },
      {
        role: 'user',
        content: `${context}

Gere um Investor Update profissional baseado nos dados do pipeline.
Formato: texto estruturado em markdown, pronto para enviar a investidores.
Inclua: MRR estimado, pipeline, principais wins, riscos e próximos 30 dias.
Seja conciso e honesto. Máximo 400 palavras.`,
      },
    ],
    800
  );
}

async function listConversations(userId, take = 30) {
  return prisma.julioConversation.findMany({
    where: { userId },
    orderBy: { updatedAt: 'desc' },
    take,
    select: { id: true, title: true, createdAt: true, updatedAt: true, context: true },
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

/**
 * Analyze a deal's MEDDPICC score using AI.
 * Saves to deal_meddpicc_scores + history.
 */
async function analyzeDealMeddpicc(userId, dealId) {
  if (!isConfigured()) throw new Error('NVIDIA_API_KEY não configurada');

  const deal = await prisma.deal.findFirst({
    where: { id: dealId, ownerId: userId, deletedAt: null },
    include: {
      activities: { orderBy: { date: 'desc' }, take: 5 },
      emails: { orderBy: { receivedAt: 'desc' }, take: 3 },
    },
  });
  if (!deal) throw new Error('Deal não encontrado');

  const dealContext = `
Deal: ${deal.companyName}
Valor: $${deal.value.toLocaleString('pt-BR')}
Estágio: ${deal.stage}
Probabilidade: ${deal.probability}%
Risk Score: ${deal.riskScore}/100
Contato: ${deal.contactName || 'não registrado'} (${deal.contactEmail || 'sem email'})
Notas: ${deal.notes || 'nenhuma'}
MEDDPICC atual: ${deal.meddpicc || 'não preenchido'}
Último contato: ${deal.lastContactAt ? new Date(deal.lastContactAt).toLocaleDateString('pt-BR') : 'nunca'}
Atividades recentes: ${deal.activities.map((a) => a.title).join('; ') || 'nenhuma'}
`.trim();

  const prompt = `${dealContext}

Analise este deal pelo framework MEDDPICC com 7 dimensões. Retorne SOMENTE este JSON:

{
  "metrics": { "score": 0-100, "explanation": "o que está confirmado e o que falta", "evidence": "evidência do deal ou null" },
  "economicBuyer": { "score": 0-100, "explanation": "...", "evidence": "..." },
  "decisionCriteria": { "score": 0-100, "explanation": "...", "evidence": "..." },
  "decisionProcess": { "score": 0-100, "explanation": "...", "evidence": "..." },
  "paperProcess": { "score": 0-100, "explanation": "...", "evidence": "..." },
  "identifyPain": { "score": 0-100, "explanation": "...", "evidence": "..." },
  "champion": { "score": 0-100, "explanation": "...", "evidence": "..." },
  "competition": { "score": 0-100, "explanation": "...", "evidence": "..." },
  "totalScore": 0-100,
  "top3Gaps": ["gap1", "gap2", "gap3"],
  "recommendation": "ação específica mais urgente em 1-2 frases",
  "riskLevel": "low|medium|high|critical",
  "forecastImpact": "como este score impacta o forecast"
}`;

  const raw = await nvidiaChat(
    [
      { role: 'system', content: buildJulioSystemPrompt() },
      { role: 'user', content: prompt },
    ],
    1200
  );

  const analysis = extractJsonObject(raw);
  if (!analysis) throw new Error('Julio não retornou JSON válido para MEDDPICC');

  const scores = {
    metricsScore: analysis.metrics?.score || 0,
    economicBuyerScore: analysis.economicBuyer?.score || 0,
    decisionCriteriaScore: analysis.decisionCriteria?.score || 0,
    decisionProcessScore: analysis.decisionProcess?.score || 0,
    paperProcessScore: analysis.paperProcess?.score || 0,
    identifyPainScore: analysis.identifyPain?.score || 0,
    championScore: analysis.champion?.score || 0,
    competitionScore: analysis.competition?.score || 0,
    totalScore: analysis.totalScore || 0,
    analysisJson: JSON.stringify(analysis),
    top3Gaps: JSON.stringify(analysis.top3Gaps || []),
    recommendation: analysis.recommendation || '',
    analyzedAt: new Date(),
    updatedAt: new Date(),
  };

  // Upsert score record
  const existing = await prisma.dealMeddpiccScore.findUnique({ where: { dealId } });
  const prevTotal = existing?.totalScore || 0;

  await prisma.dealMeddpiccScore.upsert({
    where: { dealId },
    create: { dealId, ...scores },
    update: scores,
  });

  // Save history entry
  await prisma.dealMeddpiccHistory.create({
    data: {
      dealId,
      totalScore: scores.totalScore,
      deltaScore: scores.totalScore - prevTotal,
      analysisJson: JSON.stringify(analysis),
      triggeredBy: userId,
    },
  });

  return { dealId, ...analysis };
}

/**
 * Get MEDDPICC history for a deal.
 */
async function getDealMeddpiccHistory(dealId, take = 10) {
  return prisma.dealMeddpiccHistory.findMany({
    where: { dealId },
    orderBy: { createdAt: 'desc' },
    take,
  });
}

/**
 * Get all active deals MEDDPICC scores for dashboard.
 */
async function getMeddpiccDashboard(userId) {
  const deals = await prisma.deal.findMany({
    where: { ownerId: userId, deletedAt: null, stage: { notIn: ['won', 'lost'] } },
    include: { meddpiccScore: true },
    orderBy: { riskScore: 'desc' },
    take: 50,
  });

  return deals.map((d) => ({
    id: d.id,
    companyName: d.companyName,
    value: d.value,
    stage: d.stage,
    riskScore: d.riskScore,
    meddpicc: d.meddpiccScore
      ? {
          totalScore: d.meddpiccScore.totalScore,
          metricsScore: d.meddpiccScore.metricsScore,
          economicBuyerScore: d.meddpiccScore.economicBuyerScore,
          decisionCriteriaScore: d.meddpiccScore.decisionCriteriaScore,
          decisionProcessScore: d.meddpiccScore.decisionProcessScore,
          paperProcessScore: d.meddpiccScore.paperProcessScore,
          identifyPainScore: d.meddpiccScore.identifyPainScore,
          championScore: d.meddpiccScore.championScore,
          competitionScore: d.meddpiccScore.competitionScore,
          top3Gaps: (() => { try { return JSON.parse(d.meddpiccScore.top3Gaps || '[]'); } catch { return []; } })(),
          recommendation: d.meddpiccScore.recommendation,
          analyzedAt: d.meddpiccScore.analyzedAt,
        }
      : null,
  }));
}

/**
 * Analyze a document with AI: summary, risks, key clauses.
 */
async function analyzeDocument(userId, docName, docContent) {
  if (!isConfigured()) throw new Error('NVIDIA_API_KEY não configurada');

  const contentPreview = String(docContent || '').slice(0, 8000);

  const prompt = `Analise este documento jurídico/comercial e retorne SOMENTE este JSON:

Documento: "${docName}"
Conteúdo:
${contentPreview}

{
  "summary": "resumo executivo em 3-4 frases",
  "documentType": "tipo do documento (NDA, contrato, proposta, etc.)",
  "keyParties": ["parte1", "parte2"],
  "keyDates": [{"label": "Vigência", "date": "..."}],
  "keyObligations": ["obrigação 1", "obrigação 2"],
  "risks": [
    {"level": "high|medium|low", "description": "descrição do risco", "clause": "cláusula relacionada ou null"}
  ],
  "missingClauses": ["cláusula que deveria estar mas não está"],
  "negotiationPoints": ["ponto 1 para negociar"],
  "overallRisk": "low|medium|high|critical",
  "recommendation": "ação recomendada em 1-2 frases"
}`;

  const raw = await nvidiaChat(
    [
      { role: 'system', content: buildJulioSystemPrompt() },
      { role: 'user', content: prompt },
    ],
    1500
  );

  const analysis = extractJsonObject(raw);
  if (!analysis) return { raw, summary: 'Análise concluída.', risks: [], overallRisk: 'unknown' };
  return analysis;
}

/**
 * Generate a document from a natural language prompt.
 */
async function generateDocument(userId, prompt, documentType) {
  if (!isConfigured()) throw new Error('NVIDIA_API_KEY não configurada');

  const systemMsg = `Você é um advogado especialista em contratos empresariais brasileiros e internacionais.
Gere documentos juridicamente sólidos, em português do Brasil, seguindo as melhores práticas.
Formato: Markdown estruturado com cabeçalhos, cláusulas numeradas e campos variáveis entre [COLCHETES].`;

  const fullPrompt = `Tipo de documento: ${documentType || 'contrato'}
Instrução: ${prompt}

Gere o documento completo, profissional e pronto para uso, com todos os campos necessários.`;

  return nvidiaChat(
    [
      { role: 'system', content: systemMsg },
      { role: 'user', content: fullPrompt },
    ],
    4000
  );
}

/**
 * Log AI usage for billing/monitoring.
 */
async function logUsage(userId, type, metadata = {}) {
  try {
    await prisma.julioUsageLog.create({
      data: {
        userId,
        type,
        model: getModel(),
        metadata: JSON.stringify(metadata),
      },
    });
  } catch {
    // non-critical — never throw
  }
}

module.exports = {
  JULIO_SYSTEM_PROMPT,
  buildJulioSystemPrompt,
  isConfigured,
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
  analyzeDealMeddpicc,
  getDealMeddpiccHistory,
  getMeddpiccDashboard,
  analyzeDocument,
  generateDocument,
  logUsage,
};
