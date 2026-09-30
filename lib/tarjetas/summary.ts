import type {
  CompanyCardBank,
  CompanyCardDestination,
  CompanyCardExpenseStatus,
  CompanyCardKind,
  CompanyCardMovementKind,
  CompanyCardReceiptKind,
  CompanyCardSummaryDto,
} from "@/lib/domain/types";

export const CARD_CATEGORIES = [
  "Material",
  "Comida",
  "Combustible",
  "Transporte",
  "Hospedaje",
  "Oficina",
  "Servicios",
  "Otro",
] as const;

export const RECEIPT_LABEL: Record<CompanyCardReceiptKind, string> = {
  factura: "Factura",
  ticket: "Ticket",
  sin_comprobante: "Sin comprobante",
};

export const STATUS_LABEL: Record<CompanyCardExpenseStatus | "carga", string> = {
  por_comprobar: "Por comprobar",
  comprobado: "Comprobado",
  carga: "Carga de saldo",
};

export function roundMoney(amount: number): number {
  return Math.round(amount * 100) / 100;
}

export function parsePositiveMoney(value: unknown): number | null {
  const n = typeof value === "number" ? value : Number(String(value ?? "").replace(/,/g, ""));
  if (!Number.isFinite(n) || n <= 0 || n > 10_000_000) return null;
  return roundMoney(n);
}

export function parseOccurredOn(value: unknown): Date | null {
  const raw = String(value ?? "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return null;
  const date = new Date(`${raw}T12:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function occurredOnInputValue(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Mexico_City" }).format(date);
}

export function asCardBank(value: string): CompanyCardBank | null {
  return value === "banbajio" || value === "banregio" ? value : null;
}

export function asCardKind(value: string): CompanyCardKind | null {
  return value === "debito" || value === "credito" ? value : null;
}

export function asMovementKind(value: string): CompanyCardMovementKind | null {
  return value === "gasto" || value === "carga" ? value : null;
}

export function asDestination(value: string): CompanyCardDestination | null {
  return value === "obra" || value === "oficinas" || value === "otro" ? value : null;
}

export function asReceiptKind(value: string): CompanyCardReceiptKind | null {
  return value === "factura" || value === "ticket" || value === "sin_comprobante" ? value : null;
}

export function asExpenseStatus(value: string): CompanyCardExpenseStatus | null {
  return value === "por_comprobar" || value === "comprobado" ? value : null;
}

export function cardShowsLastFour(lastFour: string): string {
  return /^\d{4}$/.test(lastFour) ? `···· ${lastFour}` : "Sin últimos 4";
}

/** Sustituye el puesto (01) por los 4 dígitos. Una corrección posterior vuelve a cambiar el nombre. */
export function cardLabelWithDigits(label: string, lastFour: string): string {
  if (/\s+\d+$/.test(label)) return label.replace(/\s+\d+$/, ` ${lastFour}`);
  return `${label} ${lastFour}`;
}

export function cardSubtitle(label: string, lastFour: string): string | null {
  if (/^\d{4}$/.test(lastFour) && label.trim().endsWith(lastFour)) return null;
  return cardShowsLastFour(lastFour);
}

export function cardSummary(
  movements: { kind: string; amount: number; status: string }[]
): CompanyCardSummaryDto {
  const sum = (predicate: (row: { kind: string; amount: number; status: string }) => boolean) =>
    roundMoney(movements.filter(predicate).reduce((total, row) => total + row.amount, 0));
  const loads = sum((row) => row.kind === "carga");
  const spent = sum((row) => row.kind === "gasto");
  return {
    loads,
    spent,
    proven: sum((row) => row.kind === "gasto" && row.status === "comprobado"),
    pending: sum((row) => row.kind === "gasto" && row.status === "por_comprobar"),
    available: roundMoney(loads - spent),
  };
}

export function destinationLabel(input: {
  destinationKind: string;
  obraName?: string | null;
  costCenter?: string;
}): string {
  if (input.destinationKind === "obra") return input.obraName?.trim() || "Obra";
  if (input.destinationKind === "oficinas") return "Oficinas / Administración";
  if (input.destinationKind === "otro") return input.costCenter?.trim() || "Otro";
  return "—";
}
