import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Env } from '../config/env.js';
import { supabaseServiceKey } from '../config/env.js';

let client: SupabaseClient | null = null;

export function getSupabaseAdmin(env: Env): SupabaseClient {
  if (client) return client;
  client = createClient(env.SUPABASE_URL, supabaseServiceKey(env), {
    auth: { persistSession: false, autoRefreshToken: false },
    realtime: { params: { eventsPerSecond: 20 } },
  });
  return client;
}
