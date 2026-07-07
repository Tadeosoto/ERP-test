import { canRoleAdvance, INVOICE_UPLOAD_ROLES } from "@/lib/domain/flow";
import { canAccountingResolveDifference, canAccountingValidate } from "@/lib/domain/transitions";
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

function pendingForRole(orders: PurchaseOrderDto[], role: Role): PurchaseOrderDto | undefined {
  return sortByCreatedAtDesc(orders.filter((o) => canRoleAdvance(role, o.status)))[0];
}

export function getHomePanelHint(role: Role, orders: PurchaseOrderDto[]): HomePanelHint | null {
  const pending = pendingForRole(orders, role);

  if (role === "pagos" && pending?.status === "awaitingPayment") {
    const folio = pending.ocFolio ? ` la ${pending.ocFolio}` : " la OC";
    return {
      target: "bandeja",
      title: "Tu tarea",
      message: `Registrar el pago de${folio} a ${pending.supplierName}`,
      href: `/ordenes/${pending.id}#pagos`,
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

  if (pending && canAccountingValidate(pending.status, role)) {
    return {
      target: "bandeja",
      title: "Tu tarea",
      message: "Valida OC, pago y factura aquí",
      href: `/ordenes/${pending.id}#tarea`,
      actionLabel: "Validar",
    };
  }

  if (pending && canAccountingResolveDifference(pending.status, role)) {
    return {
      target: "bandeja",
      title: "Tu tarea",
      message: "Revisa la diferencia y cierra el expediente",
      href: `/ordenes/${pending.id}#tarea`,
      actionLabel: "Resolver",
    };
  }

  if (INVOICE_UPLOAD_ROLES.includes(role) && pending?.status === "awaitingInvoice") {
    return {
      target: "bandeja",
      title: "Tu tarea",
      message: "Sube la factura aquí",
      href: `/ordenes/${pending.id}`,
      actionLabel: "Subir factura",
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
    if (pending?.status === "paid") {
      return {
        target: "bandeja",
        title: "Tu tarea",
        message: "Marca «Esperando factura» tras contactar al proveedor",
        href: `/ordenes/${pending.id}`,
        actionLabel: "Continuar",
      };
    }
    if (pending?.status === "awaitingInvoice") {
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
