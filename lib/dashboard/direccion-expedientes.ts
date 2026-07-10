import { STATUS_LABEL, ROLE_LABEL } from "@/lib/domain/labels";
import { FILE_KIND_LABEL } from "@/lib/domain/labels";
import type { DirectExpenseDto, OrderStatus, PurchaseOrderDto, Role } from "@/lib/domain/types";
import {
  DIRECT_EXPENSE_STATUS_LABEL,
  type DirectExpenseStatus,
} from "@/lib/domain/solicitudes";
import { isPendingAuthorization, isActivePartial } from "@/lib/dashboard/direccion-dashboard";

/** Marcador en `internalReference` para filas sintéticas de gasto directo (Proceso B). */
export const PROCESO_B_EXPEDIENTE_MARKER = "proceso-b";

export function isProcesoBExpediente(order: PurchaseOrderDto): boolean {
  return order.internalReference === PROCESO_B_EXPEDIENTE_MARKER;
}

export function expedienteFolioLabel(order: PurchaseOrderDto): string {
  if (isProcesoBExpediente(order)) return "Sin folio";
  return order.ocFolio.trim() || order.title;
}

function mapDirectExpenseStatusToOrderStatus(status: DirectExpenseStatus): OrderStatus {
  switch (status) {
    case "draft":
      return "draft";
    case "sent":
      return "awaitingPayment";
    case "paid":
      return "paid";
    case "awaiting_invoice":
      return "awaitingInvoice";
    case "invoice_received":
      return "invoiceReceived";
    case "difference":
      return "difference";
    case "completed":
      return "completed";
    default:
      return "awaitingPayment";
  }
}

/** Convierte un gasto directo en fila de expediente (sin folio OC). */
export function mapDirectExpenseToExpedienteOrder(expense: DirectExpenseDto): PurchaseOrderDto {
  return {
    id: expense.id,
    obraId: expense.obraId,
    obraName: expense.obraName,
    title: expense.category.trim() || "Gasto directo",
    description: expense.justification,
    supplierName: expense.supplierName,
    supplierId: null,
    ocFolio: "",
    ocDate: null,
    paymentTerms: "",
    internalReference: PROCESO_B_EXPEDIENTE_MARKER,
    documentDate: null,
    assignedEngineerUserId: null,
    assignedEngineerName: null,
    materialRequestId: null,
    totalAmount: expense.estimatedAmount,
    amountPaidSoFar: expense.amountPaidSoFar,
    amountRemaining: expense.amountRemaining,
    currency: expense.currency,
    paymentLabel: expense.paymentLabel,
    paymentType: null,
    suggestedPaymentType: null,
    paymentDueDate: null,
    status: mapDirectExpenseStatusToOrderStatus(expense.status),
    sentToEngineerAt: expense.sentAt,
    createdAt: expense.createdAt,
    updatedAt: expense.updatedAt,
    createdByName: expense.createdByName,
    comments: [],
    files: expense.files.map((f) => ({
      id: f.id,
      kind: f.kind as PurchaseOrderDto["files"][number]["kind"],
      originalFileName: f.originalFileName,
      mimeType: f.mimeType,
      sizeBytes: f.sizeBytes,
      createdAt: f.createdAt,
    })),
    paymentRecords: expense.paymentRecords.map((p) => ({
      id: p.id,
      amount: p.amount,
      reference: p.reference,
      notes: p.notes,
      recordedByName: p.recordedByName,
      createdAt: p.createdAt,
    })),
  };
}

export function mergeExpedienteOrders(
  orders: PurchaseOrderDto[],
  expenses: DirectExpenseDto[] = []
): PurchaseOrderDto[] {
  const mapped = expenses
    .filter((e) => e.status !== "draft")
    .map(mapDirectExpenseToExpedienteOrder);
  return [...orders, ...mapped];
}

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
  area: string;
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

export const EXPEDIENTE_AREA_OPTIONS: { value: Role | ""; label: string }[] = [
  { value: "", label: "Todas las áreas" },
  { value: "ingeniero", label: ROLE_LABEL.ingeniero },
  { value: "compras", label: ROLE_LABEL.compras },
  { value: "pagos", label: ROLE_LABEL.pagos },
  { value: "recepcion", label: ROLE_LABEL.recepcion },
  { value: "contabilidad", label: ROLE_LABEL.contabilidad },
];

/** Área que debe actuar según el estatus actual del expediente. */
export function expedientePendingArea(order: PurchaseOrderDto): Role | null {
  if (isProcesoBExpediente(order)) {
    switch (order.status) {
      case "awaitingPayment":
        return "pagos";
      case "paid":
      case "awaitingInvoice":
        return "recepcion";
      case "invoiceReceived":
      case "difference":
        return "contabilidad";
      default:
        return null;
    }
  }
  switch (order.status) {
    case "awaitingEngineer":
    case "engineerRejected":
      return "ingeniero";
    case "awaitingPatyDeadline":
      return "compras";
    case "awaitingPayment":
      return "pagos";
    case "paid":
    case "awaitingInvoice":
      return "recepcion";
    case "invoiceReceived":
    case "difference":
      return "contabilidad";
    default:
      return null;
  }
}

export function expedienteAttentionAreaLabel(order: PurchaseOrderDto): string {
  const role = expedientePendingArea(order);
  if (!role) return "—";
  return ROLE_LABEL[role];
}

export function expedienteEstatus(order: PurchaseOrderDto): ExpedienteEstatus {
  if (order.status === "completed") return "completado";
  if (order.status === "difference" || order.status === "engineerRejected") return "requiere_atencion";
  if (isActivePartial(order)) return "parcial";
  if (isPendingAuthorization(order)) return "pendiente";
  return "en_proceso";
}

export function expedienteRequiresAttention(order: PurchaseOrderDto): boolean {
  if (order.status === "completed" || order.status === "draft") return false;
  if (order.status === "difference" || order.status === "engineerRejected") return true;
  return expedientePendingArea(order) !== null;
}

export function expedienteKpis(orders: PurchaseOrderDto[]) {
  const base = ordersInExpedientesModule(orders);
  const completos = base.filter((o) => o.status === "completed");
  const atencion = base.filter(expedienteRequiresAttention);
  const enProceso = base.filter((o) => {
    const e = expedienteEstatus(o);
    return e === "en_proceso" || e === "parcial" || e === "pendiente";
  });

  const atencionPorArea = {
    ingeniero: atencion.filter((o) => expedientePendingArea(o) === "ingeniero").length,
    compras: atencion.filter((o) => expedientePendingArea(o) === "compras").length,
    pagos: atencion.filter((o) => expedientePendingArea(o) === "pagos").length,
    recepcion: atencion.filter((o) => expedientePendingArea(o) === "recepcion").length,
    contabilidad: atencion.filter((o) => expedientePendingArea(o) === "contabilidad").length,
  };

  return {
    total: base.length,
    completos: completos.length,
    enProceso: enProceso.length,
    atencion: atencion.length,
    atencionPorArea,
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
    if (filters.area && expedientePendingArea(o) !== filters.area) return false;

    const activity = lastActivity(o).at.slice(0, 10);
    if (filters.dateFrom && activity && activity < filters.dateFrom) return false;
    if (filters.dateTo && activity && activity > filters.dateTo) return false;

    const q = normalizeQuery(filters.search);
    if (q) {
      const haystack = normalizeQuery(
        [
          expedienteFolioLabel(o),
          o.ocFolio,
          o.title,
          o.supplierName,
          o.obraName,
          o.createdByName,
          isProcesoBExpediente(o) ? "proceso b gasto directo sin folio" : "",
        ].join(" ")
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
  if (isProcesoBExpediente(order)) {
    const items: ActivityEvent[] = [
      {
        at: order.createdAt,
        message: `Gasto directo creado por ${order.createdByName || "Ingeniería"}`,
      },
    ];
    if (order.sentToEngineerAt) {
      items.push({
        at: order.sentToEngineerAt,
        message: "Enviado a Administración para pago",
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
    if (order.status === "awaitingInvoice") {
      items.push({ at: order.updatedAt, message: DIRECT_EXPENSE_STATUS_LABEL.awaiting_invoice });
    }
    if (order.status === "completed") {
      items.push({ at: order.updatedAt, message: "Expediente cerrado" });
    }
    return items.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
  }

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
  if (isProcesoBExpediente(order)) {
    switch (key) {
      case "oc":
        // Sin OC: el paso no aplica; se marca como listo al salir de borrador.
        return order.status !== "draft";
      case "aprobada":
        return order.status !== "draft";
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
      expedienteFolioLabel(o),
      o.supplierName || "—",
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
