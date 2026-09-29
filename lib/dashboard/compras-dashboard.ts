import type { OrderStatus, PurchaseOrderDto } from "@/lib/domain/types";
import { paymentBasisTotal } from "@/lib/domain/order-fx";

export type ComprasOrderTab =
  | "all"
  | "aprobar"
  | "pago"
  | "factura"
  | "diferencias"
  | "completadas"
  | "rechazadas"
  | "borrador"
  | "vencidas";

export type DueUrgency = "overdue" | "soon";

/** Día civil en hora de México, el mismo que muestra «Límite de pago». */
function mexicoDay(iso: string | null | undefined, now?: Date): string | null {
  const d = now ?? (iso ? new Date(iso) : null);
  if (!d || Number.isNaN(d.getTime())) return null;
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Mexico_City" }).format(d);
}

function daysFromToday(due: string, now = new Date()): number {
  const today = mexicoDay(null, now);
  if (!today) return 99;
  const a = Date.parse(`${today}T00:00:00Z`);
  const b = Date.parse(`${due}T00:00:00Z`);
  return Math.round((b - a) / 86_400_000);
}

function addCalendarDays(yyyyMmDd: string, days: number): string {
  const [y, m, d] = yyyyMmDd.split("-").map(Number);
  const utc = new Date(Date.UTC(y, m - 1, d));
  utc.setUTCDate(utc.getUTCDate() + days);
  return utc.toISOString().slice(0, 10);
}

/** Fecha de límite de pago, si Compras ya la fijó. */
export function orderPaymentDueDay(order: PurchaseOrderDto): string | null {
  return mexicoDay(order.paymentDueDate);
}

/** Plazo a N días contado desde la fecha de creación. «A 30 días» son 30. */
function termDueDay(order: PurchaseOrderDto): string | null {
  const start = mexicoDay(order.createdAt);
  if (!start) return null;
  if (order.paymentType === "programado") return addCalendarDays(start, 30);
  const terms = order.paymentTerms.trim().toLowerCase();
  if (terms.includes("después") || terms.includes("factura")) return null;
  const match = terms.match(/^(\d+)\s*d[ií]as?\b/);
  if (!match) return null;
  return addCalendarDays(start, Number(match[1]));
}

function urgencyForDueDay(due: string, now: Date): DueUrgency | null {
  const left = daysFromToday(due, now);
  if (left < 0) return "overdue";
  if (left <= 3) return "soon";
  return null;
}

/** Órdenes por pagar: ya vencidas, o a las que les faltan 3 días o menos. */
export function orderDueUrgency(order: PurchaseOrderDto, now = new Date()): DueUrgency | null {
  if (order.status === "draft" || order.status === "completed") return null;
  if (order.amountRemaining <= 0.01) return null;
  const marks = [orderPaymentDueDay(order), termDueDay(order)]
    .filter((due): due is string => Boolean(due))
    .map((due) => urgencyForDueDay(due, now));
  if (marks.includes("overdue")) return "overdue";
  if (marks.includes("soon")) return "soon";
  return null;
}

export const DUE_URGENCY_LABEL: Record<DueUrgency, string> = {
  overdue: "Vencidas",
  soon: "A punto de vencer",
};

export const COMPRAS_TAB_STATUSES: Record<Exclude<ComprasOrderTab, "all" | "vencidas">, OrderStatus[]> = {
  aprobar: ["awaitingEngineer"],
  pago: ["awaitingAuthorization", "awaitingPatyDeadline", "awaitingPayment"],
  factura: ["paid", "awaitingInvoice"],
  diferencias: ["difference"],
  completadas: ["completed"],
  rechazadas: ["engineerRejected"],
  borrador: ["draft"],
};

export type ComprasKpiKey = "aprobar" | "pago" | "factura" | "diferencias" | "completadas";

export type ComprasKpiCounts = Record<ComprasKpiKey, number>;

export function comprasKpiCounts(orders: PurchaseOrderDto[]): ComprasKpiCounts {
  const now = new Date();
  const month = now.getMonth();
  const year = now.getFullYear();

  let aprobar = 0;
  let pago = 0;
  let factura = 0;
  let diferencias = 0;
  let completadas = 0;

  for (const o of orders) {
    if (o.status === "awaitingEngineer") aprobar++;
    if (
      o.status === "awaitingPatyDeadline" ||
      o.status === "awaitingAuthorization" ||
      o.status === "awaitingPayment"
    ) {
      pago++;
    }
    if (o.status === "paid" || o.status === "awaitingInvoice") factura++;
    if (o.status === "difference") diferencias++;
    if (o.status === "completed") {
      const d = new Date(o.updatedAt);
      if (d.getMonth() === month && d.getFullYear() === year) completadas++;
    }
  }

  return { aprobar, pago, factura, diferencias, completadas };
}

export function comprasTabCounts(orders: PurchaseOrderDto[]): Record<ComprasOrderTab, number> {
  const kpis = comprasKpiCounts(orders);
  let rechazadas = 0;
  let borrador = 0;
  for (const o of orders) {
    if (o.status === "engineerRejected") rechazadas++;
    if (o.status === "draft") borrador++;
  }
  return {
    all: orders.length,
    aprobar: kpis.aprobar,
    pago: kpis.pago,
    factura: kpis.factura,
    diferencias: kpis.diferencias,
    completadas: orders.filter((o) => o.status === "completed").length,
    rechazadas,
    borrador,
    vencidas: orders.filter((o) => orderDueUrgency(o) != null).length,
  };
}

export function filterComprasOrders(input: {
  orders: PurchaseOrderDto[];
  tab: ComprasOrderTab;
  search: string;
  obraId: string;
  dateFrom: string;
  dateTo: string;
}): PurchaseOrderDto[] {
  let result = [...input.orders];

  if (input.tab === "vencidas") {
    result = result.filter((o) => orderDueUrgency(o) != null);
  } else if (input.tab !== "all") {
    const statuses = COMPRAS_TAB_STATUSES[input.tab];
    result = result.filter((o) => statuses.includes(o.status));
  }

  if (input.obraId !== "all") {
    result = result.filter((o) => o.obraId === input.obraId);
  }

  if (input.dateFrom) {
    const from = new Date(input.dateFrom);
    from.setHours(0, 0, 0, 0);
    result = result.filter((o) => new Date(o.createdAt) >= from);
  }

  if (input.dateTo) {
    const to = new Date(input.dateTo);
    to.setHours(23, 59, 59, 999);
    result = result.filter((o) => new Date(o.createdAt) <= to);
  }

  const q = input.search.trim().toLowerCase();
  if (q) {
    result = result.filter((o) => {
      const hay = `${o.title} ${o.supplierName} ${o.obraName} ${o.id} ${o.ocFolio}`.toLowerCase();
      return hay.includes(q);
    });
  }

  return result.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export function orderDisplayCode(order: PurchaseOrderDto): string {
  if (order.ocFolio.trim()) return order.ocFolio.trim();
  const suffix = order.id.replace(/-/g, "").slice(-5).toUpperCase();
  return `OC-${suffix}`;
}

export function daysInStage(updatedAt: string): number {
  const ms = Date.now() - new Date(updatedAt).getTime();
  return Math.max(0, Math.floor(ms / 86_400_000));
}

export function hasOcPdf(order: PurchaseOrderDto): boolean {
  return order.files.some((f) => f.kind === "oc_pdf");
}

export const COMPRAS_TAB_LABEL: Record<ComprasOrderTab, string> = {
  all: "Todos los estados",
  aprobar: "Pendiente aprobación",
  pago: "Pendiente pago",
  factura: "Pendiente factura",
  diferencias: "Diferencias detectadas",
  completadas: "Completadas",
  rechazadas: "Corrección solicitada",
  borrador: "Borrador",
  vencidas: "Vencidas",
};

export const COMPRAS_TAB_SHORT_LABEL: Record<ComprasOrderTab, string> = {
  all: "Todas",
  aprobar: "Pendiente aprobación",
  pago: "Pendiente pago",
  factura: "Pendiente factura",
  diferencias: "Diferencias",
  completadas: "Completadas",
  rechazadas: "Corrección solicitada",
  borrador: "Borrador",
  vencidas: "Vencidas",
};

export const COMPRAS_ESTADO_OPTIONS: { value: ComprasOrderTab; label: string }[] = (
  [
    "all",
    "aprobar",
    "rechazadas",
    "pago",
    "vencidas",
    "factura",
    "diferencias",
    "completadas",
    "borrador",
  ] as ComprasOrderTab[]
).map((value) => ({ value, label: COMPRAS_TAB_LABEL[value] }));

export const COMPRAS_KPI_CONFIG: {
  key: ComprasKpiKey;
  tab: ComprasOrderTab;
  label: string;
  sublabel: string;
  accent: string;
  iconBg: string;
  linkClass: string;
  icon: "clock" | "banknote" | "document" | "check" | "alert";
}[] = [
  {
    key: "aprobar",
    tab: "aprobar",
    label: "En revisión Ingeniería",
    sublabel: "Esperando firma del ingeniero",
    accent: "border-l-orange-400 bg-orange-50/40",
    iconBg: "bg-orange-100 text-orange-700",
    linkClass: "text-orange-700",
    icon: "clock",
  },
  {
    key: "pago",
    tab: "pago",
    label: "Listo / por autorizar",
    sublabel: "Admin o Dirección",
    accent: "border-l-amber-400 bg-amber-50/40",
    iconBg: "bg-amber-100 text-amber-800",
    linkClass: "text-amber-800",
    icon: "banknote",
  },
  {
    key: "factura",
    tab: "factura",
    label: "Tras el pago",
    sublabel: "Factura / documentos",
    accent: "border-l-violet-400 bg-violet-50/35",
    iconBg: "bg-violet-100 text-violet-800",
    linkClass: "text-violet-800",
    icon: "document",
  },
  {
    key: "diferencias",
    tab: "diferencias",
    label: "Diferencias detectadas",
    sublabel: "OC con diferencias",
    accent: "border-l-red-400 bg-red-50/35",
    iconBg: "bg-red-100 text-red-800",
    linkClass: "text-red-800",
    icon: "alert",
  },
  {
    key: "completadas",
    tab: "completadas",
    label: "Completadas",
    sublabel: "Este mes",
    accent: "border-l-emerald-400 bg-emerald-50/35",
    iconBg: "bg-emerald-100 text-emerald-800",
    linkClass: "text-emerald-800",
    icon: "check",
  },
];

export function computeObraFinancials(
  orders: PurchaseOrderDto[],
  obraId: string
): {
  /** Totales en MXN (OC en USD usan totalAmountMxn / Banxico). */
  totalComprado: number;
  totalPagado: number;
  saldoPendiente: number;
  facturasPendientes: number;
} {
  const obraOrders = orders.filter((o) => o.obraId === obraId && o.status !== "draft");
  const totalComprado = obraOrders.reduce((s, o) => s + paymentBasisTotal(o), 0);
  const totalPagado = obraOrders.reduce((s, o) => s + o.amountPaidSoFar, 0);
  const saldoPendiente = Math.max(0, totalComprado - totalPagado);
  const facturasPendientes = obraOrders.filter((o) => {
    const basis = paymentBasisTotal(o);
    return (
      o.amountPaidSoFar >= basis - 0.01 &&
      !o.files.some((f) => f.kind === "factura") &&
      o.status !== "completed"
    );
  }).length;
  return { totalComprado, totalPagado, saldoPendiente, facturasPendientes };
}
