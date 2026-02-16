-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "Account_name_key" ON "Account"("name");

-- Seed default account for existing boards
INSERT INTO "Account" ("id", "name", "createdAt", "updatedAt")
VALUES ('acc_default', 'General', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- Redefine Board with account/type fields
CREATE TABLE "new_Board" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'SUPPORT',
    "accountId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "projectId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Board_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

INSERT INTO "new_Board" ("id", "name", "type", "accountId", "teamId", "projectId", "createdAt", "updatedAt")
SELECT "id", "name", 'SUPPORT', 'acc_default', "teamId", "projectId", "createdAt", "updatedAt"
FROM "Board";

DROP TABLE "Board";
ALTER TABLE "new_Board" RENAME TO "Board";

-- CreateIndex
CREATE INDEX "Board_accountId_type_idx" ON "Board"("accountId", "type");
