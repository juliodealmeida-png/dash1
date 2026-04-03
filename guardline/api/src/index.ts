import { createServer } from 'node:http';
import { createApp } from './app.js';
import { startSupabaseRealtimeBridge } from './services/realtimeBridge.js';
import { geocodeLeads } from './services/geocoder.js';
import { ingestThreatIntel } from './services/threatIntel.js';

const { app, env, supabase } = createApp();

if (env.ENABLE_FRAUD_MAP_JOBS === '1') {
  geocodeLeads(supabase)
    .then((n) => console.log(`[FraudMap] geocodeLeads na subida: ${n} leads`))
    .catch((e) => console.warn('[FraudMap] geocodeLeads:', e?.message ?? e));
  ingestThreatIntel(env, supabase).catch((e) => console.warn('[FraudMap] ingestThreatIntel:', e?.message ?? e));
  setInterval(() => ingestThreatIntel(env, supabase).catch(console.error), 6 * 60 * 60 * 1000);
  setInterval(() => geocodeLeads(supabase).catch(console.error), 30 * 60 * 1000);
}
const server = createServer(app);

const tables = env.SUPABASE_REALTIME_TABLES.split(',')
  .map((t) => t.trim())
  .filter(Boolean);

startSupabaseRealtimeBridge(supabase, tables).catch((err) => {
  console.error('⚠️  Realtime não ligado (verifique Replication no Supabase):', err?.message ?? err);
});

server.listen(env.PORT, () => {
  console.log('');
  console.log('🚀 Guardline API (TypeScript)');
  console.log(`   http://localhost:${env.PORT}`);
  console.log(`   SSE        GET /api/events/stream | /api/realtime/stream`);
  console.log(`   REST       /api/dashboard | /api/leads | /api/deals | /api/signals | …`);
  console.log(`   Webhooks   POST /api/webhooks/wf06-result (WF06 sink)`);
  console.log(`              POST /api/webhooks/n8n/wf06 | wf07 | wf08 | execution-log`);
  console.log(`   Sync out   POST /api/sync/n8n/wf06 | wf07 | wf08`);
  console.log(`   HubSpot    GET  /api/hubspot-sync/deals | companies | contacts | pipelines | owners`);
  console.log(`   AI proxy   POST /api/ai/chat | /api/ai/brief | /api/ai/julio (Kimi K2.5 / NVIDIA_API_KEY)`);
  console.log(`   Fraud map  GET  /api/fraud-map/layers | POST /geocode-leads | POST /ingest-threat-intel`);
  console.log('');
});
