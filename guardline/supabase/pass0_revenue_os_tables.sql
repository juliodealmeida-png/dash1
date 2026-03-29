-- Guardline Revenue OS — tabelas usadas pelo dashboard (PostgREST / Supabase).
-- Execute no SQL Editor do Supabase antes de usar o frontend com dados reais.

create table if not exists leads (
  id                  uuid default gen_random_uuid() primary key,
  lead_id             text,
  workflow_version    text,
  provider_used       text,
  route               text,
  lead_score          int,
  lead_temperature    text,
  account_tier        text,
  market_priority     text,
  score               jsonb,
  contact_name        text,
  contact_email       text,
  contact_title       text,
  contact_linkedin    text,
  company_name        text,
  company_domain      text,
  company_industry    text,
  company_country     text,
  company_headcount   text,
  owner_name          text,
  owner_email         text,
  hubspot_owner_id    text,
  language            text,
  primary_solution    text,
  confidence          float,
  why_now             text,
  meddpicc            jsonb,
  meddpicc_completion int,
  pipeline_stage      text,
  meeting_status      text,
  reply_status        text,
  next_action         text,
  signals             jsonb,
  research_pack       jsonb,
  execution_blueprint jsonb,
  processed_at        timestamptz default now()
);

create table if not exists wf_executions (
  id             uuid default gen_random_uuid() primary key,
  workflow_id    text,
  workflow_name  text,
  status         text,
  trigger_type   text,
  result_summary jsonb,
  created_at     timestamptz default now()
);

create table if not exists campaign_analytics (
  id              uuid default gen_random_uuid() primary key,
  period          text,
  period_start    date,
  period_end      date,
  campaign_name   text,
  leads_generated int,
  leads_qualified int,
  conversion_rate int,
  metadata        jsonb,
  created_at      timestamptz default now(),
  unique(campaign_name, period_start)
);

create table if not exists fraud_events (
  id          uuid default gen_random_uuid() primary key,
  lat         float,
  lng         float,
  city        text,
  country     text,
  type        text,
  amount      float,
  currency    text default 'USD',
  severity    text,
  status      text default 'detected',
  risk_score  int,
  detected_at timestamptz default now(),
  created_at  timestamptz default now()
);

alter table leads              enable row level security;
alter table wf_executions      enable row level security;
alter table campaign_analytics enable row level security;
alter table fraud_events       enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where tablename='leads' and policyname='public_access')
  then create policy "public_access" on leads for all using (true); end if;
  if not exists (select 1 from pg_policies where tablename='wf_executions' and policyname='public_access')
  then create policy "public_access" on wf_executions for all using (true); end if;
  if not exists (select 1 from pg_policies where tablename='campaign_analytics' and policyname='public_access')
  then create policy "public_access" on campaign_analytics for all using (true); end if;
  if not exists (select 1 from pg_policies where tablename='fraud_events' and policyname='public_access')
  then create policy "public_access" on fraud_events for all using (true); end if;
end $$;
