-- Make batch operations removable from future worker entry without deleting history.
ALTER TABLE "BatchOperation"
ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true;

-- Sizes belong to a work batch and are reused by every operation in that batch.
CREATE TABLE "WorkBatchSize" (
  "id" TEXT NOT NULL,
  "workBatchId" TEXT NOT NULL,
  "label" VARCHAR(50) NOT NULL,
  "quantity" INTEGER NOT NULL,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "WorkBatchSize_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "WorkBatchSize"
ADD CONSTRAINT "WorkBatchSize_workBatchId_fkey"
FOREIGN KEY ("workBatchId") REFERENCES "WorkBatch"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

CREATE UNIQUE INDEX "WorkBatchSize_workBatchId_label_key"
ON "WorkBatchSize"("workBatchId", "label");

CREATE INDEX "WorkBatchSize_workBatchId_isActive_sortOrder_idx"
ON "WorkBatchSize"("workBatchId", "isActive", "sortOrder");

-- Existing batches receive one compatibility size so existing history stays valid.
INSERT INTO "WorkBatchSize" (
  "id",
  "workBatchId",
  "label",
  "quantity",
  "sortOrder",
  "isActive",
  "createdAt",
  "updatedAt"
)
SELECT
  'legacy-' || "id",
  "id",
  'بدون سایز',
  "totalQuantity",
  0,
  true,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "WorkBatch";

ALTER TABLE "WorkEntry"
ADD COLUMN "workBatchSizeId" TEXT;

UPDATE "WorkEntry" AS we
SET "workBatchSizeId" = 'legacy-' || bo."workBatchId"
FROM "BatchOperation" AS bo
WHERE bo."id" = we."batchOperationId";

ALTER TABLE "WorkEntry"
ALTER COLUMN "workBatchSizeId" SET NOT NULL;

ALTER TABLE "WorkEntry"
ADD CONSTRAINT "WorkEntry_workBatchSizeId_fkey"
FOREIGN KEY ("workBatchSizeId") REFERENCES "WorkBatchSize"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "WorkEntry_workBatchSizeId_status_idx"
ON "WorkEntry"("workBatchSizeId", "status");
