-- Guardline API — tabelas alinhadas com o backend TypeScript (:3001)
-- Executar no SQL Editor do Supabase ou via CLI migrate.

-- ── leads ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS leads (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id text UNIQUE,
  workflow_version text,
  provider_used text,
  route text,
  lead_score integer DEFAULT 0,
  lead_temperature text,
  account_tier text,
  market_priority text,
  contact_name text,
  contact_email text,
  contact_title text,
  contact_linkedin text,
  company_name text,
  company_domain text,
  company_industry text,
  company_country text,
  company_headcount integer,
  owner_name text,
  owner_email text,
  hubspot_owner_id text,
  language text,
  primary_solution text,
  confidence numeric,
  why_now text,
  meddpicc jsonb DEFAULT '{}'::jsonb,
  meddpicc_completion integer DEFAULT 0,
  pipeline_stage text DEFAULT 'new_lead',
  meeting_status text DEFAULT 'none',
  reply_status text DEFAULT 'no_reply',
  next_action text,
  signals jsonb DEFAULT '[]'::jsonb,
  research_pack jsonb DEFAULT '{}'::jsonb,
  execution_blueprint jsonb DEFAULT '{}'::jsonb,
  score jsonb DEFAULT '{}'::jsonb,
  processed_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ── deals ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS deals (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  hubspot_deal_id text UNIQUE,
  deal_name text,
  deal_stage text,
  deal_amount numeric DEFAULT 0,
  deal_probability integer DEFAULT 0,
  deal_close_date text,
  pipeline_id text DEFAULT '705209428',
  hubspot_owner_id text,
  source text DEFAULT 'hubspot_sync',
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ── wf_executions ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS wf_executions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  workflow_id text,
  workflow_name text,
  status text,
  trigger_type text,
  result_summary jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- ── campaign_analytics ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS campaign_analytics (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  period text,
  period_start date,
  period_end date,
  campaign_name text,
  leads_generated integer DEFAULT 0,
  leads_qualified integer DEFAULT 0,
  conversion_rate numeric DEFAULT 0,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  UNIQUE (period, period_start, campaign_name)
);

-- ── seller_profiles ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS seller_profiles (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  hubspot_owner_id text UNIQUE,
  display_name text,
  email_address text,
  role text,
  territories jsonb DEFAULT '[]'::jsonb,
  languages jsonb DEFAULT '[]'::jsonb,
  solutions jsonb DEFAULT '[]'::jsonb,
  account_tiers jsonb DEFAULT '[]'::jsonb,
  max_weekly_capacity integer DEFAULT 8,
  current_weekly_load integer DEFAULT 0,
  is_active boolean DEFAULT true,
  calendar_booking_url text,
  ai_tone text DEFAULT 'professional',
  ai_style text DEFAULT 'consultative',
  ai_custom_rules text,
  ai_signature text,
  ai_language text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

INSERT INTO seller_profiles (hubspot_owner_id, display_name, email_address, role, territories, languages, solutions, account_tiers, max_weekly_capacity, calendar_booking_url)
VALUES
  ('78581656', 'Julio De Almeida', 'julio.dealmeida@guardline.io', 'head_of_sales', '["brazil","latam"]', '["pt-BR","es","en"]', '["AML","Fraud Prevention","Onboarding/KYC","Decision Engine","Orchestration"]', '["strategic","mid_market"]', 10, 'https://calendar.app.google/8cyUFVEemXR7GY3i9'),
  ('78930080', 'Glauciele Silva', 'glauciele.silva@guardline.io', 'bdm', '["brazil"]', '["pt-BR","en"]', '["AML","Fraud Prevention","Onboarding/KYC"]', '["strategic","mid_market"]', 8, NULL),
  ('78954425', 'Rafa Nova', 'rafael.nova@guardline.io', 'bdm', '["brazil"]', '["pt-BR","en"]', '["Fraud Prevention","Onboarding/KYC","Decision Engine"]', '["mid_market","volume"]', 8, NULL),
  ('80012051', 'Adriano Fernandes', 'adriano.fernandes@guardline.io', 'bdm', '["brazil","latam"]', '["pt-BR","es","en"]', '["AML","Fraud Prevention","Orchestration"]', '["strategic","mid_market"]', 8, NULL),
  ('88558410', 'Ezequiel Dominguez', 'ezequiel.dominguez@guardline.io', 'bdm', '["latam","global"]', '["es","en"]', '["AML","Fraud Prevention","Onboarding/KYC"]', '["strategic","mid_market"]', 8, NULL),
  ('88559526', 'Agustin Pesce', 'agustin.pesce@guardline.io', 'bdm', '["latam","global"]', '["es","en"]', '["Fraud Prevention","Onboarding/KYC","Decision Engine"]', '["mid_market","volume"]', 8, NULL),
  ('88587177', 'Arthur Ferreira', 'arthur.ferreira@guardline.io', 'bdm', '["brazil"]', '["pt-BR","en"]', '["Onboarding/KYC","Decision Engine","Orchestration"]', '["mid_market","volume"]', 8, NULL),
  ('88631599', 'Danilo Pereira', 'danilo.pereira@guardline.io', 'bdm', '["brazil","latam"]', '["pt-BR","es"]', '["AML","Fraud Prevention"]', '["mid_market","volume"]', 8, NULL),
  ('89441187', 'Dario Schilman', 'dario.schilman@guardline.io', 'head_of_sales', '["latam","global"]', '["es","en"]', '["AML","Fraud Prevention","Onboarding/KYC","Decision Engine","Orchestration"]', '["strategic","mid_market","volume"]', 10, NULL)
ON CONFLICT (hubspot_owner_id) DO NOTHING;

-- ── signals (feed) ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS signals (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  type text,
  severity text DEFAULT 'info',
  title text,
  description text,
  deal_id text,
  company_name text,
  owner_name text,
  source text,
  is_read boolean DEFAULT false,
  is_ignored boolean DEFAULT false,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- ── meetings ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS meetings (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id text,
  company_name text,
  contact_name text,
  contact_email text,
  owner_name text,
  hubspot_owner_id text,
  meeting_status text DEFAULT 'none',
  meeting_datetime timestamptz,
  meeting_type text,
  booking_link text,
  meddpicc_completion integer DEFAULT 0,
  notes text,
  transcript text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Realtime: no Dashboard Supabase → Database → Replication, activar estas tabelas.
