import type { Role } from "./types";

export type MaterialRequestStatus = "draft" | "sent" | "in_oc_process" | "completed";

export type DirectExpenseStatus =
  | "draft"
  | "sent"
  | "paid"
  | "awaiting_invoice"
  | "invoice_received"
  | "completed"
  | "difference";

export const MATERIAL_REQUEST_STATUS_LABEL: Record<MaterialRequestStatus, string> = {
  draft: "Borrador",
  sent: "Solicitud enviada",
  in_oc_process: "OC en proceso",
  completed: "Completada",
};

export const DIRECT_EXPENSE_STATUS_LABEL: Record<DirectExpenseStatus, string> = {
  draft: "Borrador",
  sent: "Solicitud enviada",
  paid: "Pagada",
  awaiting_invoice: "Esperando factura",
  invoice_received: "Factura recibida",
  completed: "Completada",
  difference: "Diferencia",
};

export const COMPRAS_PAYMENT_OPTIONS = [
  {
    value: "inmediato" as const,
    label: "Pago inmediato",
    hint: "Administración salda el 100% de una sola vez.",
  },
  {
    value: "programado" as const,
    label: "A 30 días",
    hint: "Pago programado; tras aprobación de Ingeniería fijarás la fecha límite.",
  },
  {
    value: "parcialidades" as const,
    label: "Parcialidades",
    hint: "Administración registra abonos hasta completar el total.",
  },
];

export function canCreateMaterialRequest(role: Role): boolean {
  return role === "ingeniero";
}

export function canEditMaterialRequest(status: MaterialRequestStatus, role: Role, ownerId: string, userId: string): boolean {
  return role === "ingeniero" && ownerId === userId && status === "draft";
}

export function canSendMaterialRequest(status: MaterialRequestStatus, role: Role, ownerId: string, userId: string): boolean {
  return role === "ingeniero" && ownerId === userId && status === "draft";
}

export function canCreateDirectExpense(role: Role): boolean {
  return role === "ingeniero";
}

export function canEditDirectExpense(status: DirectExpenseStatus, role: Role, ownerId: string, userId: string): boolean {
  return role === "ingeniero" && ownerId === userId && status === "draft";
}

export function canSendDirectExpense(status: DirectExpenseStatus, role: Role, ownerId: string, userId: string): boolean {
  return role === "ingeniero" && ownerId === userId && status === "draft";
}

export function directExpensePendingRole(status: DirectExpenseStatus): Role | null {
  switch (status) {
    case "sent":
      return "pagos";
    case "paid":
      return "pagos";
    case "awaiting_invoice":
      return "recepcion";
    case "invoice_received":
    case "difference":
      return "contabilidad";
    default:
      return null;
  }
}

export function describeDirectExpenseGate(status: DirectExpenseStatus): string {
  switch (status) {
    case "draft":
      return "Completa la solicitud y envíala a Administración.";
    case "sent":
      return "Administración debe registrar el pago y subir el comprobante.";
    case "paid":
      return "Administración puede marcar «Esperando factura» o subir la factura.";
    case "awaiting_invoice":
      return "Recepción o Administración deben subir el PDF de la factura.";
    case "invoice_received":
      return "Contabilidad debe validar y cerrar el expediente.";
    case "difference":
      return "Contabilidad debe revisar la observación.";
    case "completed":
      return "Expediente cerrado.";
    default:
      return "";
  }
}
