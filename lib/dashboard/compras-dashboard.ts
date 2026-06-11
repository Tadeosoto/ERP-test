import type { OrderStatus, PurchaseOrderDto } from "@/lib/domain/types";

export type ComprasOrderTab =
  | "all"
  | "aprobar"
  | "pago"
  | "factura"
  | "completadas"
  | "rechazadas";

export const COMPRAS_TAB_STATUSES: Record<Exclude<ComprasOrderTab, "all">, OrderStatus[]> = {
  aprobar: ["awaitingEngineer"],
  pago: ["awaitingPatyDeadline", "awaitingPayment"],
  factura: ["paid", "awaitingInvoice", "invoiceReceived", "difference"],
  completadas: ["completed"],
  rechazadas: ["engineerRejected"],
};

export type ComprasKpiKey = "aprobar" | "pago" | "factura" | "completadas";

export type ComprasKpiCounts = Record<ComprasKpiKey, number>;

export function comprasKpiCounts(orders: PurchaseOrderDto[]): ComprasKpiCounts {
  const now = new Date();
  const month = now.getMonth();
  const year = now.getFullYear();

  let aprobar = 0;
  let pago = 0;
  let factura = 0;
  let completadas = 0;

  for (const o of orders) {
    if (o.status === "awaitingEngineer") aprobar++;
    if (o.status === "awaitingPatyDeadline" || o.status === "awaitingPayment") pago++;
    if (
      o.status === "paid" ||
      o.status === "awaitingInvoice" ||
      o.status === "invoiceReceived" ||
      o.status === "difference"
    ) {
      factura++;
    }
    if (o.status === "completed") {
      const d = new Date(o.updatedAt);
      if (d.getMonth() === month && d.getFullYear() === year) completadas++;
    }
  }

  return { aprobar, pago, factura, completadas };
}

export function comprasTabCounts(orders: PurchaseOrderDto[]): Record<ComprasOrderTab, number> {
  const kpis = comprasKpiCounts(orders);
  let rechazadas = 0;
  for (const o of orders) {
    if (o.status === "engineerRejected") rechazadas++;
  }
  return {
    all: orders.length,
    aprobar: kpis.aprobar,
    pago: kpis.pago,
    factura: kpis.factura,
    completadas: orders.filter((o) => o.status === "completed").length,
    rechazadas,
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

  if (input.tab !== "all") {
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
      const hay = `${o.title} ${o.supplierName} ${o.obraName} ${o.id}`.toLowerCase();
      return hay.includes(q);
    });
  }

  return result.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export function orderDisplayCode(order: PurchaseOrderDto): string {
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
  aprobar: "Pendientes aprobación",
  pago: "Pendientes pago",
  factura: "Pendientes factura",
  completadas: "Completadas",
  rechazadas: "Rechazadas",
};

/** Etiqueta corta para pestañas/KPI (sin «Todos los estados»). */
export const COMPRAS_TAB_SHORT_LABEL: Record<ComprasOrderTab, string> = {
  all: "Todas",
  aprobar: "Pendientes aprobación",
  pago: "Pendientes pago",
  factura: "Pendientes factura",
  completadas: "Completadas",
  rechazadas: "Rechazadas",
};

export const COMPRAS_ESTADO_OPTIONS: { value: ComprasOrderTab; label: string }[] = (
  ["all", "aprobar", "pago", "factura", "completadas", "rechazadas"] as ComprasOrderTab[]
).map((value) => ({ value, label: COMPRAS_TAB_LABEL[value] }));

export const COMPRAS_KPI_CONFIG: {
  key: ComprasKpiKey;
  tab: ComprasOrderTab;
  label: string;
  sublabel: string;
  accent: string;
  iconBg: string;
  linkClass: string;
}[] = [
  {
    key: "aprobar",
    tab: "aprobar",
    label: "Pendiente aprobación",
    sublabel: "OC en ingeniería",
    accent: "border-l-orange-400 bg-orange-50/40",
    iconBg: "bg-orange-100 text-orange-700",
    linkClass: "text-orange-700",
  },
  {
    key: "pago",
    tab: "pago",
    label: "Pendiente pago",
    sublabel: "OC en administración",
    accent: "border-l-amber-400 bg-amber-50/40",
    iconBg: "bg-amber-100 text-amber-800",
    linkClass: "text-amber-800",
  },
  {
    key: "factura",
    tab: "factura",
    label: "Pendiente factura",
    sublabel: "OC en expediente",
    accent: "border-l-violet-400 bg-violet-50/35",
    iconBg: "bg-violet-100 text-violet-800",
    linkClass: "text-violet-800",
  },
  {
    key: "completadas",
    tab: "completadas",
    label: "Completadas",
    sublabel: "Este mes",
    accent: "border-l-emerald-400 bg-emerald-50/35",
    iconBg: "bg-emerald-100 text-emerald-800",
    linkClass: "text-emerald-800",
  },
];
