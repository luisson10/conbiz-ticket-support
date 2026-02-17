-- CreateTable
CREATE TABLE "Release" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "publishedAt" DATETIME,
    "createdByUserId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Release_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ReleaseAccount" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "releaseId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ReleaseAccount_releaseId_fkey" FOREIGN KEY ("releaseId") REFERENCES "Release" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ReleaseAccount_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ReleaseItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "releaseId" TEXT NOT NULL,
    "issueId" TEXT NOT NULL,
    "issueIdentifier" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "stateName" TEXT NOT NULL,
    "stateType" TEXT,
    "priority" INTEGER,
    "boardType" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ReleaseItem_releaseId_fkey" FOREIGN KEY ("releaseId") REFERENCES "Release" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ReleaseItem_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ReleaseTag" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ReleaseTagAssignment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "releaseId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ReleaseTagAssignment_releaseId_fkey" FOREIGN KEY ("releaseId") REFERENCES "Release" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ReleaseTagAssignment_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "ReleaseTag" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "Release_status_publishedAt_idx" ON "Release"("status", "publishedAt");

-- CreateIndex
CREATE UNIQUE INDEX "ReleaseAccount_releaseId_accountId_key" ON "ReleaseAccount"("releaseId", "accountId");

-- CreateIndex
CREATE INDEX "ReleaseAccount_accountId_releaseId_idx" ON "ReleaseAccount"("accountId", "releaseId");

-- CreateIndex
CREATE UNIQUE INDEX "ReleaseItem_releaseId_issueId_key" ON "ReleaseItem"("releaseId", "issueId");

-- CreateIndex
CREATE INDEX "ReleaseItem_releaseId_idx" ON "ReleaseItem"("releaseId");

-- CreateIndex
CREATE UNIQUE INDEX "ReleaseTag_slug_key" ON "ReleaseTag"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "ReleaseTagAssignment_releaseId_tagId_key" ON "ReleaseTagAssignment"("releaseId", "tagId");
