import { Router } from 'express';
import type { Env } from '../config/env.js';

type ChatMsg = { role: 'user' | 'assistant' | 'system'; content: string };

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';

/** Resposta compatível com o parser do dashboard (content[] tipo Anthropic) + formato OpenAI bruto. */
function toAnthropicShape(text: string) {
  return {
    content: [{ type: 'text', text }],
    choices: [{ message: { content: text } }],
  };
}

async function callGroq(
  env: Env,
  opts: {
    system?: string;
    messages: ChatMsg[];
    max_tokens?: number;
    model?: string;
  }
) {
  const key = env.GROQ_API_KEY;
  if (!key) {
    return { ok: false as const, status: 503, error: 'GROQ_API_KEY não configurada no servidor' };
  }
  const model = opts.model || env.GROQ_MODEL || 'llama-3.3-70b-versatile';
  const msgs: ChatMsg[] = [];
  if (opts.system) msgs.push({ role: 'system', content: opts.system });
  for (const m of opts.messages) {
    if (m.role === 'system') msgs.push({ role: 'system', content: m.content });
    else msgs.push({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.content });
  }
  const res = await fetch(GROQ_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages: msgs,
      max_tokens: opts.max_tokens ?? 1024,
      temperature: 0.2,
    }),
  });
  const json = (await res.json().catch(() => ({}))) as {
    choices?: { message?: { content?: string } }[];
    error?: { message?: string };
  };
  if (!res.ok) {
    return {
      ok: false as const,
      status: res.status,
      error: json.error?.message || JSON.stringify(json).slice(0, 400),
    };
  }
  const text = json.choices?.[0]?.message?.content ?? '';
  return { ok: true as const, text };
}

export function aiProxyRoutes(env: Env) {
  const r = Router();

  r.post('/chat', async (req, res) => {
    const system = typeof req.body?.system === 'string' ? req.body.system : undefined;
    const messages = req.body?.messages;
    if (!Array.isArray(messages) || !messages.length) {
      res.status(400).json({ error: 'messages[] obrigatório' });
      return;
    }
    if (req.body?.stream) {
      res.status(502).json({ error: 'Stream não suportado; use stream:false' });
      return;
    }
    const out = await callGroq(env, {
      system,
      messages: messages as ChatMsg[],
      max_tokens: Number(req.body?.max_tokens) || 1024,
      model: typeof req.body?.model === 'string' ? req.body.model : undefined,
    });
    if (!out.ok) {
      res.status(out.status).json({ error: out.error });
      return;
    }
    res.json(toAnthropicShape(out.text));
  });

  r.post('/brief', async (req, res) => {
    const system =
      typeof req.body?.system === 'string' ? req.body.system : 'You are a helpful assistant.';
    const user =
      typeof req.body?.prompt === 'string'
        ? req.body.prompt
        : typeof req.body?.user === 'string'
          ? req.body.user
          : '';
    if (!user) {
      res.status(400).json({ error: 'prompt ou user obrigatório' });
      return;
    }
    const out = await callGroq(env, {
      system,
      messages: [{ role: 'user', content: user }],
      max_tokens: Number(req.body?.max_tokens) || 1200,
    });
    if (!out.ok) {
      res.status(out.status).json({ error: out.error });
      return;
    }
    res.json(toAnthropicShape(out.text));
  });

  return r;
}
