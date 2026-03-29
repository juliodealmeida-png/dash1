-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "company" TEXT,
    "role" TEXT NOT NULL DEFAULT 'founder',
    "avatar" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "token" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "refresh_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "deals" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "contactName" TEXT,
    "contactEmail" TEXT,
    "contactPhone" TEXT,
    "value" REAL NOT NULL,
    "stage" TEXT NOT NULL,
    "source" TEXT,
    "probability" INTEGER NOT NULL DEFAULT 50,
    "riskScore" INTEGER NOT NULL DEFAULT 0,
    "forecastCategory" TEXT,
    "expectedCloseDate" DATETIME,
    "actualCloseDate" DATETIME,
    "lostReason" TEXT,
    "lostNote" TEXT,
    "notes" TEXT,
    "tags" TEXT,
    "ownerId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "lastContactAt" DATETIME,
    "stageChangedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "deals_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "deal_activities" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "dealId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "note" TEXT,
    "date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "deal_activities_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "deals" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "deal_emails" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "dealId" TEXT NOT NULL,
    "gmailId" TEXT,
    "from" TEXT NOT NULL,
    "to" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "snippet" TEXT,
    "receivedAt" DATETIME NOT NULL,
    "direction" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "deal_emails_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "deals" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "leads" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "company" TEXT,
    "jobTitle" TEXT,
    "source" TEXT,
    "status" TEXT NOT NULL DEFAULT 'new',
    "score" INTEGER NOT NULL DEFAULT 0,
    "scoreBreakdown" TEXT,
    "notes" TEXT,
    "tags" TEXT,
    "ownerId" TEXT NOT NULL,
    "convertedDealId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "lastContactAt" DATETIME,
    CONSTRAINT "leads_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "campaigns" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "startDate" DATETIME NOT NULL,
    "endDate" DATETIME,
    "budget" REAL,
    "targetLeads" INTEGER,
    "description" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "fraud_events" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "externalId" TEXT,
    "lat" REAL NOT NULL,
    "lng" REAL NOT NULL,
    "city" TEXT,
    "country" TEXT,
    "type" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "severity" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'detected',
    "riskScore" INTEGER NOT NULL,
    "sourceIp" TEXT,
    "merchantName" TEXT,
    "notes" TEXT,
    "resolvedAt" DATETIME,
    "detectedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "signals" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'info',
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "dealId" TEXT,
    "metadata" TEXT,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "signals_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "deals" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "automation_recipes" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "trigger" TEXT NOT NULL,
    "actions" TEXT NOT NULL,
    "config" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT false,
    "n8nWorkflowId" TEXT,
    "timesActivated" INTEGER NOT NULL DEFAULT 0,
    "lastActivated" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "automation_logs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "recipeId" TEXT NOT NULL,
    "dealId" TEXT,
    "triggeredBy" TEXT,
    "status" TEXT NOT NULL,
    "result" TEXT,
    "errorMessage" TEXT,
    "duration" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT,
    CONSTRAINT "automation_logs_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "automation_recipes" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "automation_logs_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "deals" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "automation_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "julio_briefs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "content" TEXT NOT NULL,
    "date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "type" TEXT NOT NULL DEFAULT 'daily',
    "userId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "julio_conversations" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "messages" TEXT NOT NULL,
    "title" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "julio_conversations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "integrations" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'disconnected',
    "config" TEXT,
    "lastSyncAt" DATETIME,
    "errorMessage" TEXT,
    "metadata" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "investor_deals" (
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
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "_CampaignLeads" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,
    CONSTRAINT "_CampaignLeads_A_fkey" FOREIGN KEY ("A") REFERENCES "campaigns" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "_CampaignLeads_B_fkey" FOREIGN KEY ("B") REFERENCES "leads" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_token_key" ON "refresh_tokens"("token");

-- CreateIndex
CREATE UNIQUE INDEX "deal_emails_gmailId_key" ON "deal_emails"("gmailId");

-- CreateIndex
CREATE UNIQUE INDEX "fraud_events_externalId_key" ON "fraud_events"("externalId");

-- CreateIndex
CREATE UNIQUE INDEX "_CampaignLeads_AB_unique" ON "_CampaignLeads"("A", "B");

-- CreateIndex
CREATE INDEX "_CampaignLeads_B_index" ON "_CampaignLeads"("B");
