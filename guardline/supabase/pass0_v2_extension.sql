-- Extensão v2 (contas, inbox, documentos, assinaturas, sinais, alertas, canal).
-- Executar no SQL Editor após pass0_revenue_os_tables.sql.

create table if not exists accounts (
  id          uuid default gen_random_uuid() primary key,
  name        text not null,
  domain      text,
  industry    text,
  country     text,
  headcount   text,
  revenue     text,
  tier        text default 'volume',
  health      text default 'healthy',
  owner_name  text,
  hubspot_id  text,
  notes       text,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

create table if not exists contacts (
  id          uuid default gen_random_uuid() primary key,
  account_id  uuid references accounts(id) on delete set null,
  name        text not null,
  email       text,
  phone       text,
  title       text,
  linkedin    text,
  country     text,
  seniority   text,
  role        text default 'contact',
  hubspot_id  text,
  notes       text,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

create table if not exists meetings (
  id               uuid default gen_random_uuid() primary key,
  lead_id          uuid references leads(id) on delete set null,
  account_id       uuid references accounts(id) on delete set null,
  contact_name     text,
  contact_email    text,
  company_name     text,
  owner_name       text,
  title            text,
  meeting_type     text default 'discovery',
  status           text default 'scheduled',
  scheduled_at     timestamptz,
  duration_minutes int default 30,
  recording_url    text,
  summary          text,
  transcript       text,
  meddpicc_update  jsonb,
  next_steps       text,
  booking_link     text,
  created_at       timestamptz default now()
);

create table if not exists conversations (
  id           uuid default gen_random_uuid() primary key,
  lead_id      uuid references leads(id) on delete set null,
  channel      text default 'email',
  direction    text default 'inbound',
  from_name    text,
  from_email   text,
  subject      text,
  body         text,
  classification text,
  sentiment    text,
  ai_reply     text,
  status       text default 'unread',
  processed    boolean default false,
  created_at   timestamptz default now()
);

create table if not exists campaigns (
  id              uuid default gen_random_uuid() primary key,
  name            text not null,
  type            text default 'outbound',
  status          text default 'active',
  owner_name      text,
  target_count    int default 0,
  sent_count      int default 0,
  reply_count     int default 0,
  meeting_count   int default 0,
  deal_count      int default 0,
  budget          float,
  start_date      date,
  end_date        date,
  description     text,
  created_at      timestamptz default now()
);

create table if not exists partners (
  id          uuid default gen_random_uuid() primary key,
  name        text not null,
  type        text default 'technology',
  status      text default 'active',
  contact_name  text,
  contact_email text,
  territory   text,
  commission  float default 0,
  notes       text,
  created_at  timestamptz default now()
);

create table if not exists channel_deals (
  id           uuid default gen_random_uuid() primary key,
  partner_id   uuid references partners(id) on delete cascade,
  lead_id      uuid references leads(id) on delete set null,
  company_name text,
  value        float default 0,
  stage        text default 'prospecting',
  commission   float default 0,
  status       text default 'active',
  owner_name   text,
  notes        text,
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);

create table if not exists documents (
  id           uuid default gen_random_uuid() primary key,
  lead_id      uuid references leads(id) on delete set null,
  account_id   uuid references accounts(id) on delete set null,
  name         text not null,
  type         text default 'nda',
  status       text default 'draft',
  file_content text,
  file_base64  text,
  file_size    int,
  mime_type    text default 'application/pdf',
  hash         text,
  version      int default 1,
  uploaded_by  text,
  notes        text,
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);

create table if not exists signatures (
  id             uuid default gen_random_uuid() primary key,
  document_id    uuid references documents(id) on delete cascade,
  signer_name    text not null,
  signer_email   text not null,
  signer_title   text,
  position_page  int default 1,
  position_x     float default 0,
  position_y     float default 0,
  status         text default 'pending',
  token          text unique,
  signed_at      timestamptz,
  viewed_at      timestamptz,
  reminder_sent_at timestamptz,
  ip_address     text,
  hash_signed    text,
  created_at     timestamptz default now()
);

create table if not exists market_signals (
  id          uuid default gen_random_uuid() primary key,
  lead_id     uuid references leads(id) on delete set null,
  company_name text,
  signal_type text,
  title       text,
  description text,
  source      text,
  url         text,
  relevance   int default 50,
  detected_at timestamptz default now(),
  created_at  timestamptz default now()
);

create table if not exists alerts (
  id          uuid default gen_random_uuid() primary key,
  type        text,
  severity    text default 'info',
  title       text,
  message     text,
  lead_id     uuid references leads(id) on delete set null,
  read        boolean default false,
  action_url  text,
  created_at  timestamptz default now()
);

do $$ declare t text;
begin
  foreach t in array array[
    'accounts','contacts','meetings','conversations',
    'campaigns','partners','channel_deals','documents','signatures',
    'market_signals','alerts'
  ] loop
    execute format('alter table %I enable row level security', t);
    if not exists (
      select 1 from pg_policies where tablename=t and policyname='public_access'
    ) then
      execute format('create policy "public_access" on %I for all using (true)', t);
    end if;
  end loop;
end $$;
