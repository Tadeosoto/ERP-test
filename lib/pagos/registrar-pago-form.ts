import type { ObraDto, PurchaseOrderDto } from "@/lib/domain/types";

export const PAYMENT_METHODS = [
  "Transferencia bancaria",
  "SPEI",
  "Cheque",
  "Efectivo",
] as const;

export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export type RegistrarPagoForm = {
  orderId: string;
  amount: string;
  paymentDate: string;
  paymentMethod: PaymentMethod;
  currency: string;
  concept: string;
  notes: string;
  receiptComments: string;
};

export function todayMxInput(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Mexico_City" }).format(new Date());
}

export function defaultConcept(order: PurchaseOrderDto): string {
  const folio = order.ocFolio || order.title;
  return `Pago ${folio} - ${order.supplierName} - ${order.obraName}`;
}

export function defaultAmount(order: PurchaseOrderDto): string {
  const n = order.amountRemaining > 0 ? order.amountRemaining : order.totalAmount - order.amountPaidSoFar;
  return formatAmountInput(n);
}

export function formatAmountInput(value: number): string {
  if (!Number.isFinite(value)) return "";
  return new Intl.NumberFormat("es-MX", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function parseAmountInput(raw: string): number {
  const cleaned = raw.replace(/[^\d.,-]/g, "").replace(/,/g, "");
  const n = Number.parseFloat(cleaned);
  return Number.isFinite(n) ? n : 0;
}

export function formatDisplayDate(isoDate: string): string {
  if (!isoDate) return "—";
  const [y, m, d] = isoDate.split("-");
  if (!y || !m || !d) return isoDate;
  return `${d} / ${m} / ${y}`;
}

export function currencyLabel(code: string): string {
  if (code === "MXN") return "MXN - Peso Mexicano";
  if (code === "USD") return "USD - Dólar";
  return code;
}

export function payableOrders(orders: PurchaseOrderDto[]): PurchaseOrderDto[] {
  return orders.filter((o) => o.status === "awaitingPayment" && o.paymentType);
}

export function obraForOrder(obras: ObraDto[], order: PurchaseOrderDto): ObraDto | undefined {
  return obras.find((o) => o.id === order.obraId);
}

export function buildPaymentReference(form: RegistrarPagoForm): string {
  return `${form.paymentMethod} · ${formatDisplayDate(form.paymentDate)}`;
}

export function buildPaymentNotes(form: RegistrarPagoForm): string {
  const parts = [form.concept.trim()];
  if (form.notes.trim()) parts.push(form.notes.trim());
  if (form.receiptComments.trim()) parts.push(`Comentario comprobante: ${form.receiptComments.trim()}`);
  return parts.filter(Boolean).join("\n");
}

export function remainingAfterPayment(order: PurchaseOrderDto, payAmount: number): number {
  return Math.max(0, order.totalAmount - order.amountPaidSoFar - payAmount);
}
