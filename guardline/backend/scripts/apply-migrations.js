const { Client } = require('pg');

const DB = process.env.DATABASE_URL;
if (!DB) { console.error('DATABASE_URL not set'); process.exit(1); }

const SQL = `
ALTER TABLE "automation_recipes" ADD COLUMN IF NOT EXISTS "ownerId" TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'automation_recipes_ownerId_fkey'
  ) THEN
    ALTER TABLE "automation_recipes"
    ADD CONSTRAINT "automation_recipes_ownerId_fkey"
    FOREIGN KEY ("ownerId") REFERENCES "users"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "automation_recipes_ownerId_active_idx"
ON "automation_recipes"("ownerId", "active");

ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "modules" TEXT;

CREATE TABLE IF NOT EXISTS "admin_approval_requests" (
  "id" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "targetType" TEXT,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "code" TEXT NOT NULL,
  "payload" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "decidedById" TEXT,
  "decidedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "admin_approval_requests_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "admin_approval_requests_status_createdAt_idx" ON "admin_approval_requests"("status", "createdAt");
CREATE INDEX IF NOT EXISTS "admin_approval_requests_userId_status_idx" ON "admin_approval_requests"("userId", "status");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'admin_approval_requests_userId_fkey'
  ) THEN
    ALTER TABLE "admin_approval_requests"
    ADD CONSTRAINT "admin_approval_requests_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'admin_approval_requests_decidedById_fkey'
  ) THEN
    ALTER TABLE "admin_approval_requests"
    ADD CONSTRAINT "admin_approval_requests_decidedById_fkey"
    FOREIGN KEY ("decidedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
`;

async function run() {
  const client = new Client({ connectionString: DB, ssl: { rejectUnauthorized: false } });
  await client.connect();
  console.log('Connected to DB');
  await client.query(SQL);
  console.log('✅ Migrations applied successfully');
  await client.end();
}

run().catch(e => { console.error('❌', e.message); process.exit(1); });
