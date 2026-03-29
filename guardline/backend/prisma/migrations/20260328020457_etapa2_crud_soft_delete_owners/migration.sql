-- AlterTable
ALTER TABLE "deals" ADD COLUMN "deletedAt" DATETIME;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_campaigns" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "startDate" DATETIME NOT NULL,
    "endDate" DATETIME,
    "budget" REAL,
    "targetLeads" INTEGER,
    "description" TEXT,
    "ownerId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "campaigns_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_campaigns" ("budget", "createdAt", "description", "endDate", "id", "name", "startDate", "status", "targetLeads", "type", "updatedAt") SELECT "budget", "createdAt", "description", "endDate", "id", "name", "startDate", "status", "targetLeads", "type", "updatedAt" FROM "campaigns";
DROP TABLE "campaigns";
ALTER TABLE "new_campaigns" RENAME TO "campaigns";
CREATE TABLE "new_investor_deals" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "investorName" TEXT NOT NULL,
    "firm" TEXT,
    "type" TEXT NOT NULL DEFAULT 'vc',
    "ticketMin" REAL,
    "ticketMax" REAL,
    "contactName" TEXT,
    "contactEmail" TEXT,
    "stage" TEXT NOT NULL DEFAULT 'cold_outreach',
    "status" TEXT NOT NULL DEFAULT 'active',
    "probability" INTEGER NOT NULL DEFAULT 20,
    "notes" TEXT,
    "lastContactAt" DATETIME,
    "nextMeeting" DATETIME,
    "ownerId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "investor_deals_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_investor_deals" ("contactEmail", "contactName", "createdAt", "firm", "id", "investorName", "lastContactAt", "nextMeeting", "notes", "probability", "stage", "status", "ticketMax", "ticketMin", "type", "updatedAt") SELECT "contactEmail", "contactName", "createdAt", "firm", "id", "investorName", "lastContactAt", "nextMeeting", "notes", "probability", "stage", "status", "ticketMax", "ticketMin", "type", "updatedAt" FROM "investor_deals";
DROP TABLE "investor_deals";
ALTER TABLE "new_investor_deals" RENAME TO "investor_deals";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
