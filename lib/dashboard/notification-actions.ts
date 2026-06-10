import type { NotificationDto, Role } from "@/lib/domain/types";

const ACTIONABLE_BY_TYPE: Partial<Record<string, Role[]>> = {
  order_created: ["ingeniero"],
  oc_pdf_updated: ["ingeniero"],
  engineer_approved: ["pagos"],
  engineer_approved_programado: ["compras"],
  engineer_rejected: ["compras"],
  deadline_set: ["pagos"],
  payment_registered: ["compras"],
};

export function isNotificationActionable(n: NotificationDto, role: Role): boolean {
  const roles = ACTIONABLE_BY_TYPE[n.type];
  if (!roles?.includes(role)) return false;
  if (n.type === "payment_registered" && role === "compras") {
    return n.message.toLowerCase().includes("sube factura");
  }
  return Boolean(n.orderId);
}

export function notificationActionHref(n: NotificationDto, role: Role): string | null {
  if (!n.orderId || !isNotificationActionable(n, role)) return null;
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
      return "Registrar pago";
    case "engineer_approved_programado":
      return "Indicar fecha";
    case "engineer_rejected":
      return "Corregir orden";
    case "payment_registered":
      return "Subir factura";
    default:
      return "Ir a la actividad";
  }
}
