-- CreateTable
CREATE TABLE "Employee" (
    "id" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Employee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Viatico" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "obraId" TEXT NOT NULL,
    "deliveredAmount" DOUBLE PRECISION NOT NULL,
    "createdByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Viatico_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ViaticoExpense" (
    "id" TEXT NOT NULL,
    "viaticoId" TEXT NOT NULL,
    "concept" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "receiptKind" TEXT NOT NULL,
    "missingReceiptReason" TEXT NOT NULL DEFAULT '',
    "createdByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ViaticoExpense_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ViaticoExpenseFile" (
    "id" TEXT NOT NULL,
    "expenseId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "originalFileName" TEXT NOT NULL,
    "storagePath" TEXT NOT NULL DEFAULT '',
    "fileData" BYTEA,
    "mimeType" TEXT NOT NULL DEFAULT 'application/pdf',
    "sizeBytes" INTEGER NOT NULL,
    "uploadedByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ViaticoExpenseFile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Employee_active_idx" ON "Employee"("active");

-- CreateIndex
CREATE INDEX "Viatico_employeeId_idx" ON "Viatico"("employeeId");

-- CreateIndex
CREATE INDEX "Viatico_obraId_idx" ON "Viatico"("obraId");

-- CreateIndex
CREATE INDEX "Viatico_createdAt_idx" ON "Viatico"("createdAt");

-- CreateIndex
CREATE INDEX "ViaticoExpense_viaticoId_idx" ON "ViaticoExpense"("viaticoId");

-- CreateIndex
CREATE INDEX "ViaticoExpenseFile_expenseId_idx" ON "ViaticoExpenseFile"("expenseId");

-- AddForeignKey
ALTER TABLE "Viatico" ADD CONSTRAINT "Viatico_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Viatico" ADD CONSTRAINT "Viatico_obraId_fkey" FOREIGN KEY ("obraId") REFERENCES "Obra"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Viatico" ADD CONSTRAINT "Viatico_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ViaticoExpense" ADD CONSTRAINT "ViaticoExpense_viaticoId_fkey" FOREIGN KEY ("viaticoId") REFERENCES "Viatico"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ViaticoExpense" ADD CONSTRAINT "ViaticoExpense_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ViaticoExpenseFile" ADD CONSTRAINT "ViaticoExpenseFile_expenseId_fkey" FOREIGN KEY ("expenseId") REFERENCES "ViaticoExpense"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ViaticoExpenseFile" ADD CONSTRAINT "ViaticoExpenseFile_uploadedByUserId_fkey" FOREIGN KEY ("uploadedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
