-- AlterTable
ALTER TABLE "Notification" ADD COLUMN IF NOT EXISTS "invoiceFirstCommitmentId" TEXT;

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Notification_invoiceFirstCommitmentId_fkey'
  ) THEN
    ALTER TABLE "Notification"
      ADD CONSTRAINT "Notification_invoiceFirstCommitmentId_fkey"
      FOREIGN KEY ("invoiceFirstCommitmentId")
      REFERENCES "InvoiceFirstCommitment"("id")
      ON DELETE SET NULL
      ON UPDATE CASCADE;
  END IF;
END $$;
