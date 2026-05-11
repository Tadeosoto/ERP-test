export type Role =
  | "costos"
  | "ingeniero"
  | "pagos"
  | "recepcion"
  | "contabilidad";

export type CaseStatus =
  | "draft"
  | "pendingEngineer"
  | "approved"
  | "paid"
  | "invoiceRequested"
  | "readyForReception"
  | "capturedByReception"
  | "reconciled";

export interface SimulatedFile {
  name: string;
  sizeBytes: number;
}

export interface PurchaseCase {
  id: string;
  title: string;
  supplierName: string;
  amountOc: number;
  currency: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  createdByUserId: string;
  status: CaseStatus;
  engineerComment?: string;
  engineerApprovedAt?: string;
  engineerApprovedByUserId?: string;
  payment?: {
    reference: string;
    amount: number;
    paidAt: string;
    receiptFile?: SimulatedFile;
  };
  invoiceRequestedAt?: string;
  invoice?: {
    folio: string;
    amount: number;
    issuedAt: string;
    file?: SimulatedFile;
  };
  receptionCapture?: {
    notes: string;
    capturedAt: string;
    capturedByUserId: string;
  };
  accounting?: {
    reconciledAt: string;
    balanced: boolean;
    notes: string;
    reconciledByUserId: string;
  };
}
