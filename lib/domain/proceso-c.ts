import type { Role } from "./types";
import { canActAsCompras } from "./transitions";

export type InvoiceFirstStatus = "awaiting_oc" | "oc_requested" | "in_payment" | "completed";

export const INVOICE_FIRST_STATUS_LABEL: Record<InvoiceFirstStatus, string> = {
  awaiting_oc: "Esperando OC",
  oc_requested: "Esperando OC",
  in_payment: "En pago",
  completed: "Pagos completados",
};

export function canCreateInvoiceFirstCommitment(role: Role): boolean {
  return role === "direccion";
}

export function canRequestOcForInvoiceFirst(status: InvoiceFirstStatus, role: Role): boolean {
  return role === "pagos" && status === "awaiting_oc";
}

export function canCreateOcFromInvoiceFirst(status: InvoiceFirstStatus, role: Role): boolean {
  return canActAsCompras(role) && status === "oc_requested";
}

/** Dirección y Administración pueden corregir datos del compromiso. */
export function canEditInvoiceFirstCommitment(role: Role): boolean {
  return role === "direccion" || role === "pagos";
}

/**
 * Dirección y Administración pueden borrar facturas Proceso C
 * mientras no haya pagos registrados (aunque exista OC vinculada sin pagar).
 */
export function canDeleteInvoiceFirstCommitment(
  role: Role,
  _status: InvoiceFirstStatus,
  _hasPurchaseOrder: boolean,
  amountPaidSoFar = 0
): boolean {
  if (!(role === "direccion" || role === "pagos")) return false;
  return amountPaidSoFar <= 0.01;
}

export function invoiceFirstAwaitingOcCount(status: InvoiceFirstStatus): boolean {
  return status === "awaiting_oc" || status === "oc_requested";
}

export function describeInvoiceFirstGate(status: InvoiceFirstStatus): string {
  switch (status) {
    case "awaiting_oc":
      return "Administración revisará la factura y solicitará la OC a Compras.";
    case "oc_requested":
      return "Compras debe generar la Orden de Compra vinculada.";
    case "in_payment":
      return "La OC está en el flujo normal de pagos (Proceso A).";
    case "completed":
      return "Expediente cerrado.";
    default:
      return "";
  }
}
