-- CreateTable
CREATE TABLE "PaymentRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orderId" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "reference" TEXT NOT NULL DEFAULT '',
    "notes" TEXT NOT NULL DEFAULT '',
    "recordedByUserId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PaymentRecord_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "PurchaseOrder" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PaymentRecord_recordedByUserId_fkey" FOREIGN KEY ("recordedByUserId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_PurchaseOrder" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "obraId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "supplierName" TEXT NOT NULL,
    "totalAmount" REAL NOT NULL,
    "amountPaidSoFar" REAL NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'MXN',
    "paymentLabel" TEXT NOT NULL DEFAULT 'pendiente',
    "paymentType" TEXT,
    "suggestedPaymentType" TEXT,
    "paymentDueDate" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'awaitingEngineer',
    "createdByUserId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PurchaseOrder_obraId_fkey" FOREIGN KEY ("obraId") REFERENCES "Obra" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PurchaseOrder_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_PurchaseOrder" ("amountPaidSoFar", "createdAt", "createdByUserId", "currency", "description", "id", "obraId", "paymentLabel", "status", "supplierName", "title", "totalAmount", "updatedAt") SELECT "amountPaidSoFar", "createdAt", "createdByUserId", "currency", "description", "id", "obraId", "paymentLabel", "status", "supplierName", "title", "totalAmount", "updatedAt" FROM "PurchaseOrder";
DROP TABLE "PurchaseOrder";
ALTER TABLE "new_PurchaseOrder" RENAME TO "PurchaseOrder";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
