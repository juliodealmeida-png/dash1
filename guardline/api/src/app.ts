import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { loadEnv } from './config/env.js';
import { getSupabaseAdmin } from './lib/supabaseAdmin.js';
import { sseClientCount } from './lib/sseHub.js';
import { sseRoutes } from './routes/sse.js';
import { webhooksN8nRoutes } from './routes/webhooksN8n.js';
import { webhooksDashboardRoutes } from './routes/webhooksDashboard.js';
import { webhooksHubspotRoutes } from './routes/webhooksHubspot.js';
import { syncOutRoutes } from './routes/syncOut.js';
import { dashboardRoutes } from './routes/dashboard.js';
import { leadsRoutes } from './routes/leads.js';
import { dealsRoutes } from './routes/deals.js';
import { signalsRoutes } from './routes/signals.js';
import { sellersRoutes } from './routes/sellers.js';
import { executionsRoutes } from './routes/executions.js';
import { analyticsRoutes } from './routes/analytics.js';
import { meetingsRoutes } from './routes/meetings.js';
import { batchRoutes } from './routes/batch.js';
import { hubspotSyncRoutes } from './routes/hubspotSync.js';
import { mountLegacyExpressCompat } from './routes/legacyExpressCompat.js';
import { aiProxyRoutes } from './routes/aiProxy.js';
import { fraudMapRoutes } from './routes/fraudMap.js';
import { authRoutes } from './routes/auth.js';
import { emailRoutes } from './routes/email.js';
import { hubspotBidiSyncRoutes } from './routes/hubspotBidiSync.js';
import { onboardingRoutes } from './routes/onboarding.js';

export function createApp() {
  const env = loadEnv();
  const supabase = getSupabaseAdmin(env);

  const origins = (
    env.CORS_ORIGINS ??
    'http://localhost:3001,http://localhost:3002,http://localhost:4000,http://localhost:3000,http://localhost:5173,http://127.0.0.1:3001,http://127.0.0.1:4000'
  )
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  const isProd = env.NODE_ENV === 'production';
  const corsOrigin = (origin: string | undefined, cb: (err: Error | null, allow?: boolean) => void) => {
    if (!origin) {
      cb(null, true);
      return;
    }
    if (!isProd) {
      try {
        const host = new URL(origin).hostname;
        if (host === 'localhost' || host === '127.0.0.1') {
          cb(null, true);
          return;
        }
      } catch {
        cb(null, false);
        return;
      }
    }
    cb(null, origins.includes(origin));
  };

  const app = express();
  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(compression());
  app.use(
    cors({
      origin: corsOrigin,
      credentials: true,
    })
  );
  app.use(
    express.json({
      limit: '10mb',
      verify: (req, _res, buf) => {
        (req as unknown as { rawBody?: string }).rawBody = buf.toString('utf8');
      },
    })
  );

  mountLegacyExpressCompat(app, env, supabase);
  app.use('/api/ai', aiProxyRoutes(env));
  app.use('/api/fraud-map', fraudMapRoutes(env, supabase));

  app.get('/health', (_req, res) => {
    res.json({
      ok: true,
      service: 'guardline-api',
      sseClients: sseClientCount(),
      node: process.version,
    });
  });

  app.use('/api/events', sseRoutes(env));
  app.use('/api/realtime', sseRoutes(env));

  app.use('/api/auth', authRoutes(env, supabase));
  app.use('/api/onboarding', onboardingRoutes(env, supabase));
  app.use('/api/email', emailRoutes(env, supabase));
  app.use('/api/dashboard', dashboardRoutes(env, supabase));
  app.use('/api/leads', leadsRoutes(env, supabase));
  app.use('/api/deals', dealsRoutes(env, supabase));
  app.use('/api/signals', signalsRoutes(env, supabase));
  app.use('/api/sellers', sellersRoutes(env, supabase));
  app.use('/api/executions', executionsRoutes(env, supabase));
  app.use('/api/analytics', analyticsRoutes(env, supabase));
  app.use('/api/meetings', meetingsRoutes(env, supabase));
  app.use('/api/batch', batchRoutes(env));
  app.use('/api/hubspot-sync', hubspotSyncRoutes(env));
  app.use('/api/hubspot-bidi', hubspotBidiSyncRoutes(env, supabase));

  app.use('/api/webhooks/n8n', webhooksN8nRoutes(env, supabase));
  app.use('/api/webhooks/hubspot', webhooksHubspotRoutes(env, supabase));
  app.use('/api/webhooks', webhooksDashboardRoutes(env, supabase));
  app.use('/api/sync/n8n', syncOutRoutes(env));

  app.use('/webhooks/hubspot', webhooksHubspotRoutes(env, supabase));

  app.use((_req, res) => {
    res.status(404).json({ error: 'Not found' });
  });

  return { app, env, supabase };
}
