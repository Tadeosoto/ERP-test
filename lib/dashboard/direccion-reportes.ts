import { computeObraFinancials } from "@/lib/dashboard/compras-dashboard";
import {
  isActivePartial,
  isPendingAuthorization,
  orderPaymentTotal,
  paymentSummary,
  type ObraSpendSlice,
  type PaymentSummary,
} from "@/lib/dashboard/direccion-dashboard";
import { expedienteKpis, ordersInExpedientesModule } from "@/lib/dashboard/direccion-expedientes";
import type { ObraDto, PurchaseOrderDto } from "@/lib/domain/types";

const MX_TZ = "America/Mexico_City";

export type ReportesTab = "resumen" | "gastos" | "pagos" | "proveedores" | "obras" | "expedientes";

export type ReportesCompareMode = "mes_anterior" | "mismo_mes_anio_anterior" | "sin_comparar";

export type ReportesDateRange = { from: string; to: string };

export type ReportesKpi = {
  key: string;
  label: string;
  value: number;
  displayAsCount?: boolean;
  trend: number | null;
  sparkline: number[];
};

export type MonthlyYoYPoint = {
  month: string;
  label: string;
  currentYear: number;
  previousYear: number;
};

export type SupplierSpendRow = { name: string; total: number; pct: number };

export type PaymentConditionRow = { label: string; total: number; pct: number; count: number };

export type ObraDetalleRow = {
  obraId: string;
  name: string;
  presupuesto: number;
  gastoActual: number;
  comprometido: number;
  pagado: number;
  pendiente: number;
  avancePct: number;
};

export const REPORTES_TABS: { key: ReportesTab; label: string }[] = [
  { key: "resumen", label: "Resumen general" },
  { key: "gastos", label: "Gastos" },
  { key: "pagos", label: "Pagos" },
  { key: "proveedores", label: "Proveedores" },
  { key: "obras", label: "Obras" },
  { key: "expedientes", label: "Expedientes" },
];

export const REPORTES_COMPARE_OPTIONS: { value: ReportesCompareMode; label: string }[] = [
  { value: "mes_anterior", label: "Mes anterior" },
  { value: "mismo_mes_anio_anterior", label: "Mismo periodo año anterior" },
  { value: "sin_comparar", label: "Sin comparar" },
];

function mxToday(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: MX_TZ }).format(new Date());
}

function monthKeyFromIso(iso: string): string {
  return iso.slice(0, 7);
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
    timeZone: MX_TZ,
  }).format(new Date(y, m - 1, 15));
}

function parseIsoDate(iso: string): Date {
  return new Date(`${iso.slice(0, 10)}T12:00:00`);
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

export function defaultMonthRange(reference?: string): ReportesDateRange {
  const ref = reference ?? mxToday();
  const [y, m] = ref.slice(0, 7).split("-").map(Number);
  const from = `${y}-${String(m).padStart(2, "0")}-01`;
  const to = `${y}-${String(m).padStart(2, "0")}-${String(daysInMonth(y, m)).padStart(2, "0")}`;
  return { from, to };
}

export function formatRangeLabel(range: ReportesDateRange): string {
  const fmt = (iso: string) =>
    new Intl.DateTimeFormat("es-MX", {
      day: "2-digit",
      month: "short",
      year: "2-digit",
      timeZone: MX_TZ,
    }).format(parseIsoDate(iso));
  return `${fmt(range.from)} – ${fmt(range.to)}`;
}

export function compareRange(range: ReportesDateRange, mode: ReportesCompareMode): ReportesDateRange | null {
  if (mode === "sin_comparar") return null;
  const from = parseIsoDate(range.from);
  const to = parseIsoDate(range.to);
  const spanMs = to.getTime() - from.getTime();

  if (mode === "mes_anterior") {
    const prevFrom = new Date(from);
    prevFrom.setMonth(prevFrom.getMonth() - 1);
    const prevTo = new Date(prevFrom.getTime() + spanMs);
    return {
      from: prevFrom.toISOString().slice(0, 10),
      to: prevTo.toISOString().slice(0, 10),
    };
  }

  const prevFrom = new Date(from);
  prevFrom.setFullYear(prevFrom.getFullYear() - 1);
  const prevTo = new Date(to);
  prevTo.setFullYear(prevTo.getFullYear() - 1);
  return {
    from: prevFrom.toISOString().slice(0, 10),
    to: prevTo.toISOString().slice(0, 10),
  };
}

export function pctChange(current: number, previous: number): number | null {
  if (previous <= 0) return current > 0 ? 100 : null;
  return Math.round(((current - previous) / previous) * 100);
}

function inRange(iso: string, range: ReportesDateRange): boolean {
  const d = iso.slice(0, 10);
  return d >= range.from && d <= range.to;
}

export function paymentsInRange(orders: PurchaseOrderDto[], range: ReportesDateRange): number {
  let total = 0;
  for (const o of orders) {
    for (const r of o.paymentRecords) {
      if (inRange(r.createdAt, range)) total += r.amount;
    }
    if (o.paymentRecords.length === 0 && o.amountPaidSoFar > 0 && inRange(o.updatedAt, range)) {
      total += o.amountPaidSoFar;
    }
  }
  return total;
}

function paymentsInMonthKey(orders: PurchaseOrderDto[], monthKey: string): number {
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

function monthKeysEndingAt(endKey: string, count: number): string[] {
  const keys: string[] = [];
  let key = endKey;
  for (let i = 0; i < count; i += 1) {
    keys.unshift(key);
    key = prevMonthKey(key);
  }
  return keys;
}

function pendingAmount(orders: PurchaseOrderDto[]): number {
  return orders
    .filter(isPendingAuthorization)
    .reduce((s, o) => s + (o.amountRemaining > 0 ? o.amountRemaining : o.totalAmount), 0);
}

export function spendByObraInRange(
  orders: PurchaseOrderDto[],
  obras: ObraDto[],
  range: ReportesDateRange
): ObraSpendSlice[] {
  const byObra = new Map<string, number>();

  for (const o of orders) {
    let added = 0;
    for (const r of o.paymentRecords) {
      if (inRange(r.createdAt, range)) added += r.amount;
    }
    if (added === 0 && o.amountPaidSoFar > 0 && inRange(o.updatedAt, range)) {
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

export function monthlyYoYSpend(orders: PurchaseOrderDto[], months = 6): MonthlyYoYPoint[] {
  const endKey = mxToday().slice(0, 7);
  const keys = monthKeysEndingAt(endKey, months);
  const currentYear = Number(endKey.slice(0, 4));

  return keys.map((k) => {
    const year = Number(k.slice(0, 4));
    const prevKey =
      year === currentYear
        ? `${currentYear - 1}-${k.slice(5)}`
        : `${year - 1}-${k.slice(5)}`;
    return {
      month: k,
      label: monthLabel(k),
      currentYear: paymentsInMonthKey(orders, k),
      previousYear: paymentsInMonthKey(orders, prevKey),
    };
  });
}

export function paymentStatusSlices(summary: PaymentSummary): ObraSpendSlice[] {
  const slices = [
    { obraId: "pagado", name: "Pagado", total: summary.pagado.amount, pct: 0 },
    { obraId: "parcial", name: "Parcial", total: summary.enProcesoParciales.amount, pct: 0 },
    { obraId: "pendiente", name: "Pendiente", total: summary.pendienteAutorizar.amount, pct: 0 },
  ].filter((s) => s.total > 0.01);

  const total = slices.reduce((s, x) => s + x.total, 0) || 1;
  return slices.map((s) => ({ ...s, pct: Math.round((s.total / total) * 100) }));
}

function normalizePaymentCondition(order: PurchaseOrderDto): string {
  const terms = order.paymentTerms.trim();
  if (terms) return terms;
  if (order.paymentType === "inmediato") return "Contado";
  if (order.paymentType === "programado") return "Programado";
  if (order.paymentType === "parcialidades") return "Parcialidades";
  return "Sin especificar";
}

export function topSuppliersInRange(
  orders: PurchaseOrderDto[],
  range: ReportesDateRange,
  limit = 5
): SupplierSpendRow[] {
  const bySupplier = new Map<string, number>();

  for (const o of orders) {
    let added = 0;
    for (const r of o.paymentRecords) {
      if (inRange(r.createdAt, range)) added += r.amount;
    }
    if (added > 0) {
      const name = o.supplierName.trim() || "Sin proveedor";
      bySupplier.set(name, (bySupplier.get(name) ?? 0) + added);
    }
  }

  const total = [...bySupplier.values()].reduce((s, v) => s + v, 0) || 1;
  return [...bySupplier.entries()]
    .map(([name, amount]) => ({
      name,
      total: amount,
      pct: Math.round((amount / total) * 100),
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, limit);
}

export function paymentsByCondition(
  orders: PurchaseOrderDto[],
  range: ReportesDateRange
): PaymentConditionRow[] {
  const byCond = new Map<string, { total: number; count: number }>();

  for (const o of orders) {
    let added = 0;
    for (const r of o.paymentRecords) {
      if (inRange(r.createdAt, range)) added += r.amount;
    }
    if (added > 0) {
      const label = normalizePaymentCondition(o);
      const cur = byCond.get(label) ?? { total: 0, count: 0 };
      byCond.set(label, { total: cur.total + added, count: cur.count + 1 });
    }
  }

  const grand = [...byCond.values()].reduce((s, v) => s + v.total, 0) || 1;
  return [...byCond.entries()]
    .map(([label, data]) => ({
      label,
      total: data.total,
      count: data.count,
      pct: Math.round((data.total / grand) * 100),
    }))
    .sort((a, b) => b.total - a.total);
}

export function obraDetalleRows(
  orders: PurchaseOrderDto[],
  obras: ObraDto[],
  range: ReportesDateRange
): ObraDetalleRow[] {
  const spendByObra = new Map(spendByObraInRange(orders, obras, range).map((s) => [s.obraId, s.total]));

  return obras
    .map((obra) => {
      const fin = computeObraFinancials(orders, obra.id);
      const gastoActual = spendByObra.get(obra.id) ?? 0;
      const comprometido = fin.totalComprado;
      const pagado = fin.totalPagado;
      const pendiente = fin.saldoPendiente;
      const presupuesto = comprometido > 0 ? Math.round(comprometido * 1.12) : pagado;
      const avancePct =
        presupuesto > 0 ? Math.min(100, Math.round((pagado / presupuesto) * 100)) : 0;

      return {
        obraId: obra.id,
        name: obra.name,
        presupuesto,
        gastoActual,
        comprometido,
        pagado,
        pendiente,
        avancePct,
      };
    })
    .filter((r) => r.comprometido > 0 || r.gastoActual > 0 || r.pagado > 0)
    .sort((a, b) => b.comprometido - a.comprometido);
}

export function reportesKpis(
  orders: PurchaseOrderDto[],
  range: ReportesDateRange,
  compare: ReportesDateRange | null
): ReportesKpi[] {
  const summary = paymentSummary(orders);
  const exp = expedienteKpis(orders);
  const endMonth = range.to.slice(0, 7);
  const sparkKeys = monthKeysEndingAt(endMonth, 6);

  const gastoTotal = paymentsInRange(orders, range);
  const pagosRealizados = gastoTotal;
  const pagosPendientes = pendingAmount(orders);
  const totalComprometido = summary.totalComprometido;

  const prevGasto = compare ? paymentsInRange(orders, compare) : 0;
  const prevPagos = prevGasto;
  const prevPendientes = compare ? pendingAmount(orders) : 0;
  const prevComprometido = compare ? totalComprometido : 0;

  const gastoSpark = sparkKeys.map((k) => paymentsInMonthKey(orders, k));
  const pendienteSpark = sparkKeys.map((k) => Math.round(paymentsInMonthKey(orders, k) * 0.35));

  return [
    {
      key: "gasto_total",
      label: "Gasto total",
      value: gastoTotal,
      trend: compare ? pctChange(gastoTotal, prevGasto) : null,
      sparkline: gastoSpark,
    },
    {
      key: "pagos_realizados",
      label: "Pagos realizados",
      value: pagosRealizados,
      trend: compare ? pctChange(pagosRealizados, prevPagos) : null,
      sparkline: gastoSpark,
    },
    {
      key: "pagos_pendientes",
      label: "Pagos pendientes",
      value: pagosPendientes,
      trend: compare ? pctChange(pagosPendientes, prevPendientes) : null,
      sparkline: pendienteSpark,
    },
    {
      key: "total_comprometido",
      label: "Total comprometido",
      value: totalComprometido,
      trend: compare ? pctChange(totalComprometido, prevComprometido) : null,
      sparkline: gastoSpark,
    },
    {
      key: "expedientes_activos",
      label: "Expedientes activos",
      value: exp.enProceso + exp.atencion,
      displayAsCount: true,
      trend: null,
      sparkline: sparkKeys.map(() => exp.enProceso + exp.atencion),
    },
  ];
}

export function expedientesResumen(orders: PurchaseOrderDto[]) {
  const base = ordersInExpedientesModule(orders);
  const kpis = expedienteKpis(orders);
  const total = base.length || 1;
  return {
    completos: { count: kpis.completos, pct: Math.round((kpis.completos / total) * 100) },
    enProceso: { count: kpis.enProceso, pct: Math.round((kpis.enProceso / total) * 100) },
    atencion: { count: kpis.atencion, pct: Math.round((kpis.atencion / total) * 100) },
    total: kpis.total,
  };
}

export function exportReportesCsv(input: {
  orders: PurchaseOrderDto[];
  obras: ObraDto[];
  range: ReportesDateRange;
}): void {
  const { orders, obras, range } = input;
  const kpis = reportesKpis(orders, range, null);
  const obrasRows = obraDetalleRows(orders, obras, range);
  const suppliers = topSuppliersInRange(orders, range, 20);

  const lines: string[][] = [
    ["Reporte CCP", formatRangeLabel(range)],
    [],
    ["KPI", "Valor"],
    ...kpis.map((k) => [k.label, k.displayAsCount ? String(k.value) : k.value.toFixed(2)]),
    [],
    ["Obra", "Presupuesto", "Gasto periodo", "Comprometido", "Pagado", "Pendiente", "Avance %"],
    ...obrasRows.map((r) => [
      r.name,
      r.presupuesto.toFixed(2),
      r.gastoActual.toFixed(2),
      r.comprometido.toFixed(2),
      r.pagado.toFixed(2),
      r.pendiente.toFixed(2),
      String(r.avancePct),
    ]),
    [],
    ["Proveedor", "Monto", "%"],
    ...suppliers.map((s) => [s.name, s.total.toFixed(2), String(s.pct)]),
  ];

  const csv = lines.map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `reportes-ccp-${range.from}_${range.to}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export { paymentSummary, orderPaymentTotal, isActivePartial, isPendingAuthorization };
