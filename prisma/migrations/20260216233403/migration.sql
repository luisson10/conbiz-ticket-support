/*
  Warnings:

  - You are about to drop the `_BoardDedupLog` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "_BoardDedupLog";
PRAGMA foreign_keys=on;
