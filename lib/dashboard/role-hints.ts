import { getPendingRole } from "@/lib/domain/flow";
import type { PurchaseOrderDto, Role } from "@/lib/domain/types";
import { sortByCreatedAtDesc } from "@/lib/list-utils";

export type HomePanelTarget = "bandeja";

export type HomePanelHint = {
  target: HomePanelTarget;
  title: string;
  message: string;
  href: string;
  actionLabel: string;
};

function firstPendingForRole(orders: PurchaseOrderDto[], role: Role): PurchaseOrderDto | undefined {
  return sortByCreatedAtDesc(orders.filter((o) => getPendingRole(o.status) === role))[0];
}

export function getHomePanelHint(role: Role, orders: PurchaseOrderDto[]): HomePanelHint | null {
  const pending = firstPendingForRole(orders, role);

  if (role === "pagos" && pending) {
    return {
      target: "bandeja",
      title: "Tu tarea",
      message: "Registra el pago aquí",
      href: `/ordenes/${pending.id}`,
      actionLabel: "Ir al pago",
    };
  }

  if (role === "ingeniero" && pending) {
    return {
      target: "bandeja",
      title: "Tu tarea",
      message: "Revisa y aprueba la orden aquí",
      href: `/ordenes/${pending.id}`,
      actionLabel: "Abrir orden",
    };
  }

  if (role === "compras") {
    if (pending?.status === "engineerRejected") {
      return {
        target: "bandeja",
        title: "Tu tarea",
        message: "Corrige la orden y sube el PDF aquí",
        href: `/ordenes/${pending.id}`,
        actionLabel: "Corregir",
      };
    }
    if (pending?.status === "awaitingPatyDeadline") {
      return {
        target: "bandeja",
        title: "Tu tarea",
        message: "Indica la fecha límite de pago aquí",
        href: `/ordenes/${pending.id}`,
        actionLabel: "Indicar fecha",
      };
    }
    if (pending?.status === "awaitingFinalDocs") {
      return {
        target: "bandeja",
        title: "Tu tarea",
        message: "Sube la factura aquí",
        href: `/ordenes/${pending.id}`,
        actionLabel: "Subir factura",
      };
    }
    return {
      target: "bandeja",
      title: "Siguiente paso",
      message: "Crea la orden de compra aquí",
      href: "/ordenes/nueva",
      actionLabel: "Nueva OC",
    };
  }

  return null;
}
