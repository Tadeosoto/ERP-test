-- Gastos administrativos: cada periodo es su propia fila, ligada por seriesId.
ALTER TABLE "RecurringCommitment" ADD COLUMN "amount" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "RecurringCommitment" ADD COLUMN "occurredOn" TIMESTAMP(3);
ALTER TABLE "RecurringCommitment" ADD COLUMN "category" TEXT NOT NULL DEFAULT 'otro';
ALTER TABLE "RecurringCommitment" ADD COLUMN "paymentMethod" TEXT NOT NULL DEFAULT '';
ALTER TABLE "RecurringCommitment" ADD COLUMN "seriesId" TEXT;
ALTER TABLE "RecurringCommitment" ADD COLUMN "occurrenceKey" TEXT;

UPDATE "RecurringCommitment"
SET
  "amount" = COALESCE("estimatedAmount", 0),
  "occurredOn" = "dueDate",
  "seriesId" = "id",
  "occurrenceKey" = to_char("dueDate", 'YYYY-MM-DD')
WHERE "occurredOn" IS NULL OR "seriesId" IS NULL OR "occurrenceKey" IS NULL;

ALTER TABLE "RecurringCommitment" ALTER COLUMN "occurredOn" SET NOT NULL;
ALTER TABLE "RecurringCommitment" ALTER COLUMN "seriesId" SET NOT NULL;
ALTER TABLE "RecurringCommitment" ALTER COLUMN "occurrenceKey" SET NOT NULL;

CREATE UNIQUE INDEX "RecurringCommitment_seriesId_occurrenceKey_key" ON "RecurringCommitment"("seriesId", "occurrenceKey");
CREATE INDEX "RecurringCommitment_seriesId_idx" ON "RecurringCommitment"("seriesId");
CREATE INDEX "RecurringCommitment_occurredOn_idx" ON "RecurringCommitment"("occurredOn");
CREATE INDEX "RecurringCommitment_category_idx" ON "RecurringCommitment"("category");
