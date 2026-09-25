import type { PurchaseOrderDto } from "@/lib/domain/types";

/** OC con conversión Banxico: pagos y % se llevan en MXN. */
export function orderTracksPaymentsInMxn(order: {
  currency: string;
  fxRate?: number | null;
  totalAmountMxn?: number | null;
}): boolean {
  return (
    order.currency.toUpperCase() === "USD" &&
    order.fxRate != null &&
    order.fxRate > 0 &&
    order.totalAmountMxn != null &&
    order.totalAmountMxn > 0
  );
}

/** Total contra el que se abonan pagos (MXN si hay FX; si no, moneda de la OC). */
export function paymentBasisTotal(order: {
  currency: string;
  totalAmount: number;
  fxRate?: number | null;
  totalAmountMxn?: number | null;
}): number {
  if (orderTracksPaymentsInMxn(order)) return order.totalAmountMxn as number;
  return order.totalAmount;
}

export function paymentBasisCurrency(order: {
  currency: string;
  fxRate?: number | null;
  totalAmountMxn?: number | null;
}): string {
  return orderTracksPaymentsInMxn(order) ? "MXN" : order.currency;
}

export function paymentProgressPct(order: {
  currency: string;
  totalAmount: number;
  amountPaidSoFar: number;
  fxRate?: number | null;
  totalAmountMxn?: number | null;
}): number {
  const total = paymentBasisTotal(order);
  if (!(total > 0)) return 0;
  return Math.min(100, Math.max(0, Math.round((order.amountPaidSoFar / total) * 100)));
}

/** Pesos registrados de un abono, vistos en la moneda original de la OC (USD / TC Banxico). */
export function paymentAmountInOrderCurrency(
  order: {
    currency: string;
    fxRate?: number | null;
    totalAmountMxn?: number | null;
  },
  amountInPaymentBasis: number
): number | null {
  if (!orderTracksPaymentsInMxn(order) || !(order.fxRate! > 0)) return null;
  return amountInPaymentBasis / order.fxRate!;
}

export function formatFxBanner(order: Pick<PurchaseOrderDto, "currency" | "fxRate" | "fxRateDate" | "totalAmountMxn" | "fxNote" | "totalAmount">): string | null {
  if (!orderTracksPaymentsInMxn(order)) return null;
  if (order.fxNote?.trim()) return order.fxNote;
  const rate = order.fxRate!.toLocaleString("es-MX", {
    minimumFractionDigits: 4,
    maximumFractionDigits: 4,
  });
  const date = order.fxRateDate ? order.fxRateDate.slice(0, 10) : "—";
  return `TC Banxico FIX ${rate} MXN/USD (${date})`;
}
