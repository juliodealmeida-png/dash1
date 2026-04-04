-- ============================================================
-- MIGRATION: Multi-user workflows (WF08-WF13)
-- Creates tables for team management, routing, meetings, AI assistant
-- ============================================================

-- 1. Team members
CREATE TABLE IF NOT EXISTS team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  whatsapp TEXT,
  linkedin_url TEXT,
  calendar_url TEXT,
  role TEXT NOT NULL DEFAULT 'sdr' CHECK (role IN ('founder','sdr','ae','csm','admin')),
  specialties TEXT[] DEFAULT '{}',
  territories TEXT[] DEFAULT '{}',
  hubspot_owner_id TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Team member config (tokens, preferences)
CREATE TABLE IF NOT EXISTS team_member_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES team_members(id) ON DELETE CASCADE,
  whatsapp_number TEXT,
  calendar_link TEXT,
  slack_user_id TEXT,
  gmail_token JSONB,
  linkedin_token JSONB,
  notification_preferences JSONB DEFAULT '{"email":true,"slack":true,"whatsapp":false}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(member_id)
);

-- 3. Routing rules
CREATE TABLE IF NOT EXISTS routing_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  priority INT NOT NULL DEFAULT 10,
  conditions JSONB NOT NULL DEFAULT '{}',
  assign_to UUID[] NOT NULL DEFAULT '{}',
  round_robin BOOLEAN NOT NULL DEFAULT false,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Routing history
CREATE TABLE IF NOT EXISTS routing_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id TEXT,
  assigned_to UUID REFERENCES team_members(id),
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reason TEXT
);

-- 5. Meetings (from Fireflies + manual)
CREATE TABLE IF NOT EXISTS meetings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id TEXT,
  company_name TEXT,
  contact_name TEXT,
  contact_email TEXT,
  assigned_to UUID REFERENCES team_members(id),
  meeting_date TIMESTAMPTZ,
  duration_minutes INT,
  platform TEXT DEFAULT 'google_meet',
  fireflies_id TEXT,
  transcript_summary TEXT,
  transcript_full TEXT,
  next_steps JSONB DEFAULT '[]',
  deal_signal TEXT CHECK (deal_signal IN ('strong_buy','interested','neutral','risk','lost')),
  julio_analysis TEXT,
  status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled','done','cancelled','no_show')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. Assistant interactions (AI-generated messages)
CREATE TABLE IF NOT EXISTS assistant_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id TEXT,
  company_name TEXT,
  channel TEXT CHECK (channel IN ('email','whatsapp','linkedin','sms','call')),
  direction TEXT CHECK (direction IN ('inbound','outbound')),
  message_preview TEXT,
  sent_as TEXT,
  sent_by_member UUID REFERENCES team_members(id),
  status TEXT DEFAULT 'sent',
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7. Deal health alerts
CREATE TABLE IF NOT EXISTS deal_health_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id TEXT,
  company_name TEXT,
  alert_type TEXT CHECK (alert_type IN ('close_now','at_risk','ghost','nurture','disqualify','healthy')),
  urgency TEXT CHECK (urgency IN ('critical','high','medium','low')),
  reason TEXT,
  recommendation TEXT,
  resolved BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_routing_history_lead ON routing_history(lead_id);
CREATE INDEX IF NOT EXISTS idx_routing_history_assigned ON routing_history(assigned_to);
CREATE INDEX IF NOT EXISTS idx_meetings_lead ON meetings(lead_id);
CREATE INDEX IF NOT EXISTS idx_meetings_assigned ON meetings(assigned_to);
CREATE INDEX IF NOT EXISTS idx_interactions_lead ON assistant_interactions(lead_id);
CREATE INDEX IF NOT EXISTS idx_interactions_member ON assistant_interactions(sent_by_member);
CREATE INDEX IF NOT EXISTS idx_alerts_lead ON deal_health_alerts(lead_id);
CREATE INDEX IF NOT EXISTS idx_alerts_type ON deal_health_alerts(alert_type);

-- RLS policies (allow service_role full access)
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_member_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE routing_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE routing_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE assistant_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE deal_health_alerts ENABLE ROW LEVEL SECURITY;

-- Service role policies
CREATE POLICY "service_role_all" ON team_members FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON team_member_config FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON routing_rules FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON routing_history FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON meetings FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON assistant_interactions FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON deal_health_alerts FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Authenticated user read access
CREATE POLICY "auth_read" ON team_members FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_read" ON routing_rules FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_read" ON meetings FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_read" ON assistant_interactions FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_read" ON deal_health_alerts FOR SELECT TO authenticated USING (true);
