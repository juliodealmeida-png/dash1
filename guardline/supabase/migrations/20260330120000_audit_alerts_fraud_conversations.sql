-- Auditoria Guardline: alerts (coluna read), fraud_events, conversations mínimas

CREATE TABLE IF NOT EXISTS alerts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  type text,
  severity text DEFAULT 'info',
  title text,
  message text,
  lead_id text,
  read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS alerts_read_idx ON alerts (read);
CREATE INDEX IF NOT EXISTS alerts_created_at_idx ON alerts (created_at DESC);

CREATE TABLE IF NOT EXISTS fraud_events (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  type text,
  severity text DEFAULT 'medium',
  status text DEFAULT 'detected',
  amount numeric DEFAULT 0,
  risk_score integer DEFAULT 0,
  city text,
  country text,
  lat double precision,
  lng double precision,
  metadata jsonb DEFAULT '{}'::jsonb,
  detected_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS fraud_events_detected_at_idx ON fraud_events (detected_at DESC);

CREATE TABLE IF NOT EXISTS conversations (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  status text DEFAULT 'unread',
  subject text,
  preview text,
  channel text DEFAULT 'email',
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS conversations_status_idx ON conversations (status);

-- Assinaturas: colunas comuns esperadas pelo PostgREST (evitar 400 em PATCH vazio)
CREATE TABLE IF NOT EXISTS signatures (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  document_name text,
  status text DEFAULT 'pending',
  fields jsonb DEFAULT '[]'::jsonb,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
