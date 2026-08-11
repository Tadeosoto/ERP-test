-- AlterTable
ALTER TABLE "Notification" ADD COLUMN IF NOT EXISTS "recurringCommitmentId" TEXT;
ALTER TABLE "Notification" ADD COLUMN IF NOT EXISTS "requiresAcknowledgement" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Notification" ADD COLUMN IF NOT EXISTS "acknowledged" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE IF NOT EXISTS "RecurringCommitmentFile" (
    "id" TEXT NOT NULL,
    "commitmentId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "originalFileName" TEXT NOT NULL,
    "storagePath" TEXT NOT NULL DEFAULT '',
    "fileData" BYTEA,
    "mimeType" TEXT NOT NULL DEFAULT 'application/pdf',
    "sizeBytes" INTEGER NOT NULL,
    "uploadedByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RecurringCommitmentFile_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "Notification" ADD CONSTRAINT "Notification_recurringCommitmentId_fkey"
    FOREIGN KEY ("recurringCommitmentId") REFERENCES "RecurringCommitment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "RecurringCommitmentFile" ADD CONSTRAINT "RecurringCommitmentFile_commitmentId_fkey"
    FOREIGN KEY ("commitmentId") REFERENCES "RecurringCommitment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "RecurringCommitmentFile" ADD CONSTRAINT "RecurringCommitmentFile_uploadedByUserId_fkey"
    FOREIGN KEY ("uploadedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
