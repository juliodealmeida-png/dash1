-- CreateTable
CREATE TABLE "documents" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "fileUrl" TEXT NOT NULL,
    "fileHash" TEXT NOT NULL,
    "finalFileUrl" TEXT,
    "finalFileHash" TEXT,
    "blockchainTxHash" TEXT,
    "blockchainBlock" INTEGER,
    "blockchainUrl" TEXT,
    "blockchainTimestamp" DATETIME,
    "version" INTEGER NOT NULL DEFAULT 1,
    "signerOrder" TEXT NOT NULL DEFAULT 'parallel',
    "expiresAt" DATETIME,
    "completedAt" DATETIME,
    "cancelledAt" DATETIME,
    "reminderDays" INTEGER NOT NULL DEFAULT 2,
    "message" TEXT,
    "ownerId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "documents_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "document_signers" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "documentId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "cpf" TEXT,
    "role" TEXT NOT NULL DEFAULT 'signer',
    "order" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "signedAt" DATETIME,
    "refusedAt" DATETIME,
    "refuseReason" TEXT,
    "viewedAt" DATETIME,
    "signerIp" TEXT,
    "signerAgent" TEXT,
    "signerGeoLat" REAL,
    "signerGeoLon" REAL,
    "signatureData" TEXT,
    "signatureMethod" TEXT,
    "geoAddress" TEXT,
    "geoSource" TEXT,
    "geoAccuracy" REAL,
    "deviceType" TEXT,
    "browser" TEXT,
    "operatingSystem" TEXT,
    "timezone" TEXT,
    "language" TEXT,
    "fingerprint" TEXT,
    "fingerprintJson" TEXT,
    "securityType" TEXT NOT NULL DEFAULT 'none',
    "customCode" TEXT,
    "customCodeHint" TEXT,
    "color" TEXT NOT NULL DEFAULT '#7c3aed',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "document_signers_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "documents" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "document_fields" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "documentId" TEXT NOT NULL,
    "signerId" TEXT,
    "type" TEXT NOT NULL,
    "page" INTEGER NOT NULL,
    "x" REAL NOT NULL,
    "y" REAL NOT NULL,
    "width" REAL NOT NULL,
    "height" REAL NOT NULL,
    "required" BOOLEAN NOT NULL DEFAULT true,
    "value" TEXT,
    "filledAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "document_fields_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "documents" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "document_fields_signerId_fkey" FOREIGN KEY ("signerId") REFERENCES "document_signers" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "signature_tokens" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "token" TEXT NOT NULL,
    "signerId" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "usedAt" DATETIME,
    "otpCode" TEXT,
    "otpExpiresAt" DATETIME,
    "otpVerified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "signature_tokens_signerId_fkey" FOREIGN KEY ("signerId") REFERENCES "document_signers" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "document_audit_log" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "documentId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "actorName" TEXT,
    "actorEmail" TEXT,
    "ip" TEXT,
    "userAgent" TEXT,
    "geoLat" REAL,
    "geoLon" REAL,
    "geoCity" TEXT,
    "metadata" TEXT,
    "documentHash" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "document_audit_log_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "documents" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "doc_notifications" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "documentId" TEXT,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "readAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "doc_notifications_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "documents" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "reminder_logs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "signerId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "sentAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentBy" TEXT,
    "message" TEXT
);

-- CreateIndex
CREATE UNIQUE INDEX "signature_tokens_token_key" ON "signature_tokens"("token");

-- CreateIndex
CREATE UNIQUE INDEX "signature_tokens_signerId_key" ON "signature_tokens"("signerId");

-- CreateIndex
CREATE INDEX "document_audit_log_documentId_createdAt_idx" ON "document_audit_log"("documentId", "createdAt");

-- CreateIndex
CREATE INDEX "doc_notifications_userId_read_idx" ON "doc_notifications"("userId", "read");

-- CreateIndex
CREATE INDEX "reminder_logs_signerId_sentAt_idx" ON "reminder_logs"("signerId", "sentAt");
