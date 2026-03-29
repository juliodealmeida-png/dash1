import { EventEmitter } from 'node:events';
import { sseBroadcast } from '../lib/sseHub.js';

export const realtimeBus = new EventEmitter();
realtimeBus.setMaxListeners(200);

export type DbChangePayload = {
  table: string;
  event: string;
  record: unknown;
};

export function emitDbChange(table: string, eventType: string, record: unknown): void {
  const payload: DbChangePayload = { table, event: eventType, record };
  realtimeBus.emit('db-change', payload);
  sseBroadcast({
    source: 'supabase_realtime',
    topic: `${table}:${eventType}`,
    at: new Date().toISOString(),
    payload,
  });
}
