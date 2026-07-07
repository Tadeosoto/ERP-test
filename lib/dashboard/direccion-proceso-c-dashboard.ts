import type { InvoiceFirstCommitmentDto, PurchaseOrderDto } from "@/lib/domain/types";
import { invoiceFirstAwaitingOcCount } from "@/lib/domain/proceso-c";
import {
  invoiceFirstTabKey,
  mergeOrderPaymentIntoCommitment,
} from "@/lib/services/invoice-first-mappers";
import { isActivePartial, orderPaymentTotal } from "@/lib/dashboard/direccion-dashboard";

export type DireccionCommitmentTab = "todos" | "esperando_oc" | "parciales" | "completados";

export function enrichInvoiceFirstCommitments(
  commitments: InvoiceFirstCommitmentDto[],
  orders: PurchaseOrderDto[]
): InvoiceFirstCommitmentDto[] {
  const byId = new Map(orders.map((o) => [o.id, o]));
  return commitments.map((c) => {
    const order = c.purchaseOrderId ? byId.get(c.purchaseOrderId) : undefined;
    return mergeOrderPaymentIntoCommitment(c, order);
  });
}

export function direccionFacturasEsperandoOcKpi(commitments: InvoiceFirstCommitmentDto[]): {
  amount: number;
  count: number;
} {
  const waiting = commitments.filter((c) => invoiceFirstAwaitingOcCount(c.status));
  return {
    amount: waiting.reduce((s, c) => s + c.totalAmount, 0),
    count: waiting.length,
  };
}

export function filterCommitmentsByTab(
  commitments: InvoiceFirstCommitmentDto[],
  tab: DireccionCommitmentTab
): InvoiceFirstCommitmentDto[] {
  if (tab === "todos") return commitments;
  return commitments.filter((c) => {
    const key = commitmentDisplayTab(c);
    if (tab === "esperando_oc") return key === "esperando_oc";
    if (tab === "parciales") return key === "parciales";
    if (tab === "completados") return key === "completados";
    return true;
  });
}

export function commitmentDisplayTab(c: InvoiceFirstCommitmentDto): DireccionCommitmentTab {
  if (c.status === "completed" || c.purchaseOrderStatus === "completed") return "completados";
  if (c.status === "in_payment" && c.purchaseOrderId) {
    const orderLike = {
      paymentType: c.paymentType,
      amountRemaining: c.amountRemaining,
      amountPaidSoFar: c.amountPaidSoFar,
      status: c.purchaseOrderStatus ?? "awaitingPayment",
    } as PurchaseOrderDto;
    if (isActivePartial(orderLike) || (c.amountPaidSoFar > 0.01 && c.amountRemaining > 0.01)) {
      return "parciales";
    }
    if (c.amountPaidSoFar > 0.01 && c.amountRemaining <= 0.01) return "completados";
  }
  return invoiceFirstTabKey(c) as DireccionCommitmentTab;
}

export function commitmentDisplayStatus(c: InvoiceFirstCommitmentDto): string {
  if (c.status === "awaiting_oc" || c.status === "oc_requested") return "Esperando OC";
  if (c.status === "completed" || c.purchaseOrderStatus === "completed") return "Pagos completados";
  if (c.amountPaidSoFar > 0.01 && c.amountRemaining > 0.01) return "Pago parcial";
  if (c.status === "in_payment") return "En pago";
  return "Esperando OC";
}

export function commitmentStatusTone(c: InvoiceFirstCommitmentDto): string {
  const label = commitmentDisplayStatus(c);
  if (label === "Esperando OC") return "bg-orange-100 text-orange-800 ring-orange-200/80";
  if (label === "Pago parcial") return "bg-sky-100 text-sky-800 ring-sky-200/80";
  if (label === "Pagos completados") return "bg-emerald-100 text-emerald-800 ring-emerald-200/80";
  return "bg-violet-100 text-violet-800 ring-violet-200/80";
}

export function partialOrdersForSidebar(orders: PurchaseOrderDto[]): PurchaseOrderDto[] {
  return orders.filter(isActivePartial).slice(0, 5);
}

export function partialPaymentLabel(order: PurchaseOrderDto): string {
  const paid = orderPaymentTotal(order);
  const total = order.totalAmount;
  const count = order.paymentRecords.length || (order.amountPaidSoFar > 0 ? 1 : 0);
  const estimatedParts =
    order.paymentType === "parcialidades" && total > 0
      ? Math.max(count, Math.ceil(total / Math.max(paid, total / 5)))
      : count;
  return `${count}/${Math.max(estimatedParts, count)} pagos realizados`;
}
