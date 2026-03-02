-- AlterTable
ALTER TABLE "Board"
ADD COLUMN "categories" TEXT[] DEFAULT ARRAY[]::TEXT[] NOT NULL;
