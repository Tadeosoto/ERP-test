-- Proceso A: equipo de ingenieros por obra + creador
ALTER TABLE "Obra" ADD COLUMN IF NOT EXISTS "createdByUserId" TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Obra_createdByUserId_fkey'
  ) THEN
    ALTER TABLE "Obra"
      ADD CONSTRAINT "Obra_createdByUserId_fkey"
      FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "ObraMember" (
  "id" TEXT NOT NULL,
  "obraId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ObraMember_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ObraMember_obraId_userId_key" ON "ObraMember"("obraId", "userId");
CREATE INDEX IF NOT EXISTS "ObraMember_userId_idx" ON "ObraMember"("userId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ObraMember_obraId_fkey'
  ) THEN
    ALTER TABLE "ObraMember"
      ADD CONSTRAINT "ObraMember_obraId_fkey"
      FOREIGN KEY ("obraId") REFERENCES "Obra"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ObraMember_userId_fkey'
  ) THEN
    ALTER TABLE "ObraMember"
      ADD CONSTRAINT "ObraMember_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- Órdenes ya en awaitingPayment (listas para pagar) se mantienen.
-- Las que estaban en flujo post-ingeniería sin pagar y aún "por autorizar" conceptual
-- no requieren backfill: awaitingAuthorization es estado nuevo hacia adelante.
