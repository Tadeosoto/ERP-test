import { canUploadInvoice } from "@/lib/domain/transitions";
import type { ObraDto, PurchaseOrderDto, Role } from "@/lib/domain/types";

export type ContabilidadHomeKpiKey =
  | "pagosRealizados"
  | "pagosPendientes"
  | "expedientesConsultados"
  | "obrasActivas";

const POST_PAYMENT_STATUSES: PurchaseOrderDto["status"][] = [
  "paid",
  "awaitingInvoice",
  "invoiceReceived",
  "completed",
  "difference",
];

export function orderHasPayment(order: PurchaseOrderDto): boolean {
  return order.amountPaidSoFar > 0.01 || POST_PAYMENT_STATUSES.includes(order.status);
}

export function latestPaymentDate(order: PurchaseOrderDto): string | null {
  if (order.paymentRecords.length > 0) {
    return order.paymentRecords[0].createdAt;
  }
  if (order.amountPaidSoFar > 0.01) return order.updatedAt;
  return null;
}

export function contabilidadHomeKpiCounts(input: {
  orders: PurchaseOrderDto[];
  obras: ObraDto[];
}): Record<ContabilidadHomeKpiKey, number> {
  const pagosRealizados = input.orders.filter((o) => orderHasPayment(o)).length;
  const pagosPendientes = input.orders.filter(
    (o) => o.status === "awaitingPayment" || o.status === "awaitingPatyDeadline"
  ).length;
  const expedientesConsultados = input.orders.filter(
    (o) => o.files.some((f) => f.kind === "oc_pdf") && orderHasPayment(o)
  ).length;

  return {
    pagosRealizados,
    pagosPendientes,
    expedientesConsultados,
    obrasActivas: input.obras.filter((o) => o.active).length,
  };
}

export const CONTABILIDAD_HOME_KPI_CONFIG: {
  key: ContabilidadHomeKpiKey;
  label: string;
  sublabel: string;
  accent: string;
  iconBg: string;
  href: string;
  linkClass: string;
  icon: "payDone" | "payPending" | "folder" | "obras";
}[] = [
  {
    key: "pagosRealizados",
    label: "Pagos realizados",
    sublabel: "OC con pago registrado",
    accent: "border-l-emerald-400 bg-emerald-50/35",
    iconBg: "bg-emerald-100 text-emerald-800",
    href: "/obras?estado=pago",
    linkClass: "text-emerald-800",
    icon: "payDone",
  },
  {
    key: "pagosPendientes",
    label: "Pagos pendientes",
    sublabel: "OC en cola de pago",
    accent: "border-l-orange-400 bg-orange-50/40",
    iconBg: "bg-orange-100 text-orange-700",
    href: "/obras?estado=pago",
    linkClass: "text-orange-700",
    icon: "payPending",
  },
  {
    key: "expedientesConsultados",
    label: "Expedientes consultados",
    sublabel: "OC con expediente documental",
    accent: "border-l-violet-400 bg-violet-50/35",
    iconBg: "bg-violet-100 text-violet-800",
    href: "/obras",
    linkClass: "text-violet-800",
    icon: "folder",
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

export function recentPaidOrders(orders: PurchaseOrderDto[], limit = 5): PurchaseOrderDto[] {
  return [...orders]
    .filter((o) => orderHasPayment(o))
    .sort((a, b) => {
      const da = latestPaymentDate(a);
      const db = latestPaymentDate(b);
      if (!da && !db) return 0;
      if (!da) return 1;
      if (!db) return -1;
      return new Date(db).getTime() - new Date(da).getTime();
    })
    .slice(0, limit);
}

export function pendingPaymentOrders(orders: PurchaseOrderDto[], limit = 5): PurchaseOrderDto[] {
  return [...orders]
    .filter((o) => o.status === "awaitingPayment")
    .sort((a, b) => {
      const da = a.paymentDueDate ?? a.createdAt;
      const db = b.paymentDueDate ?? b.createdAt;
      return new Date(da).getTime() - new Date(db).getTime();
    })
    .slice(0, limit);
}

export function obrasConMasPagosMes(
  orders: PurchaseOrderDto[],
  limit = 3
): { obraId: string; name: string; count: number; total: number; currency: string }[] {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const byObra = new Map<
    string,
    { name: string; count: number; total: number; currency: string }
  >();

  for (const o of orders) {
    if (!orderHasPayment(o)) continue;
    const payDate = latestPaymentDate(o);
    if (!payDate || new Date(payDate) < monthStart) continue;
    const row = byObra.get(o.obraId) ?? {
      name: o.obraName,
      count: 0,
      total: 0,
      currency: o.currency,
    };
    row.count += 1;
    row.total += o.amountPaidSoFar > 0 ? o.amountPaidSoFar : o.totalAmount;
    byObra.set(o.obraId, row);
  }

  return [...byObra.entries()]
    .map(([obraId, row]) => ({ obraId, ...row }))
    .sort((a, b) => b.total - a.total)
    .slice(0, limit);
}

export function proveedoresFrecuentes(
  orders: PurchaseOrderDto[],
  limit = 3
): { name: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const o of orders) {
    if (!orderHasPayment(o)) continue;
    const name = o.supplierName.trim() || "Sin proveedor";
    counts.set(name, (counts.get(name) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

export function documentosRecientes(
  orders: PurchaseOrderDto[],
  limit = 3
): { id: string; label: string; sub: string; at: string }[] {
  return [...orders]
    .filter((o) => o.files.length > 0)
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, limit)
    .map((o) => ({
      id: o.id,
      label: o.ocFolio ? `${o.ocFolio} · ${o.supplierName}` : `${o.title} · ${o.supplierName}`,
      sub: o.obraName,
      at: o.updatedAt,
    }));
}

export function contabilidadPrimaryAction(
  order: PurchaseOrderDto,
  role: Role
): { label: string; href: string; showDropdown: boolean } {
  if (canUploadInvoice(order.status, role)) {
    return {
      label: "Subir factura",
      href: `/ordenes/${order.id}#tarea`,
      showDropdown: true,
    };
  }
  return {
    label: "Ver expediente",
    href: `/ordenes/${order.id}`,
    showDropdown: true,
  };
}

export function filterExpedienteSearch(orders: PurchaseOrderDto[], query: string): PurchaseOrderDto[] {
  const q = query
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "");
  if (!q) return orders;
  return orders.filter((o) => {
    const haystack = [
      o.title,
      o.supplierName,
      o.obraName,
      o.ocFolio,
      o.createdByName,
    ]
      .join(" ")
      .toLowerCase()
      .normalize("NFD")
      .replace(/\p{M}/gu, "");
    return haystack.includes(q);
  });
}
