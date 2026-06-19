import { canRoleAdvance } from "@/lib/domain/flow";
import { STATUS_LABEL } from "@/lib/domain/labels";
import type { OrderStatus, PurchaseOrderDto, Role } from "@/lib/domain/types";

export type DashboardBucket = {
  key: string;
  label: string;
  count: number;
  href: string;
  accent: string;
};

export function countByStatus(orders: PurchaseOrderDto[]) {
  const counts: Record<OrderStatus, number> = {
    draft: 0,
    awaitingEngineer: 0,
    engineerRejected: 0,
    awaitingPatyDeadline: 0,
    awaitingPayment: 0,
    paid: 0,
    awaitingInvoice: 0,
    invoiceReceived: 0,
    completed: 0,
    difference: 0,
  };
  for (const o of orders) counts[o.status]++;
  return counts;
}

export function dashboardBuckets(orders: PurchaseOrderDto[]): DashboardBucket[] {
  const c = countByStatus(orders);
  return [
    {
      key: "total",
      label: "Órdenes activas",
      count: orders.length - c.completed,
      href: "/obras",
      accent: "border-orange-200/80 bg-white",
    },
    {
      key: "engineer",
      label: "En ingeniería",
      count: c.awaitingEngineer + c.engineerRejected,
      href: "/obras?estado=ingenieria",
      accent: "border-orange-300/70 bg-orange-50/30",
    },
    {
      key: "payment",
      label: "Pago pendiente",
      count: c.awaitingPayment + c.awaitingPatyDeadline,
      href: "/obras?estado=pago",
      accent: "border-teal-300/70 bg-teal-50/25",
    },
    {
      key: "docs",
      label: "Factura pendiente",
      count: c.paid + c.awaitingInvoice + c.invoiceReceived + c.difference,
      href: "/obras?estado=documentos",
      accent: "border-violet-300/60 bg-violet-50/20",
    },
    {
      key: "done",
      label: "Completadas",
      count: c.completed,
      href: "/obras?estado=completadas",
      accent: "border-zinc-200 bg-zinc-50/40",
    },
  ];
}

export function ordersForRole(orders: PurchaseOrderDto[], role: Role): PurchaseOrderDto[] {
  return orders.filter((o) => canRoleAdvance(role, o.status));
}

export function formatOrderLine(order: PurchaseOrderDto): string {
  return `${order.title} · ${order.obraName}`;
}

export { STATUS_LABEL };
