-- Fraud Map: geo em leads/signals + threat_intel

ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS lat DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS lng DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS city TEXT;

ALTER TABLE signals
  ADD COLUMN IF NOT EXISTS lead_id TEXT,
  ADD COLUMN IF NOT EXISTS lat DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS lng DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS city TEXT,
  ADD COLUMN IF NOT EXISTS country TEXT,
  ADD COLUMN IF NOT EXISTS fraud_type TEXT,
  ADD COLUMN IF NOT EXISTS amount NUMERIC,
  ADD COLUMN IF NOT EXISTS map_layer TEXT DEFAULT 'signal';

CREATE INDEX IF NOT EXISTS idx_leads_geo ON leads (lat, lng) WHERE lat IS NOT NULL AND lng IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_signals_geo ON signals (lat, lng, created_at) WHERE lat IS NOT NULL AND lng IS NOT NULL;

CREATE TABLE IF NOT EXISTS threat_intel (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dedupe_key TEXT UNIQUE,
  title TEXT NOT NULL,
  description TEXT,
  source TEXT,
  country TEXT,
  city TEXT,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  fraud_type TEXT,
  amount NUMERIC,
  severity TEXT DEFAULT 'medium',
  published_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_threat_intel_time ON threat_intel (published_at DESC);
