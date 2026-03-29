# Guardline API (TypeScript)

Serviço Node 20+ na porta **3002** em desenvolvimento local, com **Supabase** (service role), **Server-Sent Events** para push ao dashboard, **webhooks n8n** (WF06, WF07, WF08) e disparo de saída para o n8n Cloud.

## Arranque

```bash
cd guardline/api
cp .env.example .env
# Preencher SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY
npm install
npm run dev
```

- Saúde: `GET http://localhost:3002/health`
- SSE: `GET http://localhost:3002/api/events/stream` (EventSource no browser)
- Teste broadcast: `POST http://localhost:3002/api/events/ping`

## Dashboard em :3001 a usar esta API

O `guardline.html` por defeito usa `origin + '/api'`. Em desenvolvimento local, o backend principal serve o UI em **3001** e faz proxy para esta API em **3002**.

1. Abrir o dashboard principal em `http://localhost:3001`
2. Configurar o backend com `DATA_API_BASE_URL=http://localhost:3002`

CORS já inclui `http://localhost:3001` no `.env.example`.

## n8n — URLs (exemplo)

Configurar no n8n **HTTP Request** ou **Webhook** a apontar para a tua API exposta (em dev use túnel tipo ngrok se o n8n for cloud):

- `POST https://<teu-host>/api/webhooks/n8n/wf06` — lead único (JSON com `lead` ou campos flat `company_name`, `contact_email`, …)
- `POST https://<teu-host>/api/webhooks/n8n/wf07` — lote: `rows` / `leads` / `data` (array)
- `POST https://<teu-host>/api/webhooks/n8n/wf08` — sinal: `title`, `message`, `severity`, `type`, `metadata`
- `POST .../execution-log` — registo em `wf_executions`

Segurança opcional: definir `N8N_WEBHOOK_SECRET` e enviar header `X-Guardline-Secret: <valor>` ou `Authorization: Bearer <valor>`.

## Saída dashboard → n8n

Com `N8N_BASE_URL` e `N8N_PATH_WF06` (etc.) preenchidos:

- `POST http://localhost:3001/api/sync/n8n/wf06` — body JSON reencaminhado ao webhook WF06 via backend principal

## Supabase Realtime

A ponte subscreve `postgres_changes` nas tabelas em `SUPABASE_REALTIME_TABLES` (por defeito `leads,wf_executions,signals,fraud_events`). No projeto Supabase, activar **replicação** para essas tabelas (Database → Replication), caso contrário o servidor arranca mas regista aviso na consola.

## Build produção

```bash
npm run build
npm start
```

O pacote **não** substitui ainda o backend Express+Prisma em `guardline/backend/` (auth JWT, CRUD completo). Em desenvolvimento local, use o backend principal em **:3001** e esta API em **:3002** para integrações n8n + SSE + Supabase.
