import type { ViaticoReceiptKind, ViaticoSummaryDto } from "@/lib/domain/types";

export const VIATICO_RECEIPT_KINDS: ViaticoReceiptKind[] = ["factura", "ticket", "sin_comprobante"];

export const VIATICO_RECEIPT_LABEL: Record<ViaticoReceiptKind, string> = {
  factura: "Factura",
  ticket: "Ticket / recibo",
  sin_comprobante: "Sin comprobante",
};

export function roundMoney(amount: number): number {
  return Math.round(amount * 100) / 100;
}

export function parsePositiveMoney(value: unknown): number | null {
  const n = typeof value === "number" ? value : Number(String(value ?? "").replace(/,/g, ""));
  if (!Number.isFinite(n) || n <= 0 || n > 10_000_000) return null;
  return roundMoney(n);
}

export function asReceiptKind(value: string): ViaticoReceiptKind | null {
  if (value === "factura" || value === "ticket" || value === "sin_comprobante") return value;
  return null;
}

export function employeeFullName(firstName: string, lastName: string): string {
  return `${firstName} ${lastName}`.replace(/\s+/g, " ").trim();
}

export function viaticoSummary(
  deliveredAmount: number,
  expenses: { amount: number; receiptKind: string }[]
): ViaticoSummaryDto {
  const sum = (kind?: ViaticoReceiptKind) =>
    roundMoney(
      expenses
        .filter((e) => (kind ? e.receiptKind === kind : true))
        .reduce((total, e) => total + e.amount, 0)
    );
  const delivered = roundMoney(deliveredAmount);
  const spent = sum();
  return {
    delivered,
    spent,
    invoiced: sum("factura"),
    tickets: sum("ticket"),
    withoutReceipt: sum("sin_comprobante"),
    toReturn: roundMoney(delivered - spent),
  };
}
