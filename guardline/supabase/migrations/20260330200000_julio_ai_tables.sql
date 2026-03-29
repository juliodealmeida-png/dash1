-- ============================================================
-- Julio AI — Tabelas de histórico, mensagens e log de uso
-- Migration: 20260330200000_julio_ai_tables
-- ============================================================

-- Habilita UUID se ainda não estiver
create extension if not exists "pgcrypto";

-- ------------------------------------------------------------
-- julio_conversations — uma conversa por sessão de usuário
-- ------------------------------------------------------------
create table if not exists julio_conversations (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  title         text not null default 'Nova conversa',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

comment on table julio_conversations is 'Sessões de conversa do Júlio AI por usuário';

-- Índice para listagem por usuário ordenada por recência
create index if not exists idx_julio_conversations_user
  on julio_conversations (user_id, updated_at desc);

-- ------------------------------------------------------------
-- julio_messages — mensagens individuais de cada conversa
-- ------------------------------------------------------------
create table if not exists julio_messages (
  id                uuid primary key default gen_random_uuid(),
  conversation_id   uuid not null references julio_conversations(id) on delete cascade,
  role              text not null check (role in ('user', 'assistant', 'system')),
  content           text not null,
  thinking_content  text,            -- bloco <think>...</think> separado (debug)
  tokens_used       integer,
  document_id       uuid,            -- nullable: contexto de documento associado
  created_at        timestamptz not null default now()
);

comment on table julio_messages is 'Mensagens individuais nas conversas do Júlio AI';
comment on column julio_messages.thinking_content is 'Raciocínio interno do Kimi K2.5 (bloco <think>) — não exibido ao usuário';

create index if not exists idx_julio_messages_conv
  on julio_messages (conversation_id, created_at asc);

-- ------------------------------------------------------------
-- julio_usage_log — log de custo e tokens por chamada
-- ------------------------------------------------------------
create table if not exists julio_usage_log (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid references auth.users(id) on delete set null,
  conversation_id   uuid references julio_conversations(id) on delete set null,
  tokens_input      integer not null default 0,
  tokens_output     integer not null default 0,
  tokens_total      integer not null default 0,
  model             text not null default 'moonshotai/kimi-k2.5',
  provider          text not null default 'nvidia',
  cost_usd          numeric(10, 6) not null default 0,   -- gratuito no trial NVIDIA
  created_at        timestamptz not null default now()
);

comment on table julio_usage_log is 'Log de uso e custo por chamada ao Júlio AI (Kimi K2.5 / NVIDIA NIMs)';

create index if not exists idx_julio_usage_user
  on julio_usage_log (user_id, created_at desc);

-- ------------------------------------------------------------
-- Row-Level Security (RLS) — cada usuário vê apenas seus dados
-- ------------------------------------------------------------
alter table julio_conversations enable row level security;
alter table julio_messages       enable row level security;
alter table julio_usage_log      enable row level security;

-- Conversations: usuário só acessa as suas
create policy "julio_conversations_owner"
  on julio_conversations for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Messages: acesso via conversation do mesmo usuário
create policy "julio_messages_owner"
  on julio_messages for all
  using (
    exists (
      select 1 from julio_conversations c
      where c.id = julio_messages.conversation_id
        and c.user_id = auth.uid()
    )
  );

-- Usage log: usuário só vê seus próprios registros
create policy "julio_usage_log_owner"
  on julio_usage_log for select
  using (auth.uid() = user_id);

-- Service role pode inserir em usage_log (backend usa service key)
create policy "julio_usage_log_service_insert"
  on julio_usage_log for insert
  with check (true);

-- ------------------------------------------------------------
-- Trigger: atualiza updated_at nas conversas automaticamente
-- ------------------------------------------------------------
create or replace function set_julio_conversation_updated()
returns trigger language plpgsql as $$
begin
  update julio_conversations
     set updated_at = now()
   where id = new.conversation_id;
  return new;
end;
$$;

create trigger trg_julio_messages_update_conv
  after insert on julio_messages
  for each row execute procedure set_julio_conversation_updated();
