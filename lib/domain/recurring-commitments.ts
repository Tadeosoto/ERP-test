export type CommitmentFrequency = "mensual" | "bimestral" | "trimestral" | "anual";

export type CommitmentWorkflowStatus = "pending" | "awaiting_invoice" | "paid";

export type CommitmentLifecycleStatus = "active" | "paused";

export const COMMITMENT_FREQUENCIES: { value: CommitmentFrequency; label: string }[] = [
  { value: "mensual", label: "Mensual" },
  { value: "bimestral", label: "Bimestral" },
  { value: "trimestral", label: "Trimestral" },
  { value: "anual", label: "Anual" },
];

export const COMMITMENT_FREQUENCY_LABEL: Record<CommitmentFrequency, string> = {
  mensual: "Mensual",
  bimestral: "Bimestral",
  trimestral: "Trimestral",
  anual: "Anual",
};

export const COMMITMENT_WORKFLOW_LABEL: Record<CommitmentWorkflowStatus, string> = {
  pending: "Pendiente",
  awaiting_invoice: "Esperando factura",
  paid: "Pagado",
};

export const COMMITMENT_WORKFLOW_TONE: Record<CommitmentWorkflowStatus, string> = {
  pending: "bg-amber-100 text-amber-900 ring-amber-200",
  awaiting_invoice: "bg-orange-100 text-orange-900 ring-orange-200",
  paid: "bg-emerald-100 text-emerald-900 ring-emerald-200",
};

export const COMMITMENT_LIFECYCLE_LABEL: Record<CommitmentLifecycleStatus, string> = {
  active: "Activo",
  paused: "Pausado",
};

export const COMMITMENT_DAYS = Array.from({ length: 31 }, (_, i) => i + 1);

export function supplierInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "??";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
}

export function daysUntil(isoDate: string, from = new Date()): number {
  const target = new Date(isoDate);
  const start = new Date(from);
  start.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - start.getTime()) / 86_400_000);
}

export function relativeDayLabel(isoDate: string): string {
  const diff = daysUntil(isoDate);
  if (diff === 0) return "Hoy";
  if (diff === 1) return "En 1 día";
  if (diff > 1) return `En ${diff} días`;
  if (diff === -1) return "Hace 1 día";
  return `Hace ${Math.abs(diff)} días`;
}

/** Calcula próxima fecha de recepción a partir del día del mes. */
export function nextReceptionFromDay(day: number, from = new Date()): Date {
  const d = Math.min(31, Math.max(1, day));
  const base = new Date(from);
  base.setHours(12, 0, 0, 0);
  let candidate = new Date(base.getFullYear(), base.getMonth(), d, 12, 0, 0, 0);
  if (candidate < base) {
    candidate = new Date(base.getFullYear(), base.getMonth() + 1, d, 12, 0, 0, 0);
  }
  return candidate;
}

/** Por defecto vence ~15 días después de la recepción. */
export function defaultDueFromReception(reception: Date, offsetDays = 15): Date {
  const due = new Date(reception);
  due.setDate(due.getDate() + offsetDays);
  return due;
}

export function parseIsoDateInput(value: string): Date | null {
  if (!value) return null;
  const [y, m, d] = value.split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d, 12, 0, 0, 0);
}

export function toDateInputValue(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export const RECURRING_DUE_REMINDER_TYPE = "recurring_due_reminder";

/** Avisos diarios a Administración a partir de este umbral (días antes del vencimiento). */
export const RECURRING_DUE_REMINDER_DAYS = 3;
