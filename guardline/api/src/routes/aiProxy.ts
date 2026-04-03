import { Router } from 'express';
import type { Env } from '../config/env.js';
import { askKimi, type ChatMessage } from '../lib/ai/kimi.js';

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';

/** Resposta compatível com o parser do dashboard (content[] tipo Anthropic) + formato OpenAI bruto. */
function toAnthropicShape(text: string) {
  return {
    content: [{ type: 'text', text }],
    choices: [{ message: { content: text } }],
  };
}

/** Resolve qual API key usar com base em AI_PROVIDER (padrão: nvidia). */
function resolveApiKey(env: Env): { key: string; provider: 'nvidia' | 'groq' } | null {
  const provider = env.AI_PROVIDER ?? 'nvidia';
  if (provider === 'groq') {
    if (!env.GROQ_API_KEY) return null;
    return { key: env.GROQ_API_KEY, provider: 'groq' };
  }
  if (!env.NVIDIA_API_KEY) return null;
  return { key: env.NVIDIA_API_KEY, provider: 'nvidia' };
}

/** Fallback para Groq (quando AI_PROVIDER=groq). */
async function callGroqFallback(
  env: Env,
  messages: ChatMessage[],
  maxTokens: number
): Promise<{ ok: true; text: string } | { ok: false; status: number; error: string }> {
  const key = env.GROQ_API_KEY!;
  const model = env.GROQ_MODEL || 'llama-3.3-70b-versatile';
  const res = await fetch(GROQ_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, messages, max_tokens: maxTokens, temperature: 0.2 }),
    signal: AbortSignal.timeout(30_000),
  });
  const json = (await res.json().catch(() => ({}))) as {
    choices?: { message?: { content?: string } }[];
    error?: { message?: string };
  };
  if (!res.ok) return { ok: false, status: res.status, error: json.error?.message ?? `HTTP ${res.status}` };
  return { ok: true, text: json.choices?.[0]?.message?.content ?? '' };
}

export function aiProxyRoutes(env: Env) {
  const r = Router();

  /**
   * POST /api/ai/chat
   * Body: { messages[], system?, stream?, thinking?, max_tokens? }
   * Quando stream=true: responde com text/event-stream (SSE)
   * Quando stream=false: responde com JSON { content[], choices[] }
   */
  r.post('/chat', async (req, res) => {
    const system = typeof req.body?.system === 'string' ? req.body.system : undefined;
    const rawMessages = req.body?.messages;
    if (!Array.isArray(rawMessages) || !rawMessages.length) {
      res.status(400).json({ error: 'messages[] obrigatório' });
      return;
    }
    const messages: ChatMessage[] = [];
    if (system) messages.push({ role: 'system', content: system });
    for (const m of rawMessages as ChatMessage[]) {
      messages.push({ role: m.role, content: m.content });
    }

    const maxTokens = Number(req.body?.max_tokens) || (env.AI_MAX_TOKENS ?? 4096);
    const temperature = Number(req.body?.temperature) || (env.AI_TEMPERATURE ?? 1.0);
    const thinking = req.body?.thinking !== false && env.AI_THINKING !== 'false' && env.AI_THINKING !== '0';
    const useStream = req.body?.stream === true;

    const resolved = resolveApiKey(env);
    if (!resolved) {
      res.status(503).json({ error: 'NVIDIA_API_KEY (ou GROQ_API_KEY para AI_PROVIDER=groq) não configurada' });
      return;
    }

    // Fallback Groq sem streaming
    if (resolved.provider === 'groq') {
      const out = await callGroqFallback(env, messages, maxTokens);
      if (!out.ok) { res.status(out.status).json({ error: out.error }); return; }
      res.json(toAnthropicShape(out.text));
      return;
    }

    // Kimi via NVIDIA — com streaming real
    if (useStream) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('X-Accel-Buffering', 'no');
      res.flushHeaders();

      await askKimi(resolved.key, {
        messages,
        stream: true,
        thinking,
        maxTokens,
        temperature,
        onChunk: (chunk) => {
          // Repassa cada chunk SSE ao cliente — filtra blocos <think>
          if (!chunk.includes('<think>') && !chunk.includes('</think>')) {
            res.write(`data: ${JSON.stringify({ choices: [{ delta: { content: chunk } }] })}\n\n`);
          }
        },
        onDone: () => {
          res.write('data: [DONE]\n\n');
          res.end();
        },
      }, env.NVIDIA_API_URL);
      return;
    }

    // Kimi sem streaming
    const out = await askKimi(resolved.key, { messages, stream: false, thinking, maxTokens, temperature }, env.NVIDIA_API_URL);
    if (!out.ok) { res.status(out.status).json({ error: out.error }); return; }
    res.json(toAnthropicShape(out.text));
  });

  /**
   * POST /api/ai/brief
   * Body: { prompt|user, system?, max_tokens? }
   * Sempre sem streaming — usado para briefs automáticos (diário, análise, etc.)
   */
  r.post('/brief', async (req, res) => {
    const system = typeof req.body?.system === 'string' ? req.body.system : 'You are a helpful assistant.';
    const user =
      typeof req.body?.prompt === 'string' ? req.body.prompt :
      typeof req.body?.user === 'string' ? req.body.user : '';
    if (!user) {
      res.status(400).json({ error: 'prompt ou user obrigatório' });
      return;
    }
    const maxTokens = Number(req.body?.max_tokens) || 2048;
    const resolved = resolveApiKey(env);
    if (!resolved) {
      res.status(503).json({ error: 'NVIDIA_API_KEY não configurada' });
      return;
    }

    if (resolved.provider === 'groq') {
      const out = await callGroqFallback(env, [{ role: 'system', content: system }, { role: 'user', content: user }], maxTokens);
      if (!out.ok) { res.status(out.status).json({ error: out.error }); return; }
      res.json(toAnthropicShape(out.text));
      return;
    }

    const out = await askKimi(resolved.key, {
      messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
      stream: false,
      thinking: false,
      maxTokens,
      temperature: env.AI_TEMPERATURE ?? 0.7,
    }, env.NVIDIA_API_URL);
    if (!out.ok) { res.status(out.status).json({ error: out.error }); return; }
    res.json(toAnthropicShape(out.text));
  });

  /**
   * POST /api/ai/julio
   * Rota dedicada ao assistente Júlio — streaming SSE com system prompt fixo.
   * Body: { messages[], context? }
   */
  r.post('/julio', async (req, res) => {
    const rawMessages = req.body?.messages;
    if (!Array.isArray(rawMessages) || !rawMessages.length) {
      res.status(400).json({ error: 'messages[] obrigatório' });
      return;
    }
    const context = typeof req.body?.context === 'string' ? req.body.context : '';
    const resolved = resolveApiKey(env);
    if (!resolved) {
      res.status(503).json({ error: 'NVIDIA_API_KEY não configurada no servidor' });
      return;
    }

    const julioSystem = `Você é o Júlio, assistente de IA da Guardline integrado ao dashboard de revenue intelligence.

Você pode ajudar com:
- Criar documentos e contratos a partir de descrições do usuário
- Explicar o status de documentos enviados para assinatura
- Resumir contratos longos enviados como PDF
- Automatizar tarefas repetitivas do dashboard
- Responder dúvidas sobre clientes, leads e deals
- Sugerir próximos passos baseado no contexto atual do pipeline

Regras:
- Seja direto e prático — execute ações quando possível
- Responda sempre em português do Brasil
- Quando criar um documento, gere o conteúdo completo e profissional
- Quando resumir um contrato, destaque: partes envolvidas, obrigações, prazos, valores e cláusulas de risco
- Nunca invente informações sobre clientes ou documentos reais
- Se não souber algo, diga claramente
- Use markdown para formatar respostas (negrito, listas, títulos)${context ? `\n\nContexto atual do dashboard:\n${context}` : ''}`;

    const messages: ChatMessage[] = [
      { role: 'system', content: julioSystem },
      ...(rawMessages as ChatMessage[]),
    ];

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    if (resolved.provider === 'groq') {
      const out = await callGroqFallback(env, messages, 2048);
      if (!out.ok) {
        res.write(`data: ${JSON.stringify({ error: out.error })}\n\n`);
        res.end();
        return;
      }
      res.write(`data: ${JSON.stringify({ choices: [{ delta: { content: out.text } }] })}\n\n`);
      res.write('data: [DONE]\n\n');
      res.end();
      return;
    }

    await askKimi(resolved.key, {
      messages,
      stream: true,
      thinking: true,
      maxTokens: env.AI_MAX_TOKENS ?? 8192,
      temperature: env.AI_TEMPERATURE ?? 1.0,
      onChunk: (chunk) => {
        if (!chunk.includes('<think>') && !chunk.includes('</think>')) {
          res.write(`data: ${JSON.stringify({ choices: [{ delta: { content: chunk } }] })}\n\n`);
        }
      },
      onDone: () => {
        res.write('data: [DONE]\n\n');
        res.end();
      },
    }, env.NVIDIA_API_URL);
  });

  return r;
}
