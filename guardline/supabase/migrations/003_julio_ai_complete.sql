-- Julio AI Complete — tabelas de suporte para conversas, uso, MEDDPICC por deal.
-- Execute no SQL Editor do Supabase (Railway usa Prisma migrate, não este arquivo).

-- ─── julio_usage_logs ──────────────────────────────────────────────────────
create table if not exists julio_usage_logs (
  id          text primary key default gen_random_uuid()::text,
  user_id     text not null,
  type        text not null, -- chat|brief|meddpicc|document_analyze|document_generate|loss_analysis
  tokens_in   int  default 0,
  tokens_out  int  default 0,
  latency_ms  int,
  model       text,
  metadata    jsonb,
  created_at  timestamptz default now()
);

-- ─── deal_meddpicc_scores ──────────────────────────────────────────────────
create table if not exists deal_meddpicc_scores (
  id                      text primary key default gen_random_uuid()::text,
  deal_id                 text not null unique,
  metrics_score           int  default 0,
  economic_buyer_score    int  default 0,
  decision_criteria_score int  default 0,
  decision_process_score  int  default 0,
  paper_process_score     int  default 0,
  identify_pain_score     int  default 0,
  champion_score          int  default 0,
  competition_score       int  default 0,
  total_score             int  default 0,
  analysis_json           jsonb,
  top3_gaps               jsonb,
  recommendation          text,
  analyzed_at             timestamptz default now(),
  updated_at              timestamptz default now()
);

-- ─── deal_meddpicc_history ────────────────────────────────────────────────
create table if not exists deal_meddpicc_history (
  id            text primary key default gen_random_uuid()::text,
  deal_id       text not null,
  total_score   int  not null,
  delta_score   int  default 0,
  analysis_json jsonb,
  triggered_by  text,
  created_at    timestamptz default now()
);

create index if not exists idx_dmh_deal_id on deal_meddpicc_history(deal_id, created_at desc);

-- ─── julio_conversations (se usar Supabase direto em vez de Railway) ───────
create table if not exists julio_conversations (
  id         text primary key default gen_random_uuid()::text,
  user_id    text not null,
  messages   text not null default '[]',
  title      text,
  context    text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_jconv_user on julio_conversations(user_id, updated_at desc);

-- ─── RLS ───────────────────────────────────────────────────────────────────
do $$ declare t text;
begin
  foreach t in array array[
    'julio_usage_logs','deal_meddpicc_scores',
    'deal_meddpicc_history','julio_conversations'
  ] loop
    execute format('alter table %I enable row level security', t);
    if not exists (
      select 1 from pg_policies where tablename = t and policyname = 'public_access'
    ) then
      execute format('create policy "public_access" on %I for all using (true)', t);
    end if;
  end loop;
end $$;
