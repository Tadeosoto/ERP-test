import { canRoleAdvance } from "@/lib/domain/flow";
import type { OrderStatus, PurchaseOrderDto, Role } from "@/lib/domain/types";

export type OrderListFilter =
  | "ingenieria"
  | "pago"
  | "documentos"
  | "completadas"
  | "pendientes"
  | null;

const STATUS_GROUPS: Record<Exclude<OrderListFilter, "pendientes" | null>, OrderStatus[]> = {
  ingenieria: ["awaitingEngineer", "engineerRejected"],
  pago: ["awaitingPayment", "awaitingPatyDeadline", "paid"],
  documentos: ["awaitingInvoice", "invoiceReceived", "difference"],
  completadas: ["completed"],
};

export function parseOrderListFilter(
  estado: string | null,
  pendientes: string | null
): OrderListFilter {
  if (pendientes === "1") return "pendientes";
  if (
    estado === "ingenieria" ||
    estado === "pago" ||
    estado === "documentos" ||
    estado === "completadas"
  ) {
    return estado;
  }
  return null;
}

export function filterOrdersByListFilter(
  orders: PurchaseOrderDto[],
  filter: OrderListFilter,
  role?: Role
): PurchaseOrderDto[] {
  if (!filter) return orders;
  if (filter === "pendientes") {
    if (!role) {
      return orders.filter((o) => canRoleAdvance("compras", o.status) || canRoleAdvance("pagos", o.status) || canRoleAdvance("ingeniero", o.status) || canRoleAdvance("recepcion", o.status) || canRoleAdvance("contabilidad", o.status));
    }
    return orders.filter((o) => canRoleAdvance(role, o.status));
  }
  const statuses = STATUS_GROUPS[filter];
  return orders.filter((o) => statuses.includes(o.status));
}

export const FILTER_TITLES: Record<Exclude<OrderListFilter, null>, string> = {
  ingenieria: "En ingeniería o corrección",
  pago: "Pago pendiente",
  documentos: "Esperando factura",
  completadas: "Completadas",
  pendientes: "Pendientes de tu rol",
};
