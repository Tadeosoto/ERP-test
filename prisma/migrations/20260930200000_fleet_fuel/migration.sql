-- CreateTable
CREATE TABLE "Vehicle" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL DEFAULT '',
    "name" TEXT NOT NULL,
    "year" INTEGER,
    "plates" TEXT NOT NULL DEFAULT '',
    "vehicleType" TEXT NOT NULL DEFAULT '',
    "color" TEXT NOT NULL DEFAULT '',
    "vin" TEXT NOT NULL DEFAULT '',
    "ownerName" TEXT NOT NULL DEFAULT 'Consorcio Constructor Profesional',
    "status" TEXT NOT NULL DEFAULT 'activo',
    "currentKm" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "responsibleUserId" TEXT,
    "obraId" TEXT,
    "notes" TEXT NOT NULL DEFAULT '',
    "imageData" BYTEA,
    "imageMime" TEXT NOT NULL DEFAULT '',
    "createdByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Vehicle_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "VehicleDocument" (
    "id" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "expiresOn" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "VehicleDocument_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "VehicleMaintenance" (
    "id" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "dueOn" TIMESTAMP(3),
    "dueKm" DOUBLE PRECISION,
    "completedOn" TIMESTAMP(3),
    "notes" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "VehicleMaintenance_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "VehicleFinancing" (
    "id" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "institution" TEXT NOT NULL,
    "termMonths" INTEGER NOT NULL,
    "monthlyPayment" DOUBLE PRECISION NOT NULL,
    "balance" DOUBLE PRECISION NOT NULL,
    "nextPaymentOn" TIMESTAMP(3),
    "notes" TEXT NOT NULL DEFAULT '',
    CONSTRAINT "VehicleFinancing_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "VehicleFinancingPayment" (
    "id" TEXT NOT NULL,
    "financingId" TEXT NOT NULL,
    "paidOn" TIMESTAMP(3) NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "notes" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "VehicleFinancingPayment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "VehicleExpense" (
    "id" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "occurredOn" TIMESTAMP(3) NOT NULL,
    "concept" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "notes" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "VehicleExpense_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "FuelLoad" (
    "id" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "occurredOn" TIMESTAMP(3) NOT NULL,
    "odometerKm" DOUBLE PRECISION NOT NULL,
    "liters" DOUBLE PRECISION NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "pricePerLiter" DOUBLE PRECISION NOT NULL,
    "kmPerLiter" DOUBLE PRECISION,
    "stationName" TEXT NOT NULL,
    "companyCardId" TEXT NOT NULL,
    "destinationKind" TEXT NOT NULL,
    "obraId" TEXT,
    "costCenter" TEXT NOT NULL DEFAULT '',
    "receiptKind" TEXT NOT NULL,
    "notes" TEXT NOT NULL DEFAULT '',
    "createdByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "FuelLoad_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "FuelLoadFile" (
    "id" TEXT NOT NULL,
    "fuelLoadId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "originalFileName" TEXT NOT NULL,
    "storagePath" TEXT NOT NULL DEFAULT '',
    "fileData" BYTEA,
    "mimeType" TEXT NOT NULL DEFAULT 'application/pdf',
    "sizeBytes" INTEGER NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "purgedAt" TIMESTAMP(3),
    "uploadedByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FuelLoadFile_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "VehicleFinancing_vehicleId_key" ON "VehicleFinancing"("vehicleId");
CREATE INDEX "Vehicle_status_idx" ON "Vehicle"("status");
CREATE INDEX "VehicleDocument_vehicleId_idx" ON "VehicleDocument"("vehicleId");
CREATE INDEX "VehicleDocument_expiresOn_idx" ON "VehicleDocument"("expiresOn");
CREATE INDEX "VehicleMaintenance_vehicleId_idx" ON "VehicleMaintenance"("vehicleId");
CREATE INDEX "VehicleFinancingPayment_financingId_idx" ON "VehicleFinancingPayment"("financingId");
CREATE INDEX "VehicleExpense_vehicleId_idx" ON "VehicleExpense"("vehicleId");
CREATE INDEX "FuelLoad_vehicleId_occurredOn_idx" ON "FuelLoad"("vehicleId", "occurredOn");
CREATE INDEX "FuelLoad_companyCardId_idx" ON "FuelLoad"("companyCardId");
CREATE INDEX "FuelLoad_occurredOn_idx" ON "FuelLoad"("occurredOn");
CREATE INDEX "FuelLoadFile_fuelLoadId_idx" ON "FuelLoadFile"("fuelLoadId");
CREATE INDEX "FuelLoadFile_expiresAt_idx" ON "FuelLoadFile"("expiresAt");

ALTER TABLE "Vehicle" ADD CONSTRAINT "Vehicle_responsibleUserId_fkey" FOREIGN KEY ("responsibleUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Vehicle" ADD CONSTRAINT "Vehicle_obraId_fkey" FOREIGN KEY ("obraId") REFERENCES "Obra"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Vehicle" ADD CONSTRAINT "Vehicle_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "VehicleDocument" ADD CONSTRAINT "VehicleDocument_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VehicleMaintenance" ADD CONSTRAINT "VehicleMaintenance_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VehicleFinancing" ADD CONSTRAINT "VehicleFinancing_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VehicleFinancingPayment" ADD CONSTRAINT "VehicleFinancingPayment_financingId_fkey" FOREIGN KEY ("financingId") REFERENCES "VehicleFinancing"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VehicleExpense" ADD CONSTRAINT "VehicleExpense_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FuelLoad" ADD CONSTRAINT "FuelLoad_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "FuelLoad" ADD CONSTRAINT "FuelLoad_companyCardId_fkey" FOREIGN KEY ("companyCardId") REFERENCES "CompanyCard"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "FuelLoad" ADD CONSTRAINT "FuelLoad_obraId_fkey" FOREIGN KEY ("obraId") REFERENCES "Obra"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "FuelLoad" ADD CONSTRAINT "FuelLoad_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "FuelLoadFile" ADD CONSTRAINT "FuelLoadFile_fuelLoadId_fkey" FOREIGN KEY ("fuelLoadId") REFERENCES "FuelLoad"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FuelLoadFile" ADD CONSTRAINT "FuelLoadFile_uploadedByUserId_fkey" FOREIGN KEY ("uploadedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
