import type { ObraDto, PurchaseOrderDto } from "@/lib/domain/types";

const MX_TZ = "America/Mexico_City";

export type DireccionKpiKey =
  | "gastoTotalMes"
  | "pagosPendientesAutorizar"
  | "pagosParcialesActivos"
  | "pagosAutorizadosMes";

export type MonthlySpendPoint = { month: string; label: string; total: number };

export type ObraSpendSlice = { obraId: string; name: string; total: number; pct: number };

export type PaymentSummary = {
  pagado: { amount: number; count: number };
  pendienteAutorizar: { amount: number; count: number };
  enProcesoParciales: { amount: number; count: number };
  totalComprometido: number;
};

export type DireccionAlert = {
  id: string;
  tone: "red" | "amber" | "violet";
  message: string;
  href: string;
};

function mxToday(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: MX_TZ }).format(new Date());
}

function monthKeyFromIso(iso: string): string {
  return iso.slice(0, 7);
}

function currentMonthKey(): string {
  return mxToday().slice(0, 7);
}

function prevMonthKey(key: string): string {
  const [y, m] = key.split("-").map(Number);
  const d = new Date(y, m - 2, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(key: string): string {
  const [y, m] = key.split("-").map(Number);
  return new Intl.DateTimeFormat("es-MX", {
    month: "short",
    year: "2-digit",
    timeZone: MX_TZ,
  }).format(new Date(y, m - 1, 15));
}

export function orderPaymentTotal(order: PurchaseOrderDto): number {
  if (order.paymentRecords.length > 0) {
    return order.paymentRecords.reduce((s, r) => s + r.amount, 0);
  }
  return order.amountPaidSoFar;
}

export function latestPaymentDate(order: PurchaseOrderDto): string | null {
  if (order.paymentRecords.length > 0) {
    return order.paymentRecords[0].createdAt;
  }
  if (order.amountPaidSoFar > 0.01) return order.updatedAt;
  return null;
}

export function paymentsInMonth(orders: PurchaseOrderDto[], monthKey: string): number {
  let total = 0;
  for (const o of orders) {
    for (const r of o.paymentRecords) {
      if (monthKeyFromIso(r.createdAt) === monthKey) total += r.amount;
    }
    if (o.paymentRecords.length === 0 && o.amountPaidSoFar > 0 && monthKeyFromIso(o.updatedAt) === monthKey) {
      total += o.amountPaidSoFar;
    }
  }
  return total;
}

export function paymentsCountInMonth(orders: PurchaseOrderDto[], monthKey: string): number {
  let count = 0;
  for (const o of orders) {
    const inMonth = o.paymentRecords.filter((r) => monthKeyFromIso(r.createdAt) === monthKey);
    if (inMonth.length > 0) count += inMonth.length;
    else if (o.amountPaidSoFar > 0 && monthKeyFromIso(o.updatedAt) === monthKey) count += 1;
  }
  return count;
}

export function isPendingAuthorization(order: PurchaseOrderDto): boolean {
  return order.status === "awaitingPayment" || order.status === "awaitingPatyDeadline";
}

export function isActivePartial(order: PurchaseOrderDto): boolean {
  return (
    order.paymentType === "parcialidades" &&
    order.amountRemaining > 0.01 &&
    !["completed", "draft"].includes(order.status)
  );
}

export function direccionKpiCounts(orders: PurchaseOrderDto[]): Record<DireccionKpiKey, number> {
  const month = currentMonthKey();
  const pending = orders.filter(isPendingAuthorization);
  const partials = orders.filter(isActivePartial);

  return {
    gastoTotalMes: paymentsInMonth(orders, month),
    pagosPendientesAutorizar: pending.reduce(
      (s, o) => s + (o.amountRemaining > 0 ? o.amountRemaining : o.totalAmount),
      0
    ),
    pagosParcialesActivos: partials.length,
    pagosAutorizadosMes: paymentsInMonth(orders, month),
  };
}

export function kpiMonthGrowth(orders: PurchaseOrderDto[]): number | null {
  const cur = currentMonthKey();
  const prev = prevMonthKey(cur);
  const a = paymentsInMonth(orders, cur);
  const b = paymentsInMonth(orders, prev);
  if (b <= 0) return null;
  return Math.round(((a - b) / b) * 100);
}

export function authorizedPaymentsCountMonth(orders: PurchaseOrderDto[]): number {
  return paymentsCountInMonth(orders, currentMonthKey());
}

export function pendingAuthorizationCount(orders: PurchaseOrderDto[]): number {
  return orders.filter(isPendingAuthorization).length;
}

export function last6MonthsSpend(orders: PurchaseOrderDto[]): MonthlySpendPoint[] {
  const keys: string[] = [];
  let key = currentMonthKey();
  for (let i = 0; i < 6; i += 1) {
    keys.unshift(key);
    key = prevMonthKey(key);
  }
  return keys.map((k) => ({
    month: k,
    label: monthLabel(k),
    total: paymentsInMonth(orders, k),
  }));
}

export function spendByObraThisMonth(
  orders: PurchaseOrderDto[],
  obras: ObraDto[]
): ObraSpendSlice[] {
  const month = currentMonthKey();
  const byObra = new Map<string, number>();

  for (const o of orders) {
    let added = 0;
    for (const r of o.paymentRecords) {
      if (monthKeyFromIso(r.createdAt) === month) added += r.amount;
    }
    if (added === 0 && o.amountPaidSoFar > 0 && monthKeyFromIso(o.updatedAt) === month) {
      added = o.amountPaidSoFar;
    }
    if (added > 0) byObra.set(o.obraId, (byObra.get(o.obraId) ?? 0) + added);
  }

  const total = [...byObra.values()].reduce((s, v) => s + v, 0) || 1;
  const nameById = new Map(obras.map((o) => [o.id, o.name]));

  return [...byObra.entries()]
    .map(([obraId, amount]) => ({
      obraId,
      name: nameById.get(obraId) ?? "Obra",
      total: amount,
      pct: Math.round((amount / total) * 100),
    }))
    .sort((a, b) => b.total - a.total);
}

export function paymentSummary(orders: PurchaseOrderDto[]): PaymentSummary {
  const pending = orders.filter(isPendingAuthorization);
  const partials = orders.filter(isActivePartial);
  const paidOrders = orders.filter((o) => o.amountPaidSoFar > 0.01 || o.status === "paid" || o.status === "completed");

  const pagadoAmount = paidOrders.reduce((s, o) => s + orderPaymentTotal(o), 0);
  const pendienteAmount = pending.reduce(
    (s, o) => s + (o.amountRemaining > 0 ? o.amountRemaining : o.totalAmount),
    0
  );
  const parcialAmount = partials.reduce((s, o) => s + o.amountRemaining, 0);

  return {
    pagado: { amount: pagadoAmount, count: paidOrders.length },
    pendienteAutorizar: { amount: pendienteAmount, count: pending.length },
    enProcesoParciales: { amount: parcialAmount, count: partials.length },
    totalComprometido: pagadoAmount + pendienteAmount + parcialAmount,
  };
}

export function pendingAuthorizationOrders(orders: PurchaseOrderDto[], limit = 8): PurchaseOrderDto[] {
  return [...orders]
    .filter(isPendingAuthorization)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    .slice(0, limit);
}

export function activePartialOrders(orders: PurchaseOrderDto[], limit = 5): PurchaseOrderDto[] {
  return [...orders]
    .filter(isActivePartial)
    .sort((a, b) => {
      const da = a.paymentDueDate ?? a.updatedAt;
      const db = b.paymentDueDate ?? b.updatedAt;
      return new Date(da).getTime() - new Date(db).getTime();
    })
    .slice(0, limit);
}

export function topSuppliersThisMonth(orders: PurchaseOrderDto[], limit = 5): { name: string; total: number }[] {
  const month = currentMonthKey();
  const bySupplier = new Map<string, number>();

  for (const o of orders) {
    let added = 0;
    for (const r of o.paymentRecords) {
      if (monthKeyFromIso(r.createdAt) === month) added += r.amount;
    }
    if (added > 0) {
      const name = o.supplierName.trim() || "Sin proveedor";
      bySupplier.set(name, (bySupplier.get(name) ?? 0) + added);
    }
  }

  return [...bySupplier.entries()]
    .map(([name, total]) => ({ name, total }))
    .sort((a, b) => b.total - a.total)
    .slice(0, limit);
}

export function partialProgress(order: PurchaseOrderDto): { done: number; pct: number } {
  const pct = order.totalAmount > 0 ? Math.min(100, Math.round((order.amountPaidSoFar / order.totalAmount) * 100)) : 0;
  const done = order.paymentRecords.length || (order.amountPaidSoFar > 0 ? 1 : 0);
  return { done, pct };
}

function daysUntil(iso: string | null): number | null {
  if (!iso) return null;
  const due = iso.slice(0, 10);
  const today = mxToday();
  const d0 = new Date(`${today}T12:00:00`).getTime();
  const d1 = new Date(`${due}T12:00:00`).getTime();
  return Math.round((d1 - d0) / 86400000);
}

export function partialsDueSoon(orders: PurchaseOrderDto[], withinDays = 7): number {
  return orders.filter((o) => {
    if (!isActivePartial(o)) return false;
    const d = daysUntil(o.paymentDueDate);
    return d !== null && d >= 0 && d <= withinDays;
  }).length;
}

export function direccionAlerts(orders: PurchaseOrderDto[]): DireccionAlert[] {
  const pending = orders.filter(isPendingAuthorization);
  const pendingSum = pending.reduce(
    (s, o) => s + (o.amountRemaining > 0 ? o.amountRemaining : o.totalAmount),
    0
  );
  const dueSoon = partialsDueSoon(orders);
  const diffCount = orders.filter((o) => o.status === "difference").length;

  const alerts: DireccionAlert[] = [];

  if (pending.length > 0) {
    alerts.push({
      id: "pending-auth",
      tone: "red",
      message: `${pending.length} pago${pending.length === 1 ? "" : "s"} en cola de autorización / pago`,
      href: "/pagos",
    });
  }

  if (dueSoon > 0) {
    alerts.push({
      id: "partials-due",
      tone: "amber",
      message: `${dueSoon} pago${dueSoon === 1 ? "" : "s"} parcial${dueSoon === 1 ? "" : "es"} con fecha próxima`,
      href: "/pagos",
    });
  }

  if (diffCount > 0) {
    alerts.push({
      id: "differences",
      tone: "violet",
      message: `${diffCount} expediente${diffCount === 1 ? "" : "s"} con diferencia en contabilidad`,
      href: "/expedientes",
    });
  }

  if (pendingSum > 0 && pending.length > 0) {
    alerts[0] = {
      ...alerts[0],
      message: `${pending.length} pagos requieren seguimiento (monto en cola: revisar detalle)`,
    };
  }

  return alerts;
}

export const DONUT_COLORS = [
  "#7c3aed",
  "#2563eb",
  "#059669",
  "#d97706",
  "#64748b",
  "#db2777",
];
