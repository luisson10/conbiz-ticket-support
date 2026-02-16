-- Record duplicate boards that are about to be removed.
CREATE TABLE IF NOT EXISTS "_BoardDedupLog" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "accountId" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "removedBoardId" TEXT NOT NULL,
  "keptBoardId" TEXT NOT NULL,
  "removedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

WITH ranked AS (
  SELECT
    id,
    accountId,
    type,
    ROW_NUMBER() OVER (
      PARTITION BY accountId, type
      ORDER BY createdAt DESC, id DESC
    ) AS rn,
    FIRST_VALUE(id) OVER (
      PARTITION BY accountId, type
      ORDER BY createdAt DESC, id DESC
    ) AS keep_id
  FROM "Board"
),
removed AS (
  SELECT id, accountId, type, keep_id
  FROM ranked
  WHERE rn > 1
)
INSERT INTO "_BoardDedupLog" (id, accountId, type, removedBoardId, keptBoardId)
SELECT
  lower(hex(randomblob(16))),
  accountId,
  type,
  id,
  keep_id
FROM removed;

DELETE FROM "Board"
WHERE id IN (
  WITH ranked AS (
    SELECT
      id,
      ROW_NUMBER() OVER (
        PARTITION BY accountId, type
        ORDER BY createdAt DESC, id DESC
      ) AS rn
    FROM "Board"
  )
  SELECT id FROM ranked WHERE rn > 1
);

CREATE UNIQUE INDEX "Board_accountId_type_key" ON "Board"("accountId", "type");
