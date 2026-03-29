import { config } from 'dotenv';
import { z } from 'zod';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, '../../.env') });

const schema = z
  .object({
    PORT: z.coerce.number().default(3002),
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    CORS_ORIGINS: z.string().optional(),
    SUPABASE_URL: z.string().url(),
    /** Preferência: SUPABASE_SERVICE_KEY (alias comum) ou SUPABASE_SERVICE_ROLE_KEY */
    SUPABASE_SERVICE_KEY: z.string().min(32).optional(),
    SUPABASE_SERVICE_ROLE_KEY: z.string().min(32).optional(),
    DASHBOARD_WEBHOOK_SECRET: z.string().optional(),
    HUBSPOT_PAT: z.string().optional(),
    N8N_WEBHOOK_SECRET: z.string().optional(),
    N8N_BASE_URL: z.string().url().optional(),
    N8N_API_KEY: z.string().optional(),
    N8N_PATH_WF06: z.string().optional(),
    N8N_PATH_WF07_BATCH: z.string().optional(),
    N8N_PATH_WF08: z.string().optional(),
    SUPABASE_REALTIME_TABLES: z
      .string()
      .default('leads,deals,wf_executions,signals,meetings,campaign_analytics,seller_profiles'),
    /** Groq (Llama) — proxy em POST /api/ai/chat */
    GROQ_API_KEY: z.string().optional(),
    GROQ_MODEL: z.string().optional(),
    /** Jobs em background (threat intel + geocode) */
    ENABLE_FRAUD_MAP_JOBS: z.enum(['0', '1']).optional(),
  })
  .superRefine((val, ctx) => {
    if (!val.SUPABASE_SERVICE_KEY && !val.SUPABASE_SERVICE_ROLE_KEY) {
      ctx.addIssue({
        code: 'custom',
        message: 'Defina SUPABASE_SERVICE_KEY ou SUPABASE_SERVICE_ROLE_KEY',
        path: ['SUPABASE_SERVICE_KEY'],
      });
    }
  });

export type Env = z.infer<typeof schema>;

export function supabaseServiceKey(env: Env): string {
  return env.SUPABASE_SERVICE_KEY || env.SUPABASE_SERVICE_ROLE_KEY || '';
}

let cached: Env | null = null;

export function loadEnv(): Env {
  if (cached) return cached;
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    const msg = parsed.error.flatten().fieldErrors;
    console.error('❌ Variáveis de ambiente inválidas:', msg);
    throw new Error('Configuração .env inválida — veja guardline/api/.env.example');
  }
  cached = parsed.data;
  return cached;
}
