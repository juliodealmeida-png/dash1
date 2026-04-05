/**
 * JULIO K2.5 SUPER POWERS — v2.0
 * Motor: Groq API (moonshotai/kimi-k2-instruct) com streaming SSE
 * Capacidades: Tool Calling · Thinking Mode · Agent Swarm · Deep Research · Artifact Generation
 *
 * Uso:
 *   window.julioK25.chat(prompt, { mode, onChunk, onDone, onThinking, tools })
 *   window.julioK25.analyzeDeal(dealId)
 *   window.julioK25.deepResearch(topic)
 *   window.julioK25.swarm(topics, numAgents)
 *   window.julioK25.generateArtifact(type, topic)
 */

(function () {
  'use strict';

  // ═══════════════════════════════════════════════════════════════════
  // CONFIG
  // ═══════════════════════════════════════════════════════════════════

  // Dynamic getter — always reads the latest key (set after page load)
  function getGroqKey() { return window.GROQ_API_KEY || localStorage.getItem('groq_api_key') || ''; }
  var GROQ_KEY = getGroqKey();
  var GROQ_URL   = 'https://api.groq.com/openai/v1/chat/completions';
  var MODEL      = 'moonshotai/kimi-k2-instruct'; // Kimi K2 — nativo em todos os modos
  var MODEL_FAST = MODEL;
  var MODEL_DEEP = MODEL;
  var MODEL_TOOL = MODEL; // Kimi K2 tem tool calling nativo

  // Kimi K2 no Groq: context 131k tokens, output até 16k
  var MODES = {
    instant:  { id: 'instant',  label: '⚡ Instant',      model: MODEL, maxTokens: 8192,  temp: 0.7 },
    thinking: { id: 'thinking', label: '🧠 Thinking',     model: MODEL, maxTokens: 16000, temp: 0.4 },
    agent:    { id: 'agent',    label: '🤖 Agent',         model: MODEL, maxTokens: 16000, temp: 0.5 },
    swarm:    { id: 'swarm',    label: '🐝 Swarm',         model: MODEL, maxTokens: 8192,  temp: 0.6 },
    research: { id: 'research', label: '🔬 Deep Research', model: MODEL, maxTokens: 16000, temp: 0.3 },
    news:     { id: 'news',     label: '📰 News & Intel',  model: MODEL, maxTokens: 16000, temp: 0.4 },
  };

  // ═══════════════════════════════════════════════════════════════════
  // SYSTEM PROMPTS
  // ═══════════════════════════════════════════════════════════════════

  var TODAY = new Date().toLocaleDateString('pt-BR', { weekday:'long', year:'numeric', month:'long', day:'numeric' });

  var BASE_SYSTEM = [
    '# JULIO — Revenue Intelligence AI · Guardline Revenue OS',
    'Você é JULIO, powered by Kimi K2 (131k context). Você é o copiloto de vendas B2B mais avançado do mercado.',
    'Data de hoje: ' + TODAY,
    '',
    '## Expertise Total',
    '### Pipeline & Revenue',
    '• Sales Pipeline B2B LATAM — 6 estágios: Qualification → Scope & Validate → Active Pursuit → Proposal → Negotiate → Commit & Signing',
    '• MEDDPICC: Metrics, Economic Buyer, Decision Criteria, Decision Process, Paper Process, Implicate Pain, Champion, Competition',
    '• Forecast 90d: Committed / Best Case / Worst Case / Pipeline Coverage Ratio',
    '• Risk Scoring: Dias sem contato, velocidade de estágio, sinais de churn, champion engajamento',
    '• Win/Loss Analysis: Padrões de vitória, razões de perda, competitive displacement',
    '',
    '### Inteligência de Mercado & Notícias',
    '• Acompanhe notícias de mercado B2B SaaS Brasil/LATAM: funding rounds, M&A, expansão, regulatório',
    '• Monitoramento competitivo: movimentos de concorrentes, pricing, novos produtos, conquistas de clientes',
    '• Sinais de mercado: contratações de VP Sales, expansão de times, stack tecnológico dos prospects',
    '• Economia: câmbio BRL/USD, SELIC, inflação, impacto nos budgets de TI enterprise',
    '• Inteligência de Conta (ICP): LinkedIn insights, notícias da empresa, eventos gatilho de compra',
    '',
    '### Capacidades Técnicas',
    '• Geração de código: HTML/CSS/JS/React/Python/SQL — sempre código completo, funcional e comentado',
    '• Documentos: emails, propostas comerciais, playbooks, battlecards, relatórios executivos',
    '• Análise de dados: interprete métricas, identifique padrões, crie projeções',
    '• Automação: sugira workflows n8n, integrações HubSpot/Pipedrive, scripts de outbound',
    '',
    '## Regras de Comportamento',
    '• **Sempre responda em Português (BR)** — fluente, executivo e preciso',
    '• Seja direto e acionável — foque em insights de alta alavancagem',
    '• Use **negrito** para termos-chave, listas com • para estrutura, ### para seções',
    '• Quando houver dados do pipeline no contexto, use-os — nunca invente dados reais',
    '• Para notícias: indique claramente que são baseadas em conhecimento até sua data de corte',
    '• Para código: sempre entregue versão completa e funcional',
    '• Se a pergunta for ambígua, interprete da forma mais útil possível — não peça clarificação desnecessária',
    '• Pense em escala: suas respostas devem ser dignas de um VP de Sales ou CRO',
  ].join('\n');

  function systemForMode(mode, pipelineCtx) {
    var extra = '';
    if (mode === 'thinking') {
      extra = '\n\n## MODO THINKING ATIVO\nUse seu máximo poder de raciocínio. Pense passo a passo:\n1. **Entenda** o problema em profundidade — identifique o que está sendo realmente perguntado\n2. **Reúna** todos os dados disponíveis no contexto\n3. **Raciocine** explicitamente sobre implicações, trade-offs e cenários\n4. **Valide** sua lógica antes de concluir\n5. **Entregue** resposta estruturada com raciocínio visível\nNão tenha pressa. Profundidade e precisão > velocidade.';
    } else if (mode === 'agent') {
      extra = '\n\n## MODO AGENT ATIVO\nVocê tem acesso a ferramentas (tools) para buscar dados reais do dashboard em tempo real.\nFlow esperado:\n→ Receba a solicitação\n→ Chame as ferramentas necessárias para coletar dados\n→ Analise os dados retornados\n→ Execute ações ou entregue insights baseados em dados reais\n→ Reporte cada etapa: "📊 Buscando pipeline... → 🔍 Analisando riscos... → ✅ Conclusão"\nSeja completamente autônomo — não peça confirmação para usar tools.';
    } else if (mode === 'swarm') {
      extra = '\n\n## MODO AGENT SWARM ATIVO\nVocê orquestra 6 subagentes especializados em paralelo, cada um com perspectiva única.\nEntregue análise em seções:\n### 🎯 [Pipeline Analyst] — estágios, velocidade, cobertura\n### ⚠️ [Risk Analyst] — risk scores, alertas críticos, churn signals\n### 📈 [Forecast Analyst] — committed, best case, timing\n### 🏆 [MEDDPICC Analyst] — gaps de qualificação, champion, decision process\n### 🌐 [Market Intel] — contexto de mercado, competidores, notícias relevantes\n### 💡 [Action Planner] — top 5 ações de maior impacto com owner e prazo\n### 🎖️ [Síntese Executiva] — conclusão consolidada para tomada de decisão';
    } else if (mode === 'research') {
      extra = '\n\n## MODO DEEP RESEARCH ATIVO\nEntregue análise exaustiva e abrangente. Não economize em profundidade:\n1. **Mapeamento completo** — todos os ângulos, perspectivas e dimensões do problema\n2. **Dados e evidências** — cite métricas, benchmarks, padrões do setor\n3. **Análise temporal** — tendências, momentum, projeções\n4. **Outliers e contradições** — identifique o que está fora do padrão\n5. **Implicações práticas** — o que isso significa para B2B SaaS LATAM especificamente\n6. **Síntese executiva** — conclusões priorizadas por impacto\n7. **Plano de ação** — próximos passos concretos com owners e prazos\nUse todo o seu contexto window. Seja exaustivo.';
    } else if (mode === 'news') {
      extra = '\n\n## MODO NEWS & MARKET INTEL ATIVO\nFoco em inteligência de mercado e atualizações:\n• **Notícias relevantes**: funding rounds, M&A, expansões, regulatório, demissões em massa, pivots\n• **Sinais competitivos**: novos produtos, pricing changes, conquistas de clientes, perdas de clientes\n• **Gatilhos de compra**: contratações de VP Sales/CTO/CPO, expansão geográfica, nova rodada\n• **Macroeconomia**: impacto de SELIC, câmbio, cortes de budget em TI enterprise\n• **LATAM watch**: mercados Brasil, México, Colômbia, Argentina — nuances locais\nContextualize todas as informações com impacto direto na estratégia de vendas da Guardline.\nSempre indique: "ℹ️ Baseado em conhecimento até [data de corte]" quando relevante.';
    }
    var ctx = pipelineCtx ? '\n\n---\n## Contexto do Pipeline (dados ao vivo)\n' + pipelineCtx : '';
    return BASE_SYSTEM + extra + ctx;
  }

  // ═══════════════════════════════════════════════════════════════════
  // TOOL DEFINITIONS (Groq function calling)
  // ═══════════════════════════════════════════════════════════════════

  var JULIO_TOOLS = [
    {
      type: 'function',
      function: {
        name: 'get_pipeline_summary',
        description: 'Retorna resumo do pipeline de deals: contagem por estágio, valor total, deals em risco.',
        parameters: { type: 'object', properties: {}, required: [] },
      },
    },
    {
      type: 'function',
      function: {
        name: 'get_deal_detail',
        description: 'Retorna detalhes de um deal específico pelo nome ou ID.',
        parameters: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'Nome da empresa ou ID do deal' },
          },
          required: ['query'],
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'get_forecast_data',
        description: 'Retorna dados de forecast: committed, best case, worst case, e deals no forecast.',
        parameters: { type: 'object', properties: {}, required: [] },
      },
    },
    {
      type: 'function',
      function: {
        name: 'get_high_risk_deals',
        description: 'Retorna lista de deals com risco score alto (≥ 70).',
        parameters: {
          type: 'object',
          properties: {
            threshold: { type: 'number', description: 'Risk score mínimo (default: 70)' },
          },
          required: [],
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'calculate_meddpicc_coverage',
        description: 'Calcula taxa de cobertura MEDDPICC de todos os deals no pipeline.',
        parameters: { type: 'object', properties: {}, required: [] },
      },
    },
    {
      type: 'function',
      function: {
        name: 'generate_email_template',
        description: 'Gera template de email profissional para um deal específico.',
        parameters: {
          type: 'object',
          properties: {
            dealName: { type: 'string', description: 'Nome do deal / empresa' },
            purpose:  { type: 'string', description: 'Objetivo do email: follow_up, proposal, negotiation, closing' },
          },
          required: ['dealName', 'purpose'],
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'get_dashboard_context',
        description: 'Retorna contexto completo do dashboard: pipeline, alertas, deals, métricas, tela ativa.',
        parameters: { type: 'object', properties: {}, required: [] },
      },
    },
    {
      type: 'function',
      function: {
        name: 'get_active_alerts',
        description: 'Retorna alertas ativos do dashboard: deals em risco, follow-ups vencidos, propostas sem resposta.',
        parameters: { type: 'object', properties: {}, required: [] },
      },
    },
    {
      type: 'function',
      function: {
        name: 'get_won_lost_analysis',
        description: 'Retorna análise de deals ganhos e perdidos: razões, padrões, win rate por estágio.',
        parameters: {
          type: 'object',
          properties: {
            period: { type: 'string', description: 'Período: 30d, 90d, 180d (default: 90d)' },
          },
          required: [],
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'search_company_intel',
        description: 'Busca inteligência sobre uma empresa: contexto de mercado, stack tecnológico provável, sinais de compra.',
        parameters: {
          type: 'object',
          properties: {
            company: { type: 'string', description: 'Nome da empresa' },
          },
          required: ['company'],
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'get_sdr_performance',
        description: 'Retorna métricas de performance do SDR Hub: leads, cadências, taxas de conversão.',
        parameters: { type: 'object', properties: {}, required: [] },
      },
    },
  ];

  // ═══════════════════════════════════════════════════════════════════
  // TOOL EXECUTORS — lê dados reais do estado do dashboard
  // ═══════════════════════════════════════════════════════════════════

  function execTool(name, args) {
    var deals = [];
    try {
      if (typeof getDeals === 'function') deals = getDeals() || [];
      else if (window.__guardlineDealsCache) deals = window.__guardlineDealsCache;
    } catch(e) {}

    if (name === 'get_pipeline_summary') {
      var byStage = {};
      var total = 0;
      var atRisk = 0;
      deals.forEach(function(d) {
        var s = d.stage || 'Unknown';
        byStage[s] = (byStage[s] || 0) + 1;
        total += (d.value || 0);
        if ((d.risk || 0) >= 70) atRisk++;
      });
      return JSON.stringify({
        totalDeals: deals.length,
        totalValue: total,
        byStage: byStage,
        atRisk: atRisk,
        avgRisk: deals.length ? Math.round(deals.reduce(function(a,d){return a+(d.risk||0);},0)/deals.length) : 0,
      });
    }

    if (name === 'get_deal_detail') {
      var q = (args.query || '').toLowerCase();
      var found = deals.filter(function(d) {
        return (d.company||'').toLowerCase().includes(q) || String(d.id).toLowerCase().includes(q);
      }).slice(0, 3);
      if (!found.length) return JSON.stringify({ error: 'Deal não encontrado: ' + args.query });
      return JSON.stringify(found.map(function(d) {
        return { company: d.company, value: d.value, stage: d.stage, risk: d.risk, contact: d.contact, nextAction: d.nextAction };
      }));
    }

    if (name === 'get_forecast_data') {
      var active = deals.filter(function(d){ return d.stage !== 'Won' && d.stage !== 'Lost'; });
      var committed = active.filter(function(d){ return (d.risk||100) < 40; }).reduce(function(a,d){return a+(d.value||0);},0);
      var bestCase = active.reduce(function(a,d){return a+(d.value||0);},0);
      var worstCase = Math.round(committed * 0.6);
      return JSON.stringify({
        committed: committed,
        bestCase: bestCase,
        worstCase: worstCase,
        activeDeals: active.length,
        topDeals: active.sort(function(a,b){return(b.value||0)-(a.value||0);}).slice(0,5).map(function(d){return{company:d.company,value:d.value,stage:d.stage,risk:d.risk};}),
      });
    }

    if (name === 'get_high_risk_deals') {
      var thr = args.threshold || 70;
      var risky = deals.filter(function(d){ return (d.risk||0) >= thr; })
        .sort(function(a,b){ return (b.risk||0)-(a.risk||0); });
      return JSON.stringify({
        count: risky.length,
        deals: risky.map(function(d){ return { company: d.company, risk: d.risk, stage: d.stage, value: d.value, daysNoContact: d.daysNoContact }; }),
      });
    }

    if (name === 'calculate_meddpicc_coverage') {
      var withMeddpicc = deals.filter(function(d){ return d.meddpiccCompletion != null || (d._ui && d._ui.meddpicc); });
      var avgCompletion = withMeddpicc.length
        ? Math.round(withMeddpicc.reduce(function(a,d){ return a + (d.meddpiccCompletion || (d._ui&&d._ui.meddpicc&&d._ui.meddpicc.completion) || 0); }, 0) / withMeddpicc.length)
        : 0;
      return JSON.stringify({
        dealsWithMeddpicc: withMeddpicc.length,
        totalDeals: deals.length,
        avgCompletion: avgCompletion,
        coverageRate: deals.length ? Math.round((withMeddpicc.length/deals.length)*100) : 0,
      });
    }

    if (name === 'generate_email_template') {
      return JSON.stringify({
        template: 'Email gerado para ' + args.dealName + ' — objetivo: ' + args.purpose,
        subject: 'Próximos passos — ' + args.dealName,
        body: 'Por favor, use o prompt no chat para gerar o email completo com contexto.',
      });
    }

    if (name === 'get_dashboard_context') {
      var screenName = window.currentScreen || 'command';
      var metrics = {};
      try { if (window.__guardlineMetricsCache) metrics = window.__guardlineMetricsCache; } catch(e) {}
      var alerts = [];
      try { if (window.__guardlineAlertsCache) alerts = window.__guardlineAlertsCache; } catch(e) {}
      return JSON.stringify({
        activeScreen: screenName,
        totalDeals: deals.length,
        totalPipelineValue: deals.reduce(function(a,d){return a+(d.value||0);},0),
        dealsAtRisk: deals.filter(function(d){return(d.risk||0)>=70;}).length,
        activeAlerts: alerts.length,
        metrics: metrics,
        stages: (function(){
          var s={};
          deals.forEach(function(d){s[d.stage||'?']=(s[d.stage||'?']||0)+1;});
          return s;
        })(),
      });
    }

    if (name === 'get_active_alerts') {
      var alertsList = [];
      try { if (window.__guardlineAlertsCache) alertsList = window.__guardlineAlertsCache; } catch(e) {}
      // Generate from deals if no cache
      if (!alertsList.length) {
        deals.forEach(function(d) {
          if ((d.risk||0) >= 80) alertsList.push({ type: 'critical_risk', deal: d.company, risk: d.risk, value: d.value });
          if ((d.daysNoContact||0) > 14) alertsList.push({ type: 'no_contact', deal: d.company, days: d.daysNoContact });
          if (d.stage === 'Proposal' && (d.daysInStage||0) > 21) alertsList.push({ type: 'stalled_proposal', deal: d.company, daysStalled: d.daysInStage });
        });
      }
      return JSON.stringify({ count: alertsList.length, alerts: alertsList.slice(0,20) });
    }

    if (name === 'get_won_lost_analysis') {
      var won = deals.filter(function(d){return d.stage==='Won'||d.outcome==='won';});
      var lost = deals.filter(function(d){return d.stage==='Lost'||d.outcome==='lost';});
      var winRate = (won.length+lost.length) ? Math.round((won.length/(won.length+lost.length))*100) : 0;
      return JSON.stringify({
        won: won.length,
        lost: lost.length,
        winRate: winRate,
        avgWonValue: won.length ? Math.round(won.reduce(function(a,d){return a+(d.value||0);},0)/won.length) : 0,
        lostReasons: lost.slice(0,5).map(function(d){return{company:d.company,reason:d.lostReason||'Não informado',value:d.value};}),
        wonPatterns: won.slice(0,5).map(function(d){return{company:d.company,value:d.value,stage:d.stage};}),
      });
    }

    if (name === 'search_company_intel') {
      var co = args.company || '';
      var found = deals.filter(function(d){return(d.company||'').toLowerCase().includes(co.toLowerCase());});
      return JSON.stringify({
        company: co,
        inPipeline: found.length > 0,
        deals: found.map(function(d){return{company:d.company,value:d.value,stage:d.stage,contact:d.contact,risk:d.risk};}),
        note: 'Para inteligência externa (LinkedIn, Crunchbase, news), use o modo Deep Research ou News & Intel.',
      });
    }

    if (name === 'get_sdr_performance') {
      var sdrData = {};
      try { if (window.__guardlineSdrCache) sdrData = window.__guardlineSdrCache; } catch(e) {}
      var leads = deals.filter(function(d){return d.stage==='Qualification'||d.source==='sdr';});
      return JSON.stringify({
        leadsInQualification: leads.length,
        conversionToActive: leads.length ? Math.round((deals.filter(function(d){return d.stage==='Active Pursuit';}).length/leads.length)*100)+'%' : '0%',
        sdrCache: sdrData,
      });
    }

    return JSON.stringify({ error: 'Tool desconhecida: ' + name });
  }

  // ═══════════════════════════════════════════════════════════════════
  // CORE: GROQ API CALL (com streaming SSE)
  // ═══════════════════════════════════════════════════════════════════

  async function groqStream(messages, opts) {
    opts = opts || {};
    var key = getGroqKey();
    if (!key) {
      if (opts.onError) opts.onError('Groq API key não configurada. Adicione GROQ_API_KEY ao localStorage.');
      return { ok: false, text: '', thinking: '' };
    }

    var model   = opts.model || MODEL_FAST;
    var maxTok  = opts.maxTokens || 2048;
    var temp    = opts.temperature != null ? opts.temperature : 0.7;
    var tools   = opts.tools || null;
    var stream  = opts.stream !== false;

    var body = { model: model, messages: messages, max_tokens: maxTok, temperature: temp, stream: stream };
    if (tools && tools.length) {
      body.tools = tools;
      body.tool_choice = 'auto';
    }

    var res;
    try {
      res = await fetch(GROQ_URL, {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + key, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
    } catch(e) {
      if (opts.onError) opts.onError('Erro de rede: ' + e.message);
      return { ok: false, text: '', thinking: '' };
    }

    if (!res.ok) {
      var errText = await res.text().catch(function(){ return ''; });
      var errMsg = 'Groq API error ' + res.status + ': ' + errText.slice(0, 200);
      if (opts.onError) opts.onError(errMsg);
      return { ok: false, text: '', thinking: '' };
    }

    // Non-streaming (tool use requires non-streaming for multi-turn)
    if (!stream) {
      var json = await res.json();
      var msg = json.choices && json.choices[0] && json.choices[0].message;
      if (!msg) return { ok: false, text: '', thinking: '' };
      return { ok: true, text: msg.content || '', thinking: '', message: msg };
    }

    // Streaming SSE
    var reader  = res.body.getReader();
    var decoder = new TextDecoder();
    var buf = '', full = '', thinking = '';
    try {
      while (true) {
        var step = await reader.read();
        if (step.done) break;
        buf += decoder.decode(step.value, { stream: true });
        var lines = buf.split('\n');
        buf = lines.pop() || '';
        for (var i = 0; i < lines.length; i++) {
          var line = lines[i].trim();
          if (!line.startsWith('data:')) continue;
          var raw = line.slice(5).trim();
          if (raw === '[DONE]') { if (opts.onDone) opts.onDone(full); continue; }
          try {
            var ev = JSON.parse(raw);
            var delta = ev.choices && ev.choices[0] && ev.choices[0].delta;
            if (!delta) continue;
            var chunk = delta.content || '';
            if (chunk) {
              full += chunk;
              if (opts.onChunk) opts.onChunk(chunk, full);
            }
          } catch(_) {}
        }
      }
    } catch(e) {
      if (opts.onError) opts.onError(e.message);
    } finally {
      reader.releaseLock();
    }
    if (opts.onDone) opts.onDone(full);
    return { ok: true, text: full, thinking: thinking };
  }

  // ═══════════════════════════════════════════════════════════════════
  // AGENT LOOP — multi-turn tool calling
  // ═══════════════════════════════════════════════════════════════════

  async function agentLoop(userMsg, systemMsg, opts) {
    opts = opts || {};
    var messages = [{ role: 'system', content: systemMsg }, { role: 'user', content: userMsg }];
    var steps = [];
    var MAX_TURNS = 8;
    var toolsUsed = [];

    for (var turn = 0; turn < MAX_TURNS; turn++) {
      var result = await groqStream(messages, {
        model: MODEL,
        maxTokens: 16000,
        temperature: 0.4,
        stream: false,
        tools: JULIO_TOOLS,
      });
      if (!result.ok) break;

      var msg = result.message;
      messages.push({ role: 'assistant', content: msg.content || null, tool_calls: msg.tool_calls || undefined });

      // No tool calls → final answer
      if (!msg.tool_calls || !msg.tool_calls.length) {
        var finalText = msg.content || '';
        if (opts.onChunk) opts.onChunk(finalText, finalText);
        if (opts.onDone) opts.onDone(finalText);
        return { ok: true, text: finalText, toolsUsed: toolsUsed, steps: steps };
      }

      // Execute each tool call
      for (var ti = 0; ti < msg.tool_calls.length; ti++) {
        var tc = msg.tool_calls[ti];
        var toolName = tc.function.name;
        var toolArgs = {};
        try { toolArgs = JSON.parse(tc.function.arguments || '{}'); } catch(_) {}

        if (opts.onStep) opts.onStep('🔧 Usando ferramenta: **' + toolName + '**...');
        var toolResult = execTool(toolName, toolArgs);
        toolsUsed.push(toolName);
        steps.push({ tool: toolName, args: toolArgs, result: toolResult });

        messages.push({ role: 'tool', tool_call_id: tc.id, content: toolResult });
      }
    }

    return { ok: false, text: 'Máximo de iterações atingido.', toolsUsed: toolsUsed, steps: steps };
  }

  // ═══════════════════════════════════════════════════════════════════
  // BUILD PIPELINE CONTEXT — snapshot do estado atual
  // ═══════════════════════════════════════════════════════════════════

  function buildPipelineContext() {
    var deals = [];
    try {
      if (typeof getDeals === 'function') deals = getDeals() || [];
      else if (window.__guardlineDealsCache) deals = window.__guardlineDealsCache || [];
    } catch(e) {}
    if (!deals.length) return null;
    var byStage = {};
    var totalVal = 0;
    deals.forEach(function(d) {
      var s = d.stage || '?';
      if (!byStage[s]) byStage[s] = { count: 0, value: 0 };
      byStage[s].count++;
      byStage[s].value += (d.value || 0);
      totalVal += (d.value || 0);
    });
    var lines = ['Pipeline atual (' + deals.length + ' deals, $' + totalVal.toLocaleString('en-US') + ' total):'];
    Object.keys(byStage).forEach(function(s) {
      lines.push('  • ' + s + ': ' + byStage[s].count + ' deal(s) — $' + byStage[s].value.toLocaleString('en-US'));
    });
    var atRisk = deals.filter(function(d){ return (d.risk||0) >= 70; });
    if (atRisk.length) lines.push('Deals em risco crítico (' + atRisk.length + '): ' + atRisk.map(function(d){ return d.company+'('+d.risk+')'; }).join(', '));
    return lines.join('\n');
  }

  // ═══════════════════════════════════════════════════════════════════
  // PUBLIC API
  // ═══════════════════════════════════════════════════════════════════

  var julioK25 = {
    currentMode: 'instant',
    isProcessing: false,

    /**
     * Chat principal — suporta todos os modos, streaming ao vivo
     */
    async chat(prompt, opts) {
      opts = opts || {};
      var mode = opts.mode || this.currentMode;
      var modeCfg = MODES[mode] || MODES.instant;
      this.isProcessing = true;
      this.currentMode = mode;

      var pipelineCtx = buildPipelineContext();
      var systemMsg = systemForMode(mode, pipelineCtx);

      try {
        if (mode === 'agent') {
          return await agentLoop(prompt, systemMsg, opts);
        }

        if (mode === 'swarm') {
          return await this._runSwarm(prompt, pipelineCtx, opts);
        }

        if (mode === 'news') {
          // News mode: enrich prompt with dashboard context then deep research
          var newsPrompt = prompt;
          if (pipelineCtx) newsPrompt = prompt + '\n\n[Dashboard Context]\n' + pipelineCtx;
          var messages0 = [
            { role: 'system', content: systemForMode('news', pipelineCtx) },
            { role: 'user', content: newsPrompt },
          ];
          if (opts.history && opts.history.length) {
            opts.history.slice(-6).forEach(function(h) { messages0.splice(-1, 0, { role: h.role, content: h.content }); });
          }
          return await groqStream(messages0, {
            model: MODEL, maxTokens: 16000, temperature: 0.4, stream: true,
            onChunk: opts.onChunk, onDone: opts.onDone, onError: opts.onError,
          });
        }

        var messages = [{ role: 'system', content: systemMsg }];

        // Thread history
        if (opts.history && opts.history.length) {
          opts.history.slice(-10).forEach(function(h) {
            messages.push({ role: h.role, content: h.content });
          });
        }

        messages.push({ role: 'user', content: prompt });

        var result = await groqStream(messages, {
          model: modeCfg.model,
          maxTokens: modeCfg.maxTokens,
          temperature: modeCfg.temp,
          stream: true,
          onChunk: opts.onChunk,
          onDone: opts.onDone,
          onError: opts.onError,
        });

        return result;
      } finally {
        this.isProcessing = false;
      }
    },

    /**
     * Agent Swarm — paralleliza N subtarefas, consolida resultado
     */
    async _runSwarm(userPrompt, pipelineCtx, opts) {
      if (opts.onStep) opts.onStep('🐝 Iniciando Agent Swarm...');

      var subTasks = [
        { name: 'Pipeline Analyst',  prompt: 'Como especialista em pipeline B2B LATAM, faça análise profunda: ' + userPrompt + '\nFoco: estágios, velocidade de ciclo, cobertura por etapa, deals parados.' },
        { name: 'Risk Analyst',      prompt: 'Como especialista em risk management de vendas B2B, analise: ' + userPrompt + '\nFoco: risk scores, alertas críticos, sinais de churn, champion engagement.' },
        { name: 'Forecast Analyst',  prompt: 'Como especialista em forecast e revenue operations, analise: ' + userPrompt + '\nFoco: committed vs best case vs worst case, probabilidades, timing de fechamento.' },
        { name: 'MEDDPICC Analyst',  prompt: 'Como especialista em qualification frameworks MEDDPICC, analise: ' + userPrompt + '\nFoco: gaps de qualificação por deal, champion identification, decision process gaps.' },
        { name: 'Market Intel',      prompt: 'Como analista de inteligência de mercado B2B SaaS LATAM, contextualize: ' + userPrompt + '\nFoco: tendências de mercado, movimentos competitivos, sinais externos que impactam este pipeline.' },
        { name: 'Action Planner',    prompt: 'Como CRO / coach de vendas executivo, baseado em: ' + userPrompt + '\nEntregue top 5 ações de maior impacto com: owner, prazo, métrica de sucesso.' },
      ];

      var systemBase = BASE_SYSTEM + (pipelineCtx ? '\n\n[PIPELINE]\n' + pipelineCtx : '');

      var promises = subTasks.map(function(task, idx) {
        return groqStream(
          [{ role: 'system', content: systemBase }, { role: 'user', content: '[' + task.name + '] ' + task.prompt }],
          { model: MODEL, maxTokens: 4096, temperature: 0.5, stream: false }
        ).then(function(r) {
          return { agent: task.name, result: r.text || '' };
        }).catch(function(e) {
          return { agent: task.name, result: 'Erro: ' + e.message };
        });
      });

      if (opts.onStep) opts.onStep('🐝 ' + subTasks.length + ' subagentes executando em paralelo...');

      var results = await Promise.all(promises);

      // Consolidate with a final call
      var consolidatePrompt = 'Você é o Orquestrador do Agent Swarm. Consolide os seguintes relatórios de ' + results.length + ' subagentes em uma síntese executiva coesa:\n\n' +
        results.map(function(r) { return '### ' + r.agent + '\n' + r.result; }).join('\n\n') +
        '\n\nSíntese: Destaque os insights mais críticos, priorize as ações e apresente um plano unificado em Português (BR).';

      if (opts.onStep) opts.onStep('🎯 Consolidando resultados do Swarm...');

      var consolidated = await groqStream(
        [{ role: 'system', content: BASE_SYSTEM }, { role: 'user', content: consolidatePrompt }],
        { model: MODEL, maxTokens: 16000, temperature: 0.3, stream: true, onChunk: opts.onChunk, onDone: opts.onDone, onError: opts.onError }
      );

      return { ok: true, text: consolidated.text, swarmResults: results };
    },

    /**
     * Análise profunda de deal específico (Thinking mode)
     */
    async analyzeDeal(dealId, analysisType) {
      analysisType = analysisType || 'full';
      var deal = null;
      try {
        if (typeof dealById === 'function') deal = dealById(dealId);
      } catch(e) {}

      var prompt = deal
        ? 'Faça uma análise COMPLETA deste deal:\n\nEmpresa: ' + (deal.company||'?') + '\nValor: $' + (deal.value||0).toLocaleString('en-US') + '\nEstágio: ' + (deal.stage||'?') + '\nRisk Score: ' + (deal.risk||0) + '/100\nContato: ' + (deal.contact||'?') + '\nPróxima ação: ' + (deal.nextAction||'?') + '\nMEDDPICC: ' + (deal.meddpiccCompletion||0) + '% preenchido\n\nEntregue:\n1. Diagnóstico MEDDPICC (elementos faltantes + impacto)\n2. Top 3 riscos de perda\n3. Plano de ação para os próximos 14 dias\n4. Previsão de fechamento (probabilidade + prazo)'
        : 'Analise o deal ID ' + dealId + ' e forneça análise completa com base no contexto do pipeline.';

      return this.chat(prompt, { mode: 'thinking' });
    },

    /**
     * Deep Research sobre qualquer tópico
     */
    async deepResearch(topic, opts) {
      opts = opts || {};
      var prompt = 'Deep Research — ' + topic + '\n\nEntregue:\n1. Visão geral estruturada\n2. Dados e métricas relevantes\n3. Tendências e padrões\n4. Implicações práticas para B2B SaaS LATAM\n5. Recomendações executivas priorizadas\n6. Próximas ações concretas';
      return this.chat(prompt, Object.assign({ mode: 'research' }, opts));
    },

    /**
     * Gera artefato: email, proposta, relatório, planilha
     */
    async generateArtifact(type, topic, context, opts) {
      opts = opts || {};
      var typeInstructions = {
        email:     'Gere um email profissional completo, com Subject, saudação, corpo estruturado e assinatura.',
        proposal:  'Gere uma proposta comercial completa em Markdown: executive summary, escopo, timeline, investimento, termos.',
        report:    'Gere um relatório executivo completo com KPIs, análise e recomendações.',
        playbook:  'Gere um playbook de vendas completo com scripts, objeções, critérios MEDDPICC por estágio.',
        dashboard: 'Gere código HTML/CSS/JS completo para um dashboard interativo responsivo.',
        analysis:  'Gere análise completa com dados, gráficos (em ASCII/texto), insights e conclusões.',
      };
      var instruction = typeInstructions[type] || 'Gere conteúdo completo e profissional.';
      var prompt = instruction + '\n\nTema: ' + topic + (context ? '\nContexto: ' + context : '');
      return this.chat(prompt, Object.assign({ mode: type === 'dashboard' ? 'agent' : 'research' }, opts));
    },

    /**
     * Chat com Groq diretamente no float panel (substitui backend em demo mode)
     */
    async floatChat(message, history, opts) {
      opts = opts || {};
      history = history || [];
      return this.chat(message, {
        mode: this.currentMode,
        history: history,
        onChunk: opts.onChunk,
        onDone:  opts.onDone,
        onError: opts.onError,
        onStep:  opts.onStep,
      });
    },
  };

  window.julioK25 = julioK25;

  // ═══════════════════════════════════════════════════════════════════
  // FLOAT PANEL INTEGRATION — streaming direto para o painel
  // ═══════════════════════════════════════════════════════════════════

  /**
   * Versão Groq-native de julioFloatSend — usada quando backend está indisponível
   * ou quando o usuário quer forçar modo Groq.
   */
  window.julioK25FloatSend = function(message, panelEl) {
    if (!message || !message.trim()) return;
    if (!getGroqKey()) {
      console.warn('[Julio K2.5] GROQ_API_KEY não configurada');
      return false;
    }
    var hist = panelEl ? panelEl.querySelector('.jfp-history') : document.querySelector('.jfp-history');
    if (!hist) return false;

    // User bubble
    var userBubble = document.createElement('div');
    userBubble.className = 'jfp-msg user';
    userBubble.textContent = message;
    hist.appendChild(userBubble);
    hist.scrollTop = hist.scrollHeight;

    // Julio streaming bubble
    var julioBubble = document.createElement('div');
    julioBubble.className = 'jfp-msg julio';
    julioBubble.innerHTML = '<span class="jfp-cursor"></span>';
    hist.appendChild(julioBubble);
    hist.scrollTop = hist.scrollHeight;

    julioK25.floatChat(message, window.__julioFloatHistory || [], {
      onChunk: function(chunk, full) {
        julioBubble.textContent = full;
        var cursor = document.createElement('span');
        cursor.className = 'jfp-cursor';
        julioBubble.appendChild(cursor);
        hist.scrollTop = hist.scrollHeight;
      },
      onStep: function(step) {
        var stepEl = document.createElement('div');
        stepEl.style.cssText = 'font-size:11px;color:var(--accent-amber,#f59e0b);padding:4px 0;font-style:italic';
        stepEl.textContent = step;
        julioBubble.appendChild(stepEl);
        hist.scrollTop = hist.scrollHeight;
      },
      onDone: function(full) {
        julioBubble.textContent = '';
        _renderMarkdownTo(julioBubble, full);
        hist.scrollTop = hist.scrollHeight;
        if (!window.__julioFloatHistory) window.__julioFloatHistory = [];
        window.__julioFloatHistory.push({ role: 'user', content: message });
        window.__julioFloatHistory.push({ role: 'assistant', content: full });
        if (window.__julioFloatHistory.length > 30) window.__julioFloatHistory = window.__julioFloatHistory.slice(-30);
      },
      onError: function(err) {
        julioBubble.textContent = '⚠️ Erro: ' + err;
        julioBubble.style.color = 'var(--accent-red,#ef4444)';
      },
    });
    return true;
  };

  // Simple markdown → DOM renderer for chat bubbles
  function _renderMarkdownTo(el, text) {
    el.innerHTML = '';
    var lines = (text || '').split('\n');
    var inList = false;
    var listEl = null;
    lines.forEach(function(line) {
      if (/^\s*[•\-\*] /.test(line)) {
        if (!inList) { listEl = document.createElement('ul'); listEl.style.cssText='padding-left:16px;margin:4px 0'; el.appendChild(listEl); inList = true; }
        var li = document.createElement('li');
        li.style.marginBottom = '2px';
        _renderInline(li, line.replace(/^\s*[•\-\*] /, ''));
        listEl.appendChild(li);
      } else {
        inList = false; listEl = null;
        if (!line.trim()) { var br = document.createElement('br'); el.appendChild(br); return; }
        if (/^#{1,3} /.test(line)) {
          var h = document.createElement('strong');
          h.style.cssText = 'display:block;margin-top:8px;color:var(--accent-purple-light,#a78bfa)';
          h.textContent = line.replace(/^#{1,3} /, '');
          el.appendChild(h);
        } else {
          var p = document.createElement('span');
          p.style.cssText = 'display:block;margin-bottom:2px';
          _renderInline(p, line);
          el.appendChild(p);
        }
      }
    });
  }

  function _renderInline(el, text) {
    var parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
    parts.forEach(function(part) {
      if (/^\*\*.+\*\*$/.test(part)) {
        var b = document.createElement('strong');
        b.textContent = part.replace(/\*\*/g, '');
        el.appendChild(b);
      } else if (/^`.+`$/.test(part)) {
        var code = document.createElement('code');
        code.style.cssText = 'background:rgba(124,58,237,.15);padding:1px 5px;border-radius:3px;font-size:12px;color:#a78bfa';
        code.textContent = part.slice(1, -1);
        el.appendChild(code);
      } else {
        el.appendChild(document.createTextNode(part));
      }
    });
  }

  // ═══════════════════════════════════════════════════════════════════
  // FLOAT PANEL UI — mode selector + enhanced send
  // ═══════════════════════════════════════════════════════════════════

  window.julioK25.initUI = function () {
    var panel = document.getElementById('julio-float-panel');
    if (!panel || document.getElementById('jk25-mode-bar')) return;

    var header = panel.querySelector('.jfp-header');
    if (!header) return;

    // Mode bar
    var modeBar = document.createElement('div');
    modeBar.id = 'jk25-mode-bar';
    modeBar.style.cssText = 'display:flex;gap:4px;padding:6px 14px;border-bottom:1px solid rgba(255,255,255,.06);flex-wrap:wrap;background:rgba(0,0,0,.15)';

    Object.values(MODES).forEach(function(m) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = m.label;
      btn.title = m.id;
      btn.setAttribute('data-jk25-mode', m.id);
      btn.style.cssText = 'padding:3px 9px;border-radius:6px;border:1px solid rgba(255,255,255,.12);background:' +
        (julioK25.currentMode === m.id ? 'rgba(124,58,237,.3)' : 'rgba(124,58,237,.06)') +
        ';color:' + (julioK25.currentMode === m.id ? '#fff' : '#94a3b8') +
        ';font-size:10px;cursor:pointer;transition:all .15s;white-space:nowrap';
      btn.onclick = function () {
        julioK25.currentMode = m.id;
        document.querySelectorAll('[data-jk25-mode]').forEach(function(b) {
          b.style.background = 'rgba(124,58,237,.06)';
          b.style.color = '#94a3b8';
        });
        btn.style.background = 'rgba(124,58,237,.3)';
        btn.style.color = '#fff';
        var sub = panel.querySelector('.jfp-sub');
        if (sub) sub.textContent = m.label + ' ativo';
      };
      modeBar.appendChild(btn);
    });

    header.parentElement.insertBefore(modeBar, header.nextSibling);

    // Intercept send button to use Groq-native when in non-instant mode or demo
    var inputEl = panel.querySelector('.jfp-input, textarea');
    var sendEl  = panel.querySelector('.jfp-send, button[type="submit"]');

    if (sendEl && inputEl) {
      var originalOnclick = sendEl.onclick;
      sendEl.onclick = function(e) {
        var msg = inputEl.value.trim();
        if (!msg) return;
        // Use Groq directly always (fast, no backend needed)
        if (getGroqKey()) {
          e.preventDefault();
          e.stopPropagation();
          inputEl.value = '';
          window.julioK25FloatSend(msg, panel);
          return;
        }
        // Fallback to original if no Groq key
        if (originalOnclick) originalOnclick.call(sendEl, e);
      };

      // Enter key support
      inputEl.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          sendEl.click();
        }
      }, { capture: true });
    }
  };

  // ═══════════════════════════════════════════════════════════════════
  // ENHANCE sendJulioMessage — inject Groq when no backend
  // ═══════════════════════════════════════════════════════════════════

  var _origSendJulioMessage = window.sendJulioMessage;
  window.sendJulioMessage = function(raw) {
    var text = (raw || '').trim();
    if (!text) return;

    // If logged in or no Groq key → use original
    var hasBackend = typeof Auth !== 'undefined' && Auth.isLoggedIn && Auth.isLoggedIn() &&
      Auth.getToken && Auth.getToken() !== 'guardline-demo-session';

    if (hasBackend || !getGroqKey()) {
      if (typeof _origSendJulioMessage === 'function') return _origSendJulioMessage(raw);
      return;
    }

    // Demo mode or no backend → use Groq directly
    var hist = document.getElementById('julio-chat-history');
    if (!hist) { if (typeof _origSendJulioMessage === 'function') return _origSendJulioMessage(raw); return; }

    var userBubble = document.createElement('div');
    userBubble.className = 'chat-msg user';
    userBubble.textContent = text;
    hist.appendChild(userBubble);
    hist.scrollTop = hist.scrollHeight;

    var julioBubble = document.createElement('div');
    julioBubble.className = 'chat-msg julio';
    var span = document.createElement('span');
    span.className = 'chat-text';
    span.textContent = '…';
    julioBubble.appendChild(span);
    hist.appendChild(julioBubble);
    hist.scrollTop = hist.scrollHeight;

    var history = window.__julioChatHistory || [];

    julioK25.chat(text, {
      mode: julioK25.currentMode,
      history: history,
      onChunk: function(chunk, full) {
        span.textContent = full;
        hist.scrollTop = hist.scrollHeight;
      },
      onStep: function(step) {
        var stepEl = document.createElement('div');
        stepEl.style.cssText = 'font-size:11px;color:var(--accent-amber,#f59e0b);font-style:italic;margin-top:4px';
        stepEl.textContent = step;
        julioBubble.appendChild(stepEl);
        hist.scrollTop = hist.scrollHeight;
      },
      onDone: function(full) {
        span.textContent = '';
        _renderMarkdownTo(span, full);
        hist.scrollTop = hist.scrollHeight;
        if (!window.__julioChatHistory) window.__julioChatHistory = [];
        window.__julioChatHistory.push({ role: 'user', content: text });
        window.__julioChatHistory.push({ role: 'assistant', content: full });
        if (window.__julioChatHistory.length > 20) window.__julioChatHistory = window.__julioChatHistory.slice(-20);
      },
      onError: function(err) {
        span.textContent = '⚠️ ' + err;
        span.style.color = 'var(--accent-red,#ef4444)';
        // Fallback to local response
        if (typeof matchJulioResponse === 'function') {
          span.textContent = '';
          if (typeof streamJulioReply === 'function') streamJulioReply(matchJulioResponse(text));
        }
      },
    });
  };

  // ═══════════════════════════════════════════════════════════════════
  // AUTO-INIT
  // ═══════════════════════════════════════════════════════════════════

  function tryInit() {
    if (document.getElementById('julio-float-panel')) {
      window.julioK25.initUI();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() { setTimeout(tryInit, 800); });
  } else {
    setTimeout(tryInit, 800);
  }

  // Re-init when float panel opens (since it may not exist on load)
  var _origJulioFloatOpen = window.julioFloatOpen;
  window.julioFloatOpen = function(msg) {
    if (typeof _origJulioFloatOpen === 'function') _origJulioFloatOpen(msg);
    setTimeout(function() { window.julioK25.initUI(); }, 200);
  };

  console.log('[Julio K2.5 v2.0] carregado ✓ | key:', getGroqKey() ? 'configurada' : 'AUSENTE — configure window.GROQ_API_KEY');
  console.log('[Julio K2.5] Modos disponíveis:', Object.keys(MODES).join(', '));
})();
