ALTER TABLE "BatchOperation"
ADD COLUMN "unitRate" DECIMAL(18,0);

UPDATE "BatchOperation" AS bo
SET "unitRate" = COALESCE(
  (
    SELECT we."unitRate"
    FROM "WorkEntry" AS we
    WHERE we."batchOperationId" = bo."id"
    ORDER BY we."createdAt" DESC
    LIMIT 1
  ),
  (
    SELECT opr."amount"
    FROM "OperationRate" AS opr
    WHERE opr."operationId" = bo."operationId"
      AND opr."effectiveFrom" <= CURRENT_DATE
      AND (
        opr."effectiveTo" IS NULL
        OR opr."effectiveTo" >= CURRENT_DATE
      )
    ORDER BY opr."effectiveFrom" DESC
    LIMIT 1
  ),
  (
    SELECT opr."amount"
    FROM "OperationRate" AS opr
    WHERE opr."operationId" = bo."operationId"
    ORDER BY opr."effectiveFrom" DESC
    LIMIT 1
  )
);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "BatchOperation"
    WHERE "unitRate" IS NULL
  ) THEN
    RAISE EXCEPTION 'Could not backfill BatchOperation.unitRate';
  END IF;
END
$$;

ALTER TABLE "BatchOperation"
ALTER COLUMN "unitRate" SET NOT NULL;
