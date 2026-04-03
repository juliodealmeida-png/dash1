import type { Response } from 'express';
import { randomUUID } from 'node:crypto';

export type DashboardEvent = {
  source: 'supabase_realtime' | 'n8n_webhook' | 'system';
  topic: string;
  at: string;
  payload: unknown;
};

const clients = new Map<string, Response>();

export function sseAddClient(res: Response): string {
  const id = randomUUID();
  clients.set(id, res);
  return id;
}

export function sseRemoveClient(id: string): void {
  clients.delete(id);
}

export function sseBroadcast(event: DashboardEvent): void {
  const line = `data: ${JSON.stringify(event)}\n\n`;
  for (const [id, res] of clients) {
    try {
      res.write(line);
    } catch {
      clients.delete(id);
    }
  }
}

export function sseClientCount(): number {
  return clients.size;
}
