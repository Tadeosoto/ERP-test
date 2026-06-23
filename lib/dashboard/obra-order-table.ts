import { getPendingRoles, formatPendingRoles } from "@/lib/domain/flow";
import { ROLE_LABEL } from "@/lib/domain/labels";
import type { OrderStatus, PurchaseOrderDto, Role } from "@/lib/domain/types";
import {
  COMPRAS_TAB_STATUSES,
  filterComprasOrders,
  orderDisplayCode,
  type ComprasOrderTab,
} from "@/lib/dashboard/compras-dashboard";

/** 6 pasos visibles en la tabla de obra (mockup). */
export const OBRA_PROCESS_STEPS = [
  { step: 1, label: "OC Creada" },
  { step: 2, label: "Ingeniería" },
  { step: 3, label: "Pago" },
  { step: 4, label: "Factura" },
  { step: 5, label: "Recepción" },
  { step: 6, label: "Cierre" },
] as const;

export function obraProcessPhase(status: OrderStatus): number {
  switch (status) {
    case "draft":
    case "engineerRejected":
      return 1;
    case "awaitingEngineer":
      return 2;
    case "awaitingPatyDeadline":
    case "awaitingPayment":
      return 3;
    case "paid":
      return 4;
    case "awaitingInvoice":
      return 4;
    case "invoiceReceived":
    case "difference":
      return 5;
    case "completed":
      return 7;
    default:
      return 1;
  }
}

export function orderPaymentInvoiceCounts(order: PurchaseOrderDto): {
  paymentsDone: number;
  paymentsTotal: number;
  invoicesDone: number;
  invoicesTotal: number;
} {
  const hasPayment = order.files.some((f) => f.kind === "comprobante_pago") || order.amountPaidSoFar > 0.01;
  const paidFull = order.paymentLabel === "saldada" || order.amountPaidSoFar >= order.totalAmount - 0.01;
  const hasInvoice = order.files.some((f) => f.kind === "factura");

  return {
    paymentsDone: paidFull ? 1 : hasPayment ? 1 : 0,
    paymentsTotal: 1,
    invoicesDone: hasInvoice ? 1 : 0,
    invoicesTotal: 1,
  };
}

const ROLE_PERSON: Partial<Record<Role, (o: PurchaseOrderDto) => string | null>> = {
  ingeniero: (o) => o.assignedEngineerName,
  compras: (o) => o.createdByName,
};

export function orderAwaitingActionLabel(order: PurchaseOrderDto): string {
  if (order.status === "completed") return "—";
  const roles = getPendingRoles(order.status);
  if (roles.length === 0) return "—";
  const primary = roles[0];
  const person = ROLE_PERSON[primary]?.(order);
  const area = ROLE_LABEL[primary];
  if (person && primary === "ingeniero") return `${area} — ${person}`;
  if (person && primary === "compras") return `${area} — ${person.split(" ")[0]}`;
  return formatPendingRoles(order.status);
}

export function filterObraOrders(input: {
  orders: PurchaseOrderDto[];
  search: string;
  estadoTab: ComprasOrderTab;
  responsableRole: string;
  dateFrom: string;
  dateTo: string;
}): PurchaseOrderDto[] {
  let result = filterComprasOrders({
    orders: input.orders,
    tab: input.estadoTab,
    search: input.search,
    obraId: "all",
    dateFrom: input.dateFrom,
    dateTo: input.dateTo,
  });

  if (input.responsableRole !== "all") {
    result = result.filter((o) => getPendingRoles(o.status).includes(input.responsableRole as Role));
  }

  return result;
}

export { orderDisplayCode, COMPRAS_TAB_STATUSES, type ComprasOrderTab };

export const RESPONSABLE_FILTER_OPTIONS: { value: string; label: string }[] = [
  { value: "all", label: "Responsable: Todos" },
  { value: "compras", label: "Compras" },
  { value: "ingeniero", label: "Ingeniería" },
  { value: "pagos", label: "Administración" },
  { value: "recepcion", label: "Recepción" },
  { value: "contabilidad", label: "Contabilidad" },
];
