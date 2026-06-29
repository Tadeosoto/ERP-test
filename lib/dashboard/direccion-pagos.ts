import type { PurchaseOrderDto } from "@/lib/domain/types";
import {
  isActivePartial,
  isPendingAuthorization,
  latestPaymentDate,
  orderPaymentTotal,
  partialProgress,
  paymentSummary,
  paymentsCountInMonth,
  paymentsInMonth,
} from "@/lib/dashboard/direccion-dashboard";

export type DireccionPagoTab =
  | "todos"
  | "pendientes"
  | "parciales"
  | "realizados"
  | "rechazados";

export type DireccionPagoEstatus =
  | "pendiente_autorizar"
  | "parcial"
  | "pagado"
  | "rechazado"
  | "programado";

export type DireccionPagosFilters = {
  obraId: string;
  supplier: string;
  estatus: string;
  dateFrom: string;
  dateTo: string;
};

export const DIRECCION_PAGO_TABS: { key: DireccionPagoTab; label: string }[] = [
  { key: "todos", label: "Todos los pagos" },
  { key: "pendientes", label: "Pendientes de autorizar" },
  { key: "parciales", label: "Pagos parciales activos" },
  { key: "realizados", label: "Pagos realizados" },
  { key: "rechazados", label: "Pagos rechazados" },
];

export const DIRECCION_PAGO_ESTATUS_OPTIONS: { value: DireccionPagoEstatus | ""; label: string }[] = [
  { value: "", label: "Todos" },
  { value: "pendiente_autorizar", label: "Pendiente de autorizar" },
  { value: "programado", label: "Programado" },
  { value: "parcial", label: "Parcial" },
  { value: "pagado", label: "Pagado" },
  { value: "rechazado", label: "Rechazado" },
];

const PAYMENT_SCOPE: PurchaseOrderDto["status"][] = [
  "awaitingPatyDeadline",
  "awaitingPayment",
  "paid",
  "awaitingInvoice",
  "invoiceReceived",
  "completed",
  "difference",
  "engineerRejected",
];

export function ordersInPagosModule(orders: PurchaseOrderDto[]): PurchaseOrderDto[] {
  return orders.filter(
    (o) => PAYMENT_SCOPE.includes(o.status) || o.amountPaidSoFar > 0.01
  );
}

export function direccionPagoEstatus(order: PurchaseOrderDto): DireccionPagoEstatus {
  if (order.status === "engineerRejected" || order.status === "difference") return "rechazado";
  if (isPendingAuthorization(order)) {
    const due = order.paymentDueDate?.slice(0, 10);
    const today = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Mexico_City" }).format(
      new Date()
    );
    if (due && due > today && order.paymentType === "programado") return "programado";
    return "pendiente_autorizar";
  }
  if (isActivePartial(order)) return "parcial";
  if (
    order.amountPaidSoFar >= order.totalAmount - 0.01 ||
    ["paid", "awaitingInvoice", "invoiceReceived", "completed"].includes(order.status)
  ) {
    return "pagado";
  }
  if (order.amountPaidSoFar > 0.01) return "parcial";
  return "pendiente_autorizar";
}

export const DIRECCION_PAGO_ESTATUS_LABEL: Record<DireccionPagoEstatus, string> = {
  pendiente_autorizar: "Pendiente de autorizar",
  programado: "Programado",
  parcial: "Parcial",
  pagado: "Pagado",
  rechazado: "Rechazado",
};

export const DIRECCION_PAGO_ESTATUS_TONE: Record<DireccionPagoEstatus, string> = {
  pendiente_autorizar: "bg-orange-100 text-orange-800 ring-orange-200/80",
  programado: "bg-sky-100 text-sky-800 ring-sky-200/80",
  parcial: "bg-blue-100 text-blue-800 ring-blue-200/80",
  pagado: "bg-emerald-100 text-emerald-800 ring-emerald-200/80",
  rechazado: "bg-red-100 text-red-800 ring-red-200/80",
};

export function filterByTab(orders: PurchaseOrderDto[], tab: DireccionPagoTab): PurchaseOrderDto[] {
  const base = ordersInPagosModule(orders);
  switch (tab) {
    case "pendientes":
      return base.filter(isPendingAuthorization);
    case "parciales":
      return base.filter(isActivePartial);
    case "realizados":
      return base.filter(
        (o) =>
          o.amountPaidSoFar > 0.01 ||
          ["paid", "awaitingInvoice", "invoiceReceived", "completed"].includes(o.status)
      );
    case "rechazados":
      return base.filter((o) => o.status === "engineerRejected" || o.status === "difference");
    default:
      return base;
  }
}

function paymentDateForFilter(order: PurchaseOrderDto): string | null {
  return latestPaymentDate(order) ?? order.paymentDueDate ?? order.createdAt;
}

export function applyPagosFilters(
  orders: PurchaseOrderDto[],
  filters: DireccionPagosFilters
): PurchaseOrderDto[] {
  return orders.filter((o) => {
    if (filters.obraId && o.obraId !== filters.obraId) return false;
    if (filters.supplier && !o.supplierName.toLowerCase().includes(filters.supplier.toLowerCase())) {
      return false;
    }
    if (filters.estatus && direccionPagoEstatus(o) !== filters.estatus) return false;

    const payDate = paymentDateForFilter(o)?.slice(0, 10);
    if (filters.dateFrom && payDate && payDate < filters.dateFrom) return false;
    if (filters.dateTo && payDate && payDate > filters.dateTo) return false;
    if ((filters.dateFrom || filters.dateTo) && !payDate) return false;

    return true;
  });
}

export function uniqueSuppliers(orders: PurchaseOrderDto[]): string[] {
  const set = new Set<string>();
  for (const o of orders) {
    const n = o.supplierName.trim();
    if (n) set.add(n);
  }
  return [...set].sort((a, b) => a.localeCompare(b, "es"));
}

export function amountToPay(order: PurchaseOrderDto): number {
  if (isPendingAuthorization(order)) {
    return order.amountRemaining > 0 ? order.amountRemaining : order.totalAmount;
  }
  return order.amountRemaining > 0 ? order.amountRemaining : 0;
}

export function upcomingScheduledPayments(
  orders: PurchaseOrderDto[],
  limit = 5
): PurchaseOrderDto[] {
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Mexico_City" }).format(
    new Date()
  );
  return [...orders]
    .filter((o) => {
      if (o.status !== "awaitingPayment") return false;
      const due = o.paymentDueDate?.slice(0, 10);
      return due && due >= today;
    })
    .sort((a, b) => {
      const da = a.paymentDueDate ?? "";
      const db = b.paymentDueDate ?? "";
      return da.localeCompare(db);
    })
    .slice(0, limit);
}

export function pagosPageKpis(orders: PurchaseOrderDto[]) {
  const month = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Mexico_City" })
    .format(new Date())
    .slice(0, 7);
  const summary = paymentSummary(orders);
  const realizadosMes = paymentsInMonth(orders, month);
  const countMes = paymentsCountInMonth(orders, month);
  const pending = orders.filter(isPendingAuthorization);
  const pendingAmount = pending.reduce((s, o) => s + amountToPay(o), 0);
  const partials = orders.filter(isActivePartial);

  return {
    realizadosMes,
    realizadosCount: countMes,
    pendientesAmount: pendingAmount,
    pendientesCount: pending.length,
    parcialesCount: partials.length,
    totalComprometido: summary.totalComprometido,
  };
}

export function partialInstallmentLabel(order: PurchaseOrderDto): string {
  const prog = partialProgress(order);
  const paid = order.paymentRecords.length || (order.amountPaidSoFar > 0 ? 1 : 0);
  const estimated = Math.max(paid + 1, Math.ceil(order.totalAmount / Math.max(order.amountPaidSoFar, 1)));
  if (order.paymentType === "parcialidades" && paid > 0) {
    return `${paid} de ${estimated}`;
  }
  return prog.pct > 0 ? `${prog.pct}%` : "—";
}

export function paginateItems<T>(items: T[], page: number, pageSize: number): T[] {
  const start = (page - 1) * pageSize;
  return items.slice(start, start + pageSize);
}

export function totalPages(count: number, pageSize: number): number {
  return Math.max(1, Math.ceil(count / pageSize));
}

export function exportPagosCsv(orders: PurchaseOrderDto[]): void {
  const headers = [
    "Folio OC",
    "Proveedor",
    "Obra",
    "Monto total OC",
    "A pagar",
    "Pagado",
    "Saldo pendiente",
    "Fecha pago",
    "Estatus",
  ];
  const rows = orders.map((o) => {
    const payDate = latestPaymentDate(o) ?? o.paymentDueDate ?? "";
    return [
      o.ocFolio || o.title,
      o.supplierName,
      o.obraName,
      o.totalAmount.toFixed(2),
      amountToPay(o).toFixed(2),
      o.amountPaidSoFar.toFixed(2),
      o.amountRemaining.toFixed(2),
      payDate.slice(0, 10),
      DIRECCION_PAGO_ESTATUS_LABEL[direccionPagoEstatus(o)],
    ];
  });
  const csv = [headers, ...rows]
    .map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
    .join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `pagos-ccp-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export { partialProgress, spendByObraThisMonth, isActivePartial } from "@/lib/dashboard/direccion-dashboard";
export { latestPaymentDate, orderPaymentTotal };
