-- OPCIONAL: só executar se tiver IDs não-UUID (ex. CUID) em leads/deals e erros PostgREST.
-- Em bases novas com apenas UUID nativo, pode ignorar este ficheiro.

-- ALTER TABLE deals ALTER COLUMN id DROP DEFAULT;
-- ALTER TABLE deals ALTER COLUMN id TYPE text USING id::text;
-- ALTER TABLE deals ALTER COLUMN id SET DEFAULT gen_random_uuid()::text;
-- ALTER TABLE leads ALTER COLUMN id DROP DEFAULT;
-- ALTER TABLE leads ALTER COLUMN id TYPE text USING id::text;
-- ALTER TABLE leads ALTER COLUMN id SET DEFAULT gen_random_uuid()::text;

SELECT 1;
