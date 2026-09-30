export const FUEL_RECEIPT_RETENTION_MONTHS = 3;
export const DOCUMENT_SOON_DAYS = 30;

export const VEHICLE_TYPES = ["Pick-up", "Sedán", "SUV", "Maquinaria", "Otro"] as const;
export const DOCUMENT_KINDS = [
  { kind: "seguro", label: "Seguro" },
  { kind: "verificacion", label: "Verificación" },
  { kind: "refrendo", label: "Refrendo" },
  { kind: "circulacion", label: "Tarjeta de circulación" },
  { kind: "otro", label: "Otro" },
] as const;

export function roundMoney(amount: number): number {
  return Math.round(amount * 100) / 100;
}

export function mexicoDay(date = new Date()): Date {
  const key = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Mexico_City" }).format(date);
  return new Date(`${key}T12:00:00.000Z`);
}

export function parseDay(value: unknown): Date | null {
  const raw = String(value ?? "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return null;
  const date = new Date(`${raw}T12:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function addMonths(date: Date, months: number): Date {
  const next = new Date(date);
  next.setUTCMonth(next.getUTCMonth() + months);
  return next;
}

export function dayDiff(from: Date, to: Date): number {
  return Math.round((to.getTime() - from.getTime()) / 86_400_000);
}

export type DocTone = "vigente" | "proximo" | "vencido" | "sin_fecha";

export function documentTone(expiresOn: Date | null, today = mexicoDay()): DocTone {
  if (!expiresOn) return "sin_fecha";
  const days = dayDiff(today, mexicoDay(expiresOn));
  if (days < 0) return "vencido";
  if (days <= DOCUMENT_SOON_DAYS) return "proximo";
  return "vigente";
}

export function pricePerLiter(amount: number, liters: number): number | null {
  if (!(liters > 0) || !(amount > 0)) return null;
  return Math.round((amount / liters) * 100) / 100;
}

export function monthKey(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Mexico_City", year: "numeric", month: "2-digit" }).format(date);
}

export function sameMonth(a: Date, b: Date): boolean {
  return monthKey(a) === monthKey(b);
}

export function sameYear(a: Date, b: Date): boolean {
  const year = (date: Date) =>
    new Intl.DateTimeFormat("en-CA", { timeZone: "America/Mexico_City", year: "numeric" }).format(date);
  return year(a) === year(b);
}
