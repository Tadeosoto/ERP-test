import type { Role } from "./types";
import { EXPEDIENTE_CLOSE_ROLES } from "./flow";

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

/** Administración y Dirección pueden corregir datos del gasto (incluido completado, p. ej. datos erróneos). */
export function canCorrectDirectExpense(status: DirectExpenseStatus, role: Role): boolean {
  return (role === "pagos" || role === "direccion") && status !== "draft";
}

/** Dirección y Administración pueden eliminar gastos (p. ej. creados por error). */
export function canDeleteDirectExpense(role: Role): boolean {
  return role === "pagos" || role === "direccion";
}

export function canSendDirectExpense(status: DirectExpenseStatus, role: Role, ownerId: string, userId: string): boolean {
  return role === "ingeniero" && ownerId === userId && status === "draft";
}

export function directExpensePendingRole(status: DirectExpenseStatus): Role | null {
  const roles = directExpensePendingRoles(status);
  return roles[0] ?? null;
}

export function directExpensePendingRoles(status: DirectExpenseStatus): Role[] {
  switch (status) {
    case "sent":
      return ["pagos"];
    case "paid":
    case "awaiting_invoice":
      return ["pagos", "recepcion", "contabilidad"];
    case "invoice_received":
    case "difference":
      return [...EXPEDIENTE_CLOSE_ROLES];
    default:
      return [];
  }
}

export function canActOnDirectExpense(status: DirectExpenseStatus, role: Role): boolean {
  return directExpensePendingRoles(status).includes(role);
}

export function canValidateDirectExpense(status: DirectExpenseStatus, role: Role): boolean {
  return EXPEDIENTE_CLOSE_ROLES.includes(role) && status === "invoice_received";
}

export function canResolveDirectExpenseDifference(status: DirectExpenseStatus, role: Role): boolean {
  return EXPEDIENTE_CLOSE_ROLES.includes(role) && status === "difference";
}

export function describeDirectExpenseGate(status: DirectExpenseStatus): string {
  switch (status) {
    case "draft":
      return "Completa la solicitud y envíala a Administración.";
    case "sent":
      return "Administración debe registrar el pago y subir el comprobante.";
    case "paid":
      return "Administración, Recepción o Contabilidad pueden subir la factura del proveedor.";
    case "awaiting_invoice":
      return "Administración, Recepción o Contabilidad deben subir el PDF de la factura del proveedor.";
    case "invoice_received":
      return "Administración, Recepción o Contabilidad deben validar y cerrar el expediente.";
    case "difference":
      return "Hay una diferencia. Administración, Recepción o Contabilidad deben revisar.";
    case "completed":
      return "Expediente cerrado.";
    default:
      return "";
  }
}
