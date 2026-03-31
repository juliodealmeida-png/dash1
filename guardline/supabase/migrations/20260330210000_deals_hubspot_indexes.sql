-- Indexes para performance nas queries do HubSpot pipeline
-- Executar no SQL Editor do Supabase ou via CLI migrate.

-- Index primário: lookup por hubspot_deal_id (upsert do webhook)
CREATE INDEX IF NOT EXISTS idx_deals_hubspot_deal_id ON deals (hubspot_deal_id);

-- Index para filtro por stage (kanban/funnel)
CREATE INDEX IF NOT EXISTS idx_deals_deal_stage ON deals (deal_stage);

-- Index para sort por amount DESC (renderHubspotPipeline usa ORDER BY deal_amount DESC)
CREATE INDEX IF NOT EXISTS idx_deals_deal_amount ON deals (deal_amount DESC);

-- Index para filtro por owner
CREATE INDEX IF NOT EXISTS idx_deals_hubspot_owner_id ON deals (hubspot_owner_id);

-- Index para sort por updated_at (webhook updates)
CREATE INDEX IF NOT EXISTS idx_deals_updated_at ON deals (updated_at DESC);

-- RLS: habilitar mas permitir leitura pública para o dashboard (service role bypassa)
ALTER TABLE deals ENABLE ROW LEVEL SECURITY;

-- Policy: service role sempre pode tudo (api/ usa service role key)
CREATE POLICY IF NOT EXISTS "service_role_all_deals"
  ON deals FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Policy: anon pode SELECT (dashboard usa anon key para leitura)
CREATE POLICY IF NOT EXISTS "anon_read_deals"
  ON deals FOR SELECT
  TO anon
  USING (true);
