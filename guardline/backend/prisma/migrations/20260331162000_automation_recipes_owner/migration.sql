ALTER TABLE "automation_recipes" ADD COLUMN "ownerId" TEXT;

UPDATE "automation_recipes" ar
SET "ownerId" = (
  SELECT al."userId"
  FROM "automation_logs" al
  WHERE al."recipeId" = ar."id" AND al."userId" IS NOT NULL
  ORDER BY al."createdAt" DESC
  LIMIT 1
)
WHERE ar."ownerId" IS NULL;

ALTER TABLE "automation_recipes"
ADD CONSTRAINT "automation_recipes_ownerId_fkey"
FOREIGN KEY ("ownerId") REFERENCES "users"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "automation_recipes_ownerId_active_idx"
ON "automation_recipes"("ownerId", "active");
