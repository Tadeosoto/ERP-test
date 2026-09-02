-- AlterTable
ALTER TABLE "Notification" ADD COLUMN IF NOT EXISTS "materialRequestId" TEXT;

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Notification_materialRequestId_fkey'
  ) THEN
    ALTER TABLE "Notification"
      ADD CONSTRAINT "Notification_materialRequestId_fkey"
      FOREIGN KEY ("materialRequestId")
      REFERENCES "MaterialRequest"("id")
      ON DELETE SET NULL
      ON UPDATE CASCADE;
  END IF;
END $$;
