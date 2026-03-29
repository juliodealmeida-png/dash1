/**
 * Kimi K2.5 via NVIDIA NIMs — serviço centralizado de IA
 * Compatível com OpenAI chat completions API (streaming + non-streaming)
 */

export type ChatRole = 'system' | 'user' | 'assistant';

export interface ChatMessage {
  role: ChatRole;
  content: string;
}

export interface KimiOptions {
  messages: ChatMessage[];
  stream?: boolean;
  thinking?: boolean;
  maxTokens?: number;
  temperature?: number;
  topP?: number;
  onChunk?: (text: string) => void;
  onDone?: (fullText: string) => void;
  timeoutMs?: number;
}

export interface KimiResult {
  text: string;
  thinkingText: string;
  tokensInput: number;
  tokensOutput: number;
  tokensTotal: number;
  model: string;
  ok: true;
}

export interface KimiError {
  ok: false;
  error: string;
  status: number;
}

const DEFAULT_URL = 'https://integrate.api.nvidia.com/v1/chat/completions';
const DEFAULT_MODEL = 'moonshotai/kimi-k2.5';
const DEFAULT_MAX_TOKENS = 16384;
const DEFAULT_TEMPERATURE = 1.0;
const DEFAULT_TOP_P = 1.0;
const DEFAULT_TIMEOUT_MS = 30_000;
const MAX_RETRIES = 3;
const RETRY_DELAYS = [500, 1500, 3000];

/** Separa blocos <think>...</think> do texto final da resposta. */
function extractThinking(raw: string): { text: string; thinkingText: string } {
  const thinkBlocks: string[] = [];
  const cleaned = raw.replace(/<think>([\s\S]*?)<\/think>/g, (_m, inner: string) => {
    thinkBlocks.push(inner.trim());
    return '';
  });
  return {
    text: cleaned.trim(),
    thinkingText: thinkBlocks.join('\n\n').trim(),
  };
}

/** Lê um ReadableStream SSE e chama onChunk para cada delta de texto. */
async function consumeStream(
  body: ReadableStream<Uint8Array>,
  onChunk: (text: string) => void
): Promise<string> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let full = '';
  let buf = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      const lines = buf.split('\n');
      buf = lines.pop() ?? '';
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith('data:')) continue;
        const data = trimmed.slice(5).trim();
        if (data === '[DONE]') continue;
        try {
          const parsed = JSON.parse(data) as {
            choices?: { delta?: { content?: string } }[];
          };
          const chunk = parsed.choices?.[0]?.delta?.content ?? '';
          if (chunk) {
            full += chunk;
            onChunk(chunk);
          }
        } catch {
          // linha SSE inválida — ignorar
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
  return full;
}

/**
 * Envia uma requisição ao Kimi K2.5 via NVIDIA NIMs.
 * Suporta streaming e modo de raciocínio (thinking).
 */
export async function askKimi(
  apiKey: string,
  opts: KimiOptions,
  apiUrl?: string
): Promise<KimiResult | KimiError> {
  const url = apiUrl || DEFAULT_URL;
  const model = DEFAULT_MODEL;
  const maxTokens = opts.maxTokens ?? DEFAULT_MAX_TOKENS;
  const temperature = opts.temperature ?? DEFAULT_TEMPERATURE;
  const topP = opts.topP ?? DEFAULT_TOP_P;
  const useStream = opts.stream !== false;
  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  const body: Record<string, unknown> = {
    model,
    messages: opts.messages,
    max_tokens: maxTokens,
    temperature,
    top_p: topP,
    stream: useStream,
  };

  // Ativa modo de raciocínio profundo do Kimi (thinking)
  if (opts.thinking !== false) {
    body['thinking'] = { type: 'enabled', budget_tokens: 4096 };
  }

  let lastError: KimiError = { ok: false, error: 'Desconhecido', status: 500 };

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          Accept: useStream ? 'text/event-stream' : 'application/json',
        },
        body: JSON.stringify(body),
        signal: ctrl.signal,
      });

      clearTimeout(timer);

      if (!res.ok) {
        const errText = await res.text().catch(() => '');
        const errJson = (() => {
          try { return JSON.parse(errText) as { error?: { message?: string } }; }
          catch { return {}; }
        })();
        const msg = errJson.error?.message || errText.slice(0, 300) || `HTTP ${res.status}`;
        lastError = { ok: false, error: msg, status: res.status };
        // Não re-tentar em erros 4xx (exceto 429 rate limit)
        if (res.status >= 400 && res.status < 500 && res.status !== 429) break;
        if (attempt < MAX_RETRIES - 1) {
          await new Promise((r) => setTimeout(r, RETRY_DELAYS[attempt]));
          continue;
        }
        break;
      }

      if (useStream && res.body) {
        const chunks: string[] = [];
        const rawFull = await consumeStream(res.body, (chunk) => {
          chunks.push(chunk);
          opts.onChunk?.(chunk);
        });
        const { text, thinkingText } = extractThinking(rawFull);
        opts.onDone?.(text);
        console.log(`[Kimi] stream concluído | ~${rawFull.length} chars`);
        return {
          ok: true,
          text,
          thinkingText,
          tokensInput: 0,
          tokensOutput: 0,
          tokensTotal: 0,
          model,
        };
      } else {
        const json = (await res.json()) as {
          choices?: { message?: { content?: string } }[];
          usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
        };
        const raw = json.choices?.[0]?.message?.content ?? '';
        const { text, thinkingText } = extractThinking(raw);
        const tokensInput = json.usage?.prompt_tokens ?? 0;
        const tokensOutput = json.usage?.completion_tokens ?? 0;
        const tokensTotal = json.usage?.total_tokens ?? tokensInput + tokensOutput;
        opts.onDone?.(text);
        console.log(`[Kimi] ok | tokens: ${tokensTotal} (in:${tokensInput} out:${tokensOutput})`);
        return { ok: true, text, thinkingText, tokensInput, tokensOutput, tokensTotal, model };
      }
    } catch (e: unknown) {
      clearTimeout(timer);
      const msg = (e instanceof Error) ? e.message : String(e);
      const isAbort = msg.includes('abort') || msg.includes('AbortError');
      lastError = {
        ok: false,
        error: isAbort ? `Timeout após ${timeoutMs}ms` : msg,
        status: isAbort ? 504 : 500,
      };
      if (attempt < MAX_RETRIES - 1) {
        await new Promise((r) => setTimeout(r, RETRY_DELAYS[attempt]));
        continue;
      }
    }
  }

  console.error(`[Kimi] falha após ${MAX_RETRIES} tentativas:`, lastError.error);
  return lastError;
}

/** Versão simplificada sem streaming — útil para jobs internos (ex: threatIntel). */
export async function askKimiSimple(
  apiKey: string,
  opts: { system?: string; user: string; maxTokens?: number; temperature?: number },
  apiUrl?: string
): Promise<{ text: string; ok: true } | { ok: false; error: string }> {
  const messages: ChatMessage[] = [];
  if (opts.system) messages.push({ role: 'system', content: opts.system });
  messages.push({ role: 'user', content: opts.user });
  const result = await askKimi(
    apiKey,
    {
      messages,
      stream: false,
      thinking: false,
      maxTokens: opts.maxTokens ?? 512,
      temperature: opts.temperature ?? 0,
    },
    apiUrl
  );
  if (!result.ok) return { ok: false, error: result.error };
  return { ok: true, text: result.text };
}
