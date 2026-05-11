import type { PurchaseCase, Role, CaseStatus } from "./types";

export function getPendingRole(status: CaseStatus): Role | null {
  switch (status) {
    case "draft":
      return "costos";
    case "pendingEngineer":
      return "ingeniero";
    case "approved":
      return "pagos";
    case "paid":
      return "costos";
    case "invoiceRequested":
      return "costos";
    case "readyForReception":
      return "recepcion";
    case "capturedByReception":
      return "contabilidad";
    case "reconciled":
      return null;
    default:
      return null;
  }
}

export function canRoleAdvance(role: Role, status: CaseStatus): boolean {
  return getPendingRole(status) === role;
}

export function amountsRoughlyMatch(c: PurchaseCase): boolean {
  const pay = c.payment?.amount;
  const inv = c.invoice?.amount;
  if (pay == null || inv == null) return false;
  return Math.abs(pay - inv) < 0.01;
}

export function submitDraftToEngineer(c: PurchaseCase, now: string): PurchaseCase {
  if (c.status !== "draft") throw new Error("Estado inválido");
  if (!c.supplierName.trim() || c.amountOc <= 0)
    throw new Error("Complete proveedor e importe");
  return { ...c, status: "pendingEngineer", updatedAt: now };
}

export function engineerApprove(
  c: PurchaseCase,
  userId: string,
  comment: string | undefined,
  now: string
): PurchaseCase {
  if (c.status !== "pendingEngineer") throw new Error("Estado inválido");
  return {
    ...c,
    status: "approved",
    engineerApprovedAt: now,
    engineerApprovedByUserId: userId,
    engineerComment: comment?.trim() || undefined,
    updatedAt: now,
  };
}

export function registerPayment(
  c: PurchaseCase,
  input: {
    reference: string;
    amount: number;
    paidAt: string;
    receiptFile?: { name: string; sizeBytes: number };
  },
  now: string
): PurchaseCase {
  if (c.status !== "approved") throw new Error("Estado inválido");
  return {
    ...c,
    status: "paid",
    payment: {
      reference: input.reference.trim(),
      amount: input.amount,
      paidAt: input.paidAt,
      receiptFile: input.receiptFile,
    },
    updatedAt: now,
  };
}

export function requestInvoice(c: PurchaseCase, now: string): PurchaseCase {
  if (c.status !== "paid") throw new Error("Estado inválido");
  return {
    ...c,
    status: "invoiceRequested",
    invoiceRequestedAt: now,
    updatedAt: now,
  };
}

function hasDigitalPackageReady(c: PurchaseCase): boolean {
  return Boolean(c.payment && c.invoice);
}

export function registerInvoiceAndSendToReception(
  c: PurchaseCase,
  input: {
    folio: string;
    amount: number;
    issuedAt: string;
    file?: { name: string; sizeBytes: number };
  },
  now: string
): PurchaseCase {
  if (c.status !== "invoiceRequested") throw new Error("Estado inválido");
  const next: PurchaseCase = {
    ...c,
    invoice: {
      folio: input.folio.trim(),
      amount: input.amount,
      issuedAt: input.issuedAt,
      file: input.file,
    },
    updatedAt: now,
  };
  if (!hasDigitalPackageReady(next)) throw new Error("Falta comprobante de pago");
  return { ...next, status: "readyForReception", updatedAt: now };
}

export function receptionCapture(
  c: PurchaseCase,
  userId: string,
  notes: string,
  now: string
): PurchaseCase {
  if (c.status !== "readyForReception") throw new Error("Estado inválido");
  return {
    ...c,
    status: "capturedByReception",
    receptionCapture: {
      notes: notes.trim(),
      capturedAt: now,
      capturedByUserId: userId,
    },
    updatedAt: now,
  };
}

export function accountingReconcile(
  c: PurchaseCase,
  userId: string,
  balanced: boolean,
  notes: string,
  now: string
): PurchaseCase {
  if (c.status !== "capturedByReception") throw new Error("Estado inválido");
  return {
    ...c,
    status: "reconciled",
    accounting: {
      balanced,
      notes: notes.trim(),
      reconciledAt: now,
      reconciledByUserId: userId,
    },
    updatedAt: now,
  };
}
