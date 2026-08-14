-- AlterTable
ALTER TABLE "PurchaseOrder" ADD COLUMN IF NOT EXISTS "processKind" TEXT NOT NULL DEFAULT 'a';

-- Órdenes vinculadas a factura primero (Proceso C) ya existentes
UPDATE "PurchaseOrder"
SET "processKind" = 'c'
WHERE "invoiceFirstCommitmentId" IS NOT NULL AND "processKind" = 'a';
