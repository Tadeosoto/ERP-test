import { STATUS_LABEL } from "@/lib/domain/labels";
import { FILE_KIND_LABEL } from "@/lib/domain/labels";
import type { PurchaseOrderDto } from "@/lib/domain/types";
import { isPendingAuthorization, isActivePartial } from "@/lib/dashboard/direccion-dashboard";

export type ExpedienteTab = "todos" | "completos" | "en_proceso" | "atencion";

export type ExpedienteEstatus =
  | "completado"
  | "parcial"
  | "en_proceso"
  | "pendiente"
  | "requiere_atencion";

export type ExpedienteFilters = {
  obraId: string;
  supplier: string;
  estatus: string;
  dateFrom: string;
  dateTo: string;
  search: string;
};

export const EXPEDIENTE_TABS: { key: ExpedienteTab; label: string }[] = [
  { key: "todos", label: "Todos" },
  { key: "completos", label: "Completos" },
  { key: "en_proceso", label: "En proceso" },
  { key: "atencion", label: "Requieren atención" },
];

export const EXPEDIENTE_ESTATUS_OPTIONS: { value: ExpedienteEstatus | ""; label: string }[] = [
  { value: "", label: "Todos" },
  { value: "completado", label: "Completado" },
  { value: "parcial", label: "Parcial" },
  { value: "en_proceso", label: "En proceso" },
  { value: "pendiente", label: "Pendiente" },
  { value: "requiere_atencion", label: "Requiere atención" },
];

export const EXPEDIENTE_ESTATUS_LABEL: Record<ExpedienteEstatus, string> = {
  completado: "Completado",
  parcial: "Parcial",
  en_proceso: "En proceso",
  pendiente: "Pendiente",
  requiere_atencion: "Requiere atención",
};

export const EXPEDIENTE_ESTATUS_TONE: Record<ExpedienteEstatus, string> = {
  completado: "bg-emerald-100 text-emerald-800 ring-emerald-200/80",
  parcial: "bg-blue-100 text-blue-800 ring-blue-200/80",
  en_proceso: "bg-sky-100 text-sky-800 ring-sky-200/80",
  pendiente: "bg-orange-100 text-orange-800 ring-orange-200/80",
  requiere_atencion: "bg-red-100 text-red-800 ring-red-200/80",
};

export const EXPEDIENTE_PROCESS_STEPS = [
  { key: "oc", label: "OC creada" },
  { key: "aprobada", label: "Aprobada" },
  { key: "pagos", label: "Pago(s)" },
  { key: "factura", label: "Factura" },
  { key: "contpaqi", label: "CONTPAQi" },
] as const;

export function ordersInExpedientesModule(orders: PurchaseOrderDto[]): PurchaseOrderDto[] {
  return orders.filter((o) => o.status !== "draft" || o.files.length > 0);
}

export function expedienteEstatus(order: PurchaseOrderDto): ExpedienteEstatus {
  if (order.status === "completed") return "completado";
  if (order.status === "difference" || order.status === "engineerRejected") return "requiere_atencion";
  if (isActivePartial(order)) return "parcial";
  if (isPendingAuthorization(order)) return "pendiente";
  return "en_proceso";
}

export function expedienteRequiresAttention(order: PurchaseOrderDto): boolean {
  return expedienteEstatus(order) === "requiere_atencion";
}

export function expedienteKpis(orders: PurchaseOrderDto[]) {
  const base = ordersInExpedientesModule(orders);
  const completos = base.filter((o) => o.status === "completed");
  const atencion = base.filter(expedienteRequiresAttention);
  const enProceso = base.filter((o) => {
    const e = expedienteEstatus(o);
    return e === "en_proceso" || e === "parcial" || e === "pendiente";
  });

  return {
    total: base.length,
    completos: completos.length,
    enProceso: enProceso.length,
    atencion: atencion.length,
  };
}

export function filterByExpedienteTab(orders: PurchaseOrderDto[], tab: ExpedienteTab): PurchaseOrderDto[] {
  const base = ordersInExpedientesModule(orders);
  switch (tab) {
    case "completos":
      return base.filter((o) => o.status === "completed");
    case "en_proceso":
      return base.filter((o) => {
        const e = expedienteEstatus(o);
        return e === "en_proceso" || e === "parcial" || e === "pendiente";
      });
    case "atencion":
      return base.filter(expedienteRequiresAttention);
    default:
      return base;
  }
}

function normalizeQuery(q: string): string {
  return q
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "");
}

export function applyExpedienteFilters(
  orders: PurchaseOrderDto[],
  filters: ExpedienteFilters
): PurchaseOrderDto[] {
  return orders.filter((o) => {
    if (filters.obraId && o.obraId !== filters.obraId) return false;
    if (filters.supplier && o.supplierName !== filters.supplier) return false;
    if (filters.estatus && expedienteEstatus(o) !== filters.estatus) return false;

    const activity = lastActivity(o).at.slice(0, 10);
    if (filters.dateFrom && activity && activity < filters.dateFrom) return false;
    if (filters.dateTo && activity && activity > filters.dateTo) return false;

    const q = normalizeQuery(filters.search);
    if (q) {
      const haystack = normalizeQuery(
        [o.ocFolio, o.title, o.supplierName, o.obraName, o.createdByName].join(" ")
      );
      if (!haystack.includes(q)) return false;
    }

    return true;
  });
}

export function uniqueExpedienteSuppliers(orders: PurchaseOrderDto[]): string[] {
  const set = new Set<string>();
  for (const o of ordersInExpedientesModule(orders)) {
    const n = o.supplierName.trim();
    if (n) set.add(n);
  }
  return [...set].sort((a, b) => a.localeCompare(b, "es"));
}

export type ActivityEvent = { at: string; message: string };

export function lastActivity(order: PurchaseOrderDto): ActivityEvent {
  const history = buildActivityHistory(order);
  return history[0] ?? { at: order.updatedAt, message: STATUS_LABEL[order.status] };
}

export function buildActivityHistory(order: PurchaseOrderDto): ActivityEvent[] {
  const items: ActivityEvent[] = [];

  items.push({
    at: order.createdAt,
    message: `Orden de compra creada por ${order.createdByName || "Compras"}`,
  });

  if (order.sentToEngineerAt) {
    items.push({ at: order.sentToEngineerAt, message: "Enviada a Ingeniería para revisión" });
  }

  for (const c of order.comments) {
    items.push({
      at: c.createdAt,
      message:
        c.kind === "approval"
          ? `Aprobada por ${c.authorName}`
          : `Corrección solicitada por ${c.authorName}`,
    });
  }

  order.paymentRecords.forEach((p, i) => {
    items.push({
      at: p.createdAt,
      message: `Pago ${i + 1} registrado por ${p.recordedByName}`,
    });
  });

  for (const f of order.files) {
    const label = FILE_KIND_LABEL[f.kind] ?? f.kind;
    items.push({ at: f.createdAt, message: `${label} cargado` });
  }

  if (order.status === "completed") {
    items.push({ at: order.updatedAt, message: "Expediente cerrado" });
  }

  return items.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
}

export function expedienteStepDone(order: PurchaseOrderDto, key: (typeof EXPEDIENTE_PROCESS_STEPS)[number]["key"]): boolean {
  switch (key) {
    case "oc":
      return order.files.some((f) => f.kind === "oc_pdf") || order.status !== "draft";
    case "aprobada":
      return !["draft", "awaitingEngineer", "engineerRejected"].includes(order.status);
    case "pagos":
      return order.amountPaidSoFar > 0.01 || order.paymentRecords.length > 0;
    case "factura":
      return order.files.some((f) => f.kind === "factura");
    case "contpaqi":
      return order.status === "completed";
    default:
      return false;
  }
}

export function paginateItems<T>(items: T[], page: number, pageSize: number): T[] {
  const start = (page - 1) * pageSize;
  return items.slice(start, start + pageSize);
}

export function totalPages(count: number, pageSize: number): number {
  return Math.max(1, Math.ceil(count / pageSize));
}

export function exportExpedientesCsv(orders: PurchaseOrderDto[]): void {
  const headers = [
    "Folio OC",
    "Proveedor",
    "Obra",
    "Monto total",
    "Pagado",
    "Saldo pendiente",
    "Estatus",
    "Última actividad",
  ];
  const rows = orders.map((o) => {
    const act = lastActivity(o);
    return [
      o.ocFolio || o.title,
      o.supplierName,
      o.obraName,
      o.totalAmount.toFixed(2),
      o.amountPaidSoFar.toFixed(2),
      o.amountRemaining.toFixed(2),
      EXPEDIENTE_ESTATUS_LABEL[expedienteEstatus(o)],
      act.at.slice(0, 10),
    ];
  });
  const csv = [headers, ...rows]
    .map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
    .join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `expedientes-ccp-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
