-- CreateTable
CREATE TABLE "CompanyCard" (
    "id" TEXT NOT NULL,
    "bank" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "slot" INTEGER NOT NULL,
    "lastFour" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompanyCard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompanyCardMovement" (
    "id" TEXT NOT NULL,
    "cardId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "occurredOn" TIMESTAMP(3) NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "supplierName" TEXT NOT NULL DEFAULT '',
    "concept" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT '',
    "destinationKind" TEXT NOT NULL DEFAULT '',
    "obraId" TEXT,
    "costCenter" TEXT NOT NULL DEFAULT '',
    "responsibleUserId" TEXT,
    "responsibleEmployeeId" TEXT,
    "receiptKind" TEXT NOT NULL DEFAULT '',
    "missingReceiptReason" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT '',
    "createdByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompanyCardMovement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompanyCardMovementFile" (
    "id" TEXT NOT NULL,
    "movementId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "originalFileName" TEXT NOT NULL,
    "storagePath" TEXT NOT NULL DEFAULT '',
    "fileData" BYTEA,
    "mimeType" TEXT NOT NULL DEFAULT 'application/pdf',
    "sizeBytes" INTEGER NOT NULL,
    "uploadedByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CompanyCardMovementFile_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CompanyCard_bank_kind_slot_key" ON "CompanyCard"("bank", "kind", "slot");
CREATE INDEX "CompanyCardMovement_cardId_idx" ON "CompanyCardMovement"("cardId");
CREATE INDEX "CompanyCardMovement_occurredOn_idx" ON "CompanyCardMovement"("occurredOn");
CREATE INDEX "CompanyCardMovement_kind_idx" ON "CompanyCardMovement"("kind");
CREATE INDEX "CompanyCardMovementFile_movementId_idx" ON "CompanyCardMovementFile"("movementId");

ALTER TABLE "CompanyCardMovement" ADD CONSTRAINT "CompanyCardMovement_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "CompanyCard"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CompanyCardMovement" ADD CONSTRAINT "CompanyCardMovement_obraId_fkey" FOREIGN KEY ("obraId") REFERENCES "Obra"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CompanyCardMovement" ADD CONSTRAINT "CompanyCardMovement_responsibleUserId_fkey" FOREIGN KEY ("responsibleUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CompanyCardMovement" ADD CONSTRAINT "CompanyCardMovement_responsibleEmployeeId_fkey" FOREIGN KEY ("responsibleEmployeeId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CompanyCardMovement" ADD CONSTRAINT "CompanyCardMovement_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CompanyCardMovementFile" ADD CONSTRAINT "CompanyCardMovementFile_movementId_fkey" FOREIGN KEY ("movementId") REFERENCES "CompanyCardMovement"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CompanyCardMovementFile" ADD CONSTRAINT "CompanyCardMovementFile_uploadedByUserId_fkey" FOREIGN KEY ("uploadedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

INSERT INTO "CompanyCard" ("id", "bank", "kind", "label", "slot", "lastFour", "createdAt", "updatedAt") VALUES
('card_bb_01', 'banbajio', 'debito', 'BanBajío Débito 01', 1, '', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('card_bb_02', 'banbajio', 'debito', 'BanBajío Débito 02', 2, '', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('card_bb_03', 'banbajio', 'debito', 'BanBajío Débito 03', 3, '', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('card_bb_04', 'banbajio', 'debito', 'BanBajío Débito 04', 4, '', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('card_bb_05', 'banbajio', 'debito', 'BanBajío Débito 05', 5, '', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('card_bb_06', 'banbajio', 'debito', 'BanBajío Débito 06', 6, '', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('card_br_01', 'banregio', 'credito', 'Banregio Crédito 01', 1, '', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('card_br_02', 'banregio', 'credito', 'Banregio Crédito 02', 2, '', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('card_br_03', 'banregio', 'credito', 'Banregio Crédito 03', 3, '', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
