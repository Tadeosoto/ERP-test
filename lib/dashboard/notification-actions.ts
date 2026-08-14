import type { NotificationDto, Role } from "@/lib/domain/types";
import { EXPEDIENTE_CLOSE_ROLES } from "@/lib/domain/flow";
import { canActAsCompras } from "@/lib/domain/transitions";

const ACTIONABLE_BY_TYPE: Partial<Record<string, Role[]>> = {
  order_created: ["ingeniero"],
  oc_pdf_updated: ["ingeniero"],
  engineer_approved: ["pagos"],
  engineer_approved_programado: ["compras", "pagos"],
  engineer_rejected: ["compras", "pagos"],
  deadline_set: ["pagos"],
  payment_registered: ["compras", "pagos"],
  order_sent_proceso_b: ["pagos"],
  order_sent_proceso_c: ["pagos"],
  recurring_due_reminder: ["pagos"],
  awaiting_invoice: ["compras", "pagos", "recepcion"],
  invoice_uploaded: [...EXPEDIENTE_CLOSE_ROLES],
  order_difference: [...EXPEDIENTE_CLOSE_ROLES, "compras", "pagos"],
  direct_expense_sent: ["pagos"],
  direct_expense_paid: ["pagos", "recepcion"],
  direct_expense_awaiting_invoice: ["pagos", "recepcion"],
  direct_expense_invoice: [...EXPEDIENTE_CLOSE_ROLES],
  invoice_first_registered: ["pagos"],
  invoice_first_oc_requested: ["compras", "pagos"],
};

export function isNotificationActionable(n: NotificationDto, role: Role): boolean {
  const roles = ACTIONABLE_BY_TYPE[n.type];
  if (!roles?.includes(role)) return false;
  if (n.type === "payment_registered" && canActAsCompras(role)) {
    return n.message.toLowerCase().includes("compras");
  }
  if (n.type.startsWith("direct_expense_")) {
    return Boolean(n.directExpenseId);
  }
  if (n.type.startsWith("invoice_first_")) {
    return Boolean(n.invoiceFirstCommitmentId);
  }
  if (n.type === "recurring_due_reminder") {
    return true;
  }
  return Boolean(n.orderId);
}

export function notificationActionHref(n: NotificationDto, role: Role): string | null {
  if (!isNotificationActionable(n, role)) return null;
  if (n.type.startsWith("direct_expense_") && n.directExpenseId) {
    return `/solicitudes/gasto/${n.directExpenseId}`;
  }
  if (n.type.startsWith("invoice_first_") && n.invoiceFirstCommitmentId) {
    if (n.type === "invoice_first_oc_requested" && canActAsCompras(role)) {
      return `/ordenes/nueva?compromisoFacturaId=${n.invoiceFirstCommitmentId}`;
    }
    return `/compromisos-c/${n.invoiceFirstCommitmentId}`;
  }
  if (n.type === "recurring_due_reminder") {
    return "/inicio";
  }
  if (!n.orderId) return null;
  return `/ordenes/${n.orderId}`;
}

export function notificationActionLabel(n: NotificationDto, role: Role): string {
  if (!isNotificationActionable(n, role)) return "Ver detalle";
  switch (n.type) {
    case "order_created":
    case "oc_pdf_updated":
      return "Revisar orden";
    case "engineer_approved":
    case "deadline_set":
    case "order_sent_proceso_b":
    case "order_sent_proceso_c":
      return "Registrar pago";
    case "recurring_due_reminder":
      return "Ver compromisos";
    case "engineer_approved_programado":
      return "Indicar fecha";
    case "engineer_rejected":
      return "Corregir orden";
    case "payment_registered":
      return "Coordinar factura";
    case "awaiting_invoice":
      return "Subir factura";
    case "invoice_uploaded":
    case "order_difference":
      return "Validar expediente";
    case "direct_expense_sent":
      return "Registrar pago";
    case "direct_expense_paid":
      return "Continuar gasto";
    case "direct_expense_awaiting_invoice":
      return "Subir factura";
    case "direct_expense_invoice":
      return "Validar gasto";
    case "invoice_first_registered":
      return "Solicitar OC";
    case "invoice_first_oc_requested":
      return "Generar OC";
    default:
      return "Ir a la actividad";
  }
}
