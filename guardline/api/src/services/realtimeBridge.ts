import type { SupabaseClient, RealtimeChannel } from '@supabase/supabase-js';
import { emitDbChange } from './realtimeHub.js';

/**
 * Encaminha postgres_changes do Supabase para todos os clientes SSE do dashboard.
 * Requer Realtime activo nas tabelas (Supabase Dashboard → Database → Replication).
 */
export async function startSupabaseRealtimeBridge(
  supabase: SupabaseClient,
  tables: string[]
): Promise<RealtimeChannel> {
  const channel = supabase.channel('guardline-server-realtime', {
    config: { broadcast: { self: false } },
  });

  for (const table of tables) {
    const t = table.trim();
    if (!t) continue;
    channel.on(
      'postgres_changes',
      { event: '*', schema: 'public', table: t },
      (payload) => {
        emitDbChange(t, payload.eventType, payload.new ?? payload.old ?? payload);
      }
    );
  }

  await new Promise<void>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('Realtime subscribe timeout')), 15000);
    channel.subscribe((status, err) => {
      if (status === 'SUBSCRIBED') {
        clearTimeout(t);
        resolve();
      }
      if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        clearTimeout(t);
        reject(err ?? new Error(status));
      }
    });
  });

  console.log('✓ Realtime → SSE:', tables.filter(Boolean).join(', '));
  return channel;
}
