import type { ObraDto, PurchaseOrderDto, SupplierDto } from "@/lib/domain/types";

export type PagosHomeKpiKey =
  | "pagosPorRealizar"
  | "programadosHoy"
  | "comprobantesPendientes"
  | "proveedoresActivos"
  | "obrasActivas";

export type PagosPaymentDisplayStatus =
  | "pendiente_pago"
  | "aprobado_ing"
  | "programado"
  | "pagado"
  | "comprobante_pendiente";

export function hasPaymentReceipt(order: PurchaseOrderDto): boolean {
  return order.files.some((f) => f.kind === "comprobante_pago");
}

function todayMx(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Mexico_City" }).format(new Date());
}

function datePart(iso: string | null): string | null {
  if (!iso) return null;
  return iso.slice(0, 10);
}

export function isPagosQueueOrder(order: PurchaseOrderDto): boolean {
  if (order.status === "awaitingPayment" || order.status === "awaitingPatyDeadline") return true;
  if (order.status === "paid" && !hasPaymentReceipt(order)) return true;
  return false;
}

export function pagosPaymentDisplayStatus(order: PurchaseOrderDto): PagosPaymentDisplayStatus {
  if (order.status === "awaitingPatyDeadline") return "aprobado_ing";
  if (order.status === "paid") {
    return hasPaymentReceipt(order) ? "pagado" : "comprobante_pendiente";
  }
  if (order.status === "awaitingPayment") {
    const due = datePart(order.paymentDueDate);
    const today = todayMx();
    if (due && due > today) return "programado";
    return "pendiente_pago";
  }
  return "pendiente_pago";
}

export const PAGOS_PAYMENT_STATUS_LABEL: Record<PagosPaymentDisplayStatus, string> = {
  pendiente_pago: "Pendiente pago",
  aprobado_ing: "Aprobado (Ing.)",
  programado: "Programado",
  pagado: "Pagado",
  comprobante_pendiente: "Comprobante pend.",
};

export const PAGOS_PAYMENT_STATUS_TONE: Record<PagosPaymentDisplayStatus, string> = {
  pendiente_pago: "bg-orange-100 text-orange-800 ring-orange-200/80",
  aprobado_ing: "bg-amber-100 text-amber-900 ring-amber-200/80",
  programado: "bg-sky-100 text-sky-800 ring-sky-200/80",
  pagado: "bg-emerald-100 text-emerald-800 ring-emerald-200/80",
  comprobante_pendiente: "bg-teal-100 text-teal-800 ring-teal-200/80",
};

export function pagosHomeKpiCounts(input: {
  orders: PurchaseOrderDto[];
  suppliers: SupplierDto[];
  obras: ObraDto[];
}) {
  const today = todayMx();

  const pagosPorRealizar = input.orders.filter((o) => o.status === "awaitingPayment").length;

  const programadosHoy = input.orders.filter((o) => {
    if (o.status !== "awaitingPayment") return false;
    const due = datePart(o.paymentDueDate);
    return due === today;
  }).length;

  const comprobantesPendientes = input.orders.filter(
    (o) => o.amountPaidSoFar > 0.01 && !hasPaymentReceipt(o)
  ).length;

  return {
    pagosPorRealizar,
    programadosHoy,
    comprobantesPendientes,
    proveedoresActivos: input.suppliers.filter((s) => s.active).length,
    obrasActivas: input.obras.filter((o) => o.active).length,
  };
}

export const PAGOS_HOME_KPI_CONFIG: {
  key: PagosHomeKpiKey;
  label: string;
  sublabel: string;
  accent: string;
  iconBg: string;
  href: string;
  linkClass: string;
  icon: "pay" | "calendar" | "receipt" | "suppliers" | "obras";
}[] = [
  {
    key: "pagosPorRealizar",
    label: "Pagos por realizar",
    sublabel: "OC listas para registrar pago",
    accent: "border-l-orange-400 bg-orange-50/35",
    iconBg: "bg-orange-100 text-orange-700",
    href: "/ordenes",
    linkClass: "text-orange-700",
    icon: "pay",
  },
  {
    key: "programadosHoy",
    label: "Pagos programados hoy",
    sublabel: "Fecha compromiso es hoy",
    accent: "border-l-amber-400 bg-amber-50/40",
    iconBg: "bg-amber-100 text-amber-800",
    href: "/ordenes",
    linkClass: "text-amber-800",
    icon: "calendar",
  },
  {
    key: "comprobantesPendientes",
    label: "Comprobantes pendientes",
    sublabel: "Pagos sin comprobante bancario",
    accent: "border-l-emerald-400 bg-emerald-50/30",
    iconBg: "bg-emerald-100 text-emerald-800",
    href: "/ordenes",
    linkClass: "text-emerald-800",
    icon: "receipt",
  },
  {
    key: "proveedoresActivos",
    label: "Proveedores activos",
    sublabel: "Catálogo del sistema",
    accent: "border-l-violet-400 bg-violet-50/35",
    iconBg: "bg-violet-100 text-violet-800",
    href: "/proveedores",
    linkClass: "text-violet-800",
    icon: "suppliers",
  },
  {
    key: "obrasActivas",
    label: "Obras activas",
    sublabel: "Proyectos en curso",
    accent: "border-l-sky-400 bg-sky-50/35",
    iconBg: "bg-sky-100 text-sky-800",
    href: "/obras",
    linkClass: "text-sky-800",
    icon: "obras",
  },
];

export function filterPagosQueueOrders(input: {
  orders: PurchaseOrderDto[];
  search: string;
  obraId: string;
  supplier: string;
  estado: string;
}) {
  const q = input.search.trim().toLowerCase();

  return input.orders
    .filter(isPagosQueueOrder)
    .filter((o) => {
      if (input.estado === "all") return true;
      if (input.estado === "pendiente") return pagosPaymentDisplayStatus(o) === "pendiente_pago";
      if (input.estado === "programado") {
        const s = pagosPaymentDisplayStatus(o);
        return s === "programado" || s === "aprobado_ing";
      }
      if (input.estado === "comprobante") return pagosPaymentDisplayStatus(o) === "comprobante_pendiente";
      return true;
    })
    .filter((o) => (input.obraId === "all" ? true : o.obraId === input.obraId))
    .filter((o) =>
      input.supplier === "all" ? true : o.supplierName.toLowerCase() === input.supplier.toLowerCase()
    )
    .filter((o) => {
      if (!q) return true;
      const hay = `${o.ocFolio} ${o.title} ${o.supplierName} ${o.obraName} ${o.id}`.toLowerCase();
      return hay.includes(q);
    })
    .sort((a, b) => {
      const priority = (o: PurchaseOrderDto) => {
        if (o.status === "awaitingPayment") return 0;
        if (o.status === "awaitingPatyDeadline") return 1;
        return 2;
      };
      const pa = priority(a);
      const pb = priority(b);
      if (pa !== pb) return pa - pb;
      const da = datePart(a.paymentDueDate) ?? "9999-12-31";
      const db = datePart(b.paymentDueDate) ?? "9999-12-31";
      return da.localeCompare(db);
    });
}

export function obrasConPagosPendientes(orders: PurchaseOrderDto[], limit = 3) {
  const map = new Map<string, { obraId: string; name: string; count: number; total: number; currency: string }>();

  for (const o of orders) {
    if (o.status !== "awaitingPayment" && o.status !== "awaitingPatyDeadline") continue;
    const prev = map.get(o.obraId);
    const amount = o.status === "awaitingPayment" ? o.amountRemaining : o.totalAmount;
    if (prev) {
      prev.count += 1;
      prev.total += amount;
    } else {
      map.set(o.obraId, {
        obraId: o.obraId,
        name: o.obraName,
        count: 1,
        total: amount,
        currency: o.currency,
      });
    }
  }

  return [...map.values()].sort((a, b) => b.total - a.total).slice(0, limit);
}

export function pagosPrimaryAction(order: PurchaseOrderDto): {
  label: string;
  href: string;
  showDropdown: boolean;
} {
  const base = `/ordenes/${order.id}`;
  const display = pagosPaymentDisplayStatus(order);

  if (display === "pagado") {
    return { label: "Ver pago", href: `${base}#pagos`, showDropdown: false };
  }

  if (
    order.status === "awaitingPayment" ||
    order.status === "awaitingPatyDeadline" ||
    display === "comprobante_pendiente"
  ) {
    return {
      label: display === "comprobante_pendiente" ? "Ver pago" : "Registrar pago",
      href: `${base}#pagos`,
      showDropdown: display !== "comprobante_pendiente",
    };
  }

  return { label: "Expediente", href: base, showDropdown: true };
}
