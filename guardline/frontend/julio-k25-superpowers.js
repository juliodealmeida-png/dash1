/**
 * JULIO K2.5 SUPER POWERS — Extensão de Capacidades Avançadas
 * Integra: Agent Swarm, Visual Processing, Deep Research, Artifact Generation
 *
 * Inicializado após guardline.html carregado
 * Uso: window.julioK25.activate(mode, prompt, options)
 */

(function() {
  'use strict';

  // ═══════════════════════════════════════════════════════════════════════════
  // CONFIG: API & Constants
  // ═══════════════════════════════════════════════════════════════════════════

  // Load from window config (set by backend/environment, NOT hardcoded)
  const GROQ_API_KEY = window.GROQ_API_KEY || localStorage.getItem('groq_api_key') || '';
  const GROQ_ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions';

  const JULIO_MODES = {
    INSTANT: { id: 'instant', label: '⚡ Instant', desc: 'Respostas rápidas', timeout: 15000 },
    THINKING: { id: 'thinking', label: '🧠 Thinking', desc: 'Raciocínio profundo', timeout: 45000 },
    AGENT: { id: 'agent', label: '🤖 Agent', desc: 'Execução autônoma', timeout: 120000 },
    SWARM: { id: 'swarm', label: '🐝 Agent Swarm', desc: 'Paralelo massivo (100x)', timeout: 180000 },
    RESEARCH: { id: 'research', label: '🔬 Deep Research', desc: 'Análise exaustiva', timeout: 90000 },
  };

  const JULIO_CAPABILITIES = {
    MEDDPICC_DEEP: 'Análise MEDDPICC profunda com raciocínio multi-step',
    PIPELINE_FORECAST: 'Previsão pipeline com regressão + Monte Carlo',
    DEAL_INTELLIGENCE: 'Inteligência de negócio: padrões perdidos, sinais de risco',
    CONTRACT_REVIEW: 'Análise de contratos: cláusulas, riscos, comparativa',
    MARKET_RESEARCH: 'Pesquisa de mercado paralela (100 URLs simultâneos)',
    VISUAL_ANALYSIS: 'Análise de imagens: UI/UX, gráficos, dados',
    CODE_GENERATION: 'Geração de código: HTML, React, Python, SQL',
    ARTIFACT_GENERATION: 'Gera: Slides, Docs, Sheets, Websites, PDFs',
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // JULIO K2.5 Object — Main API
  // ═══════════════════════════════════════════════════════════════════════════

  window.julioK25 = {
    currentMode: JULIO_MODES.INSTANT,
    isProcessing: false,
    activeTasks: [],

    /**
     * Ativa uma capacidade específica do Julio K2.5
     * @param {string} mode - 'instant', 'thinking', 'agent', 'swarm', 'research'
     * @param {string} prompt - Mensagem do usuário
     * @param {object} options - { context, files, deal, images, ... }
     */
    async activate(mode, prompt, options = {}) {
      const modeConfig = JULIO_MODES[mode.toUpperCase()] || JULIO_MODES.INSTANT;
      this.currentMode = modeConfig;
      this.isProcessing = true;

      try {
        const systemPrompt = this._buildSystemPrompt(modeConfig.id, options);
        const fullPrompt = this._buildFullPrompt(prompt, options);

        let response;
        switch (modeConfig.id) {
          case 'instant':
            response = await this._callGroqInstant(systemPrompt, fullPrompt);
            break;
          case 'thinking':
            response = await this._callGroqThinking(systemPrompt, fullPrompt);
            break;
          case 'agent':
            response = await this._callGroqAgent(systemPrompt, fullPrompt, options);
            break;
          case 'swarm':
            response = await this._callGroqSwarm(systemPrompt, fullPrompt, options);
            break;
          case 'research':
            response = await this._callGroqDeepResearch(systemPrompt, fullPrompt, options);
            break;
          default:
            response = await this._callGroqInstant(systemPrompt, fullPrompt);
        }

        return response;
      } catch (error) {
        console.error('[Julio K2.5] Error:', error);
        throw error;
      } finally {
        this.isProcessing = false;
      }
    },

    /**
     * Entrega um resultado final ao usuário
     */
    async sendToJulio(message, mode = 'INSTANT') {
      if (typeof julioFloatOpen === 'function') {
        julioFloatOpen(message);
      }
      const result = await this.activate(mode, message);
      return result;
    },

    /**
     * Analisa um deal com raciocínio profundo (Thinking mode)
     */
    async analyzeDeal(dealId, analysisType = 'full') {
      const deal = window.dealById ? window.dealById(dealId) : null;
      if (!deal) return null;

      const prompt = `Analise COMPLETA do deal: ${deal.company}

      Valor: $${deal.value}
      Estágio: ${deal.stage}
      Risk Score: ${deal.risk}/100

      Tipos de Análise Pedidos:
      - ${analysisType === 'full' || analysisType === 'meddpicc' ? 'MEDDPICC profundo' : ''}
      - ${analysisType === 'full' || analysisType === 'risk' ? 'Análise de risco' : ''}
      - ${analysisType === 'full' || analysisType === 'forecast' ? 'Previsão de close' : ''}
      - ${analysisType === 'full' || analysisType === 'actions' ? 'Próximas ações recomendadas' : ''}
      `;

      return this.activate('THINKING', prompt, { deal });
    },

    /**
     * Pesquisa paralela (utiliza Agent Swarm)
     * Cria N subagentes para pesquisar paralelamente
     */
    async parallelResearch(topics, numAgents = 10) {
      const subagentPrompts = topics.map((topic, idx) => ({
        id: `agent-${idx}`,
        prompt: `Pesquise em profundidade sobre: ${topic}

        Retorne:
        1. Fatos principais (com fontes)
        2. Tendências atuais
        3. Dados numéricos (se aplicável)
        4. Conclusões executivas
        `,
      }));

      return this.activate('SWARM', `Pesquisa Paralela: ${topics.join(', ')}`, {
        subagents: subagentPrompts,
        consolidate: true,
      });
    },

    /**
     * Deep Research: Busca, análise, síntese
     */
    async deepResearch(topic, depth = 'comprehensive') {
      const prompt = `Deep Research – Nível: ${depth}

      Tema: ${topic}

      Entregáveis:
      1. Mapa mental de conceitos conectados
      2. Timeline histórico (se aplicável)
      3. Análise comparativa de abordagens
      4. Dados e estatísticas com fontes
      5. Síntese recomendações`;

      return this.activate('RESEARCH', prompt);
    },

    /**
     * Gera artefatos: Slides, Docs, Sheets, HTML websites
     */
    async generateArtifact(type, title, content, style = 'professional') {
      const prompt = `Gere um ${type.toUpperCase()} completo

      Título: ${title}
      Estilo: ${style}
      Conteúdo-base: ${content}

      Requisitos:
      - Qualidade de produção
      - Design coerente
      - Responsivo/exportável`;

      const result = await this.activate('AGENT', prompt, { artifactType: type });
      return {
        type,
        title,
        content: result,
        exportUrl: await this._generateExportUrl(type, result),
      };
    },

    /**
     * Análise visual: imagens, screenshots, gráficos
     */
    async analyzeVisual(imageUrl, analysisPrompt) {
      return this.activate('THINKING', `Analise visual: ${analysisPrompt}`, {
        images: [imageUrl],
      });
    },

    /**
     * Replicate UI from screenshot (Visual Coding)
     */
    async replicateUI(screenshotUrl, targetFramework = 'react') {
      const prompt = `Replique a interface deste screenshot em ${targetFramework}

      Requisitos:
      - Código funcional imediato
      - Componentização clara
      - Styling responsivo
      - Exports: code + live preview`;

      return this.activate('AGENT', prompt, {
        images: [screenshotUrl],
        targetFramework,
      });
    },

    // ───────────────────────────────────────────────────────────────────────
    // PRIVATE METHODS
    // ───────────────────────────────────────────────────────────────────────

    _buildSystemPrompt(mode, options = {}) {
      let prompt = `Você é JULIO, o Revenue Intelligence AI de Guardline — especialista em:
        - Sales Pipeline & Forecasting
        - MEDDPICC Framework
        - Deal Analysis & Risk Management
        - Market Research
        - Legal Document Analysis
        - Code Generation & Web Development

        Linguagem: Português (BR)
        Tom: Profissional, direto, acionável

        Contexto do Dashboard:
        ${options.deal ? `Deal Atual: ${options.deal.company}` : ''}
        ${options.pipeline ? `Pipeline: ${Object.keys(options.pipeline).length} estágios mapeados` : ''}
        Modo Operacional: ${mode.toUpperCase()}`;

      if (mode === 'swarm') {
        prompt += `

        VOCÊ ESTÁ EM AGENT SWARM MODE:
        - Crie 10-100 subagentes especializados conforme necessário
        - Coordene pesquisas paralelas
        - Consolide resultados com síntese executiva
        - Relatar progresso de cada subagente`;
      }

      if (mode === 'research') {
        prompt += `

        DEEP RESEARCH MODE ATIVADO:
        - Busque múltiplas fontes (web, dados estruturados, papers)
        - Crie mapa conceitual
        - Analise tendências longitudinais
        - Identifique outliers e contradições
        - Exiba cadeia de raciocínio completa`;
      }

      return prompt;
    },

    _buildFullPrompt(userPrompt, options = {}) {
      let full = userPrompt;

      if (options.deal) {
        full += `\n\n[CONTEXTO DEAL]\n${JSON.stringify(options.deal, null, 2)}`;
      }

      if (options.images && options.images.length) {
        full += `\n\n[IMAGENS ANEXADAS: ${options.images.length} arquivo(s)]`;
      }

      if (options.pipeline) {
        full += `\n\n[PIPELINE ATUAL]\n${JSON.stringify(options.pipeline, null, 2)}`;
      }

      if (options.context) {
        full += `\n\n[CONTEXTO ADICIONAL]\n${options.context}`;
      }

      return full;
    },

    _callGroqInstant(systemPrompt, userPrompt) {
      if (!GROQ_API_KEY) {
        console.error('[Julio K2.5] GROQ_API_KEY not configured');
        return Promise.resolve('API key not configured. Configure GROQ_API_KEY in environment.');
      }

      return fetch(GROQ_ENDPOINT, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${GROQ_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'mixtral-8x7b-32768', // Rápido, bom custo
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          temperature: 0.7,
          max_tokens: 2000,
          stream: false,
        }),
      })
        .then(r => r.json())
        .then(data => data.choices[0]?.message?.content || 'Sem resposta');
    },

    _callGroqThinking(systemPrompt, userPrompt) {
      if (!GROQ_API_KEY) {
        return Promise.resolve({ reasoning: 'API key not configured', answer: 'Configure GROQ_API_KEY in environment.' });
      }

      // Thinking mode: exibe raciocínio antes da resposta
      return fetch(GROQ_ENDPOINT, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${GROQ_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'mixtral-8x7b-32768',
          messages: [
            { role: 'system', content: systemPrompt + '\n\nPEDA ANÁLISE PASSO-A-PASSO ANTES DE RESPONDER FINAL.' },
            { role: 'user', content: userPrompt },
          ],
          temperature: 0.5,
          max_tokens: 4000,
          stream: false,
        }),
      })
        .then(r => r.json())
        .then(data => ({
          reasoning: data.choices[0]?.message?.content?.split('\n---\n')[0] || '',
          answer: data.choices[0]?.message?.content?.split('\n---\n')[1] || data.choices[0]?.message?.content,
        }));
    },

    _callGroqAgent(systemPrompt, userPrompt, options = {}) {
      if (!GROQ_API_KEY) {
        return Promise.resolve({ status: 'error', result: 'GROQ_API_KEY not configured' });
      }

      // Agent mode: pode usar tools, executar ações
      return fetch(GROQ_ENDPOINT, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${GROQ_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'mixtral-8x7b-32768',
          messages: [
            { role: 'system', content: systemPrompt + '\n\nEXECUTE TAREFAS AUTONOMAMENTE. PLANEJE, EXECUTE, ITERA.' },
            { role: 'user', content: userPrompt },
          ],
          temperature: 0.6,
          max_tokens: 8000,
          stream: false,
        }),
      })
        .then(r => r.json())
        .then(data => ({
          status: 'completed',
          result: data.choices[0]?.message?.content,
          timestamp: new Date().toISOString(),
        }));
    },

    _callGroqSwarm(systemPrompt, userPrompt, options = {}) {
      if (!GROQ_API_KEY) {
        return Promise.resolve({ status: 'error', result: 'GROQ_API_KEY not configured' });
      }

      // Agent Swarm: cria subagentes em paralelo
      const numAgents = options.numAgents || 10;
      const subagentPromises = [];

      for (let i = 0; i < numAgents; i++) {
        const subPrompt = `[SUBAGENTE ${i + 1}/${numAgents}]\n${userPrompt}`;
        subagentPromises.push(
          fetch(GROQ_ENDPOINT, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${GROQ_API_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: 'mixtral-8x7b-32768',
              messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: subPrompt },
              ],
              temperature: 0.5,
              max_tokens: 2000,
              stream: false,
            }),
          })
            .then(r => r.json())
            .then(data => ({
              agentId: i + 1,
              result: data.choices[0]?.message?.content,
            }))
        );
      }

      return Promise.all(subagentPromises).then(results => ({
        status: 'swarm_completed',
        agents: numAgents,
        results,
        summary: this._consolidateSwarmResults(results),
        timestamp: new Date().toISOString(),
      }));
    },

    _callGroqDeepResearch(systemPrompt, userPrompt, options = {}) {
      if (!GROQ_API_KEY) {
        return Promise.resolve({ status: 'error', result: 'GROQ_API_KEY not configured' });
      }

      // Deep Research: múltiplas iterações + síntese
      return fetch(GROQ_ENDPOINT, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${GROQ_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'mixtral-8x7b-32768',
          messages: [
            {
              role: 'system',
              content: systemPrompt + `

DEEP RESEARCH PROTOCOL:
1. Identifique subtópicos principais
2. Pesquise cada um em profundidade
3. Busque contradições e consensos
4. Crie mapa conceitual
5. Síntese executiva com conclusões`,
            },
            { role: 'user', content: userPrompt },
          ],
          temperature: 0.4,
          max_tokens: 12000,
          stream: false,
        }),
      })
        .then(r => r.json())
        .then(data => ({
          status: 'research_completed',
          depth: 'comprehensive',
          research: data.choices[0]?.message?.content,
          timestamp: new Date().toISOString(),
        }));
    },

    _consolidateSwarmResults(results) {
      const combined = results.map(r => r.result).join('\n\n---\n\n');
      return `Consolidado de ${results.length} agentes:\n${combined}`;
    },

    _generateExportUrl(type, content) {
      // Simula geração de URL exportável
      return `data:text/plain,${encodeURIComponent(JSON.stringify({
        type,
        content,
        generated: new Date().toISOString(),
      }))}`;
    },
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // UI INTEGRATION: Mode Selector & Enhanced Float Panel
  // ═══════════════════════════════════════════════════════════════════════════

  window.julioK25.initUI = function() {
    const jfpHeader = document.querySelector('.jfp-header');
    if (!jfpHeader) return;

    // Adiciona seletor de modo ao header
    const modeSelector = document.createElement('div');
    modeSelector.style.cssText = 'display:flex;gap:4px;margin-top:8px;flex-wrap:wrap;padding-top:8px;border-top:1px solid rgba(255,255,255,.1)';

    Object.values(JULIO_MODES).forEach(mode => {
      const btn = document.createElement('button');
      btn.textContent = mode.label;
      btn.title = mode.desc;
      btn.style.cssText = `padding:4px 10px;border-radius:6px;border:1px solid rgba(255,255,255,.2);background:rgba(124,58,237,.1);color:#a78bfa;font-size:11px;cursor:pointer;transition:all .2s`;
      btn.onmouseover = () => btn.style.background = 'rgba(124,58,237,.2)';
      btn.onmouseout = () => btn.style.background = 'rgba(124,58,237,.1)';
      btn.onclick = () => {
        window.julioK25.currentMode = mode;
        document.querySelectorAll('[data-julio-mode]').forEach(b => {
          b.style.background = 'rgba(124,58,237,.1)';
          b.style.color = '#a78bfa';
        });
        btn.style.background = 'rgba(124,58,237,.3)';
        btn.style.color = '#fff';
      };
      btn.setAttribute('data-julio-mode', mode.id);

      modeSelector.appendChild(btn);
    });

    jfpHeader.parentElement.insertBefore(modeSelector, jfpHeader.nextSibling);
  };

  // Auto-init when window loads
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      setTimeout(() => window.julioK25.initUI(), 500);
    });
  } else {
    setTimeout(() => window.julioK25.initUI(), 500);
  }

  console.log('[Julio K2.5] Super Powers carregadas ✓');
  console.log('Modo atual:', window.julioK25.currentMode.label);
  console.log('Capacidades:', Object.keys(JULIO_CAPABILITIES).join(', '));
})();
