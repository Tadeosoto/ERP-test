import type { Role } from "./types";

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
  return role === "compras" && status === "oc_requested";
}

/** Dirección y Administración pueden corregir datos del compromiso. */
export function canEditInvoiceFirstCommitment(role: Role): boolean {
  return role === "direccion" || role === "pagos";
}

/**
 * Dirección y Administración pueden borrar si aún no hay OC vinculada.
 * Con OC ya creada hay que gestionar la orden por separado.
 */
export function canDeleteInvoiceFirstCommitment(
  role: Role,
  status: InvoiceFirstStatus,
  hasPurchaseOrder: boolean
): boolean {
  if (!(role === "direccion" || role === "pagos")) return false;
  if (hasPurchaseOrder) return false;
  return status === "awaiting_oc" || status === "oc_requested";
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
