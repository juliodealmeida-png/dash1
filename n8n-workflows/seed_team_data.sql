-- ============================================================
-- SEED DATA: Initial team members and routing rules
-- Run AFTER the migration 20260327200000_multi_user_workflows.sql
-- ============================================================

-- Inserir membros iniciais do time Guardline
INSERT INTO team_members
  (name, email, whatsapp, linkedin_url, calendar_url, role, specialties, territories, hubspot_owner_id)
VALUES
  (
    'Julio De Almeida',
    'julio.dealmeida@guardline.io',
    '+5511999990000',
    'https://linkedin.com/in/julio-dealmeida',
    'https://calendly.com/julio-guardline',
    'founder',
    ARRAY['onboarding','kyc','aml','fraud'],
    ARRAY['brazil','mexico','global'],
    '12345678'   -- substituir pelo ID real do HubSpot
  ),
  (
    'Ezequiel',
    'ezequiel@guardline.io',
    '+5491199990000',
    'https://linkedin.com/in/ezequiel',
    'https://calendly.com/ezequiel-guardline',
    'sdr',
    ARRAY['aml','compliance'],
    ARRAY['argentina','chile','colombia'],
    '87654321'   -- substituir pelo ID real do HubSpot
  );

-- Inserir regras de roteamento iniciais
INSERT INTO routing_rules (name, priority, conditions, assign_to, round_robin)
VALUES
  (
    'Onboarding → Julio',
    1,
    '{"product": "onboarding"}',
    (SELECT ARRAY[id] FROM team_members WHERE email = 'julio.dealmeida@guardline.io'),
    false
  ),
  (
    'AML Argentina → Ezequiel',
    2,
    '{"product": "aml", "country": "argentina"}',
    (SELECT ARRAY[id] FROM team_members WHERE email = 'ezequiel@guardline.io'),
    false
  ),
  (
    'AML Brasil → Julio',
    3,
    '{"product": "aml", "country": "brazil"}',
    (SELECT ARRAY[id] FROM team_members WHERE email = 'julio.dealmeida@guardline.io'),
    false
  ),
  (
    'Fallback geral — round-robin',
    99,
    '{}',
    (SELECT ARRAY_AGG(id) FROM team_members WHERE active = true),
    true
  );

-- Inserir configs vazias (para preencher depois com tokens reais)
INSERT INTO team_member_config (member_id, whatsapp_number, calendar_link)
SELECT id, whatsapp, calendar_url
FROM team_members;
