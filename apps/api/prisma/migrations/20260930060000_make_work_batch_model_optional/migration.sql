-- Make the work-batch model optional.
ALTER TABLE "WorkBatch"
ALTER COLUMN "modelName" DROP NOT NULL;
