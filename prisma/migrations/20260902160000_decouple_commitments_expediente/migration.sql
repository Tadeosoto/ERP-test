-- Desvincular compromisos recurrentes de expedientes (pagos de servicios aparte).
ALTER TABLE "RecurringCommitment" DROP CONSTRAINT IF EXISTS "RecurringCommitment_expedienteId_fkey";
ALTER TABLE "RecurringCommitment" DROP COLUMN IF EXISTS "expedienteId";
