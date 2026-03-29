-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_integrations" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'disconnected',
    "config" TEXT,
    "lastSyncAt" DATETIME,
    "errorMessage" TEXT,
    "metadata" TEXT,
    "userId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "integrations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_integrations" ("config", "createdAt", "errorMessage", "id", "lastSyncAt", "metadata", "status", "type", "updatedAt") SELECT "config", "createdAt", "errorMessage", "id", "lastSyncAt", "metadata", "status", "type", "updatedAt" FROM "integrations";
DROP TABLE "integrations";
ALTER TABLE "new_integrations" RENAME TO "integrations";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
