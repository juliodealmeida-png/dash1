ALTER TABLE "users" ADD COLUMN "modules" TEXT;

CREATE TABLE "admin_approval_requests" (
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

CREATE INDEX "admin_approval_requests_status_createdAt_idx" ON "admin_approval_requests"("status", "createdAt");
CREATE INDEX "admin_approval_requests_userId_status_idx" ON "admin_approval_requests"("userId", "status");

ALTER TABLE "admin_approval_requests"
ADD CONSTRAINT "admin_approval_requests_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "users"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "admin_approval_requests"
ADD CONSTRAINT "admin_approval_requests_decidedById_fkey"
FOREIGN KEY ("decidedById") REFERENCES "users"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

