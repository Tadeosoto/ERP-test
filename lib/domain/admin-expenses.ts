import {
  daysUntil,
  toDateInputValue,
  type CommitmentFrequency,
} from "@/lib/domain/recurring-commitments";

export const ADMIN_EXPENSE_CATEGORIES: { value: string; label: string; color: string }[] = [
  { value: "luz", label: "Luz", color: "#f59e0b" },
  { value: "agua", label: "Agua", color: "#3b82f6" },
  { value: "internet", label: "Internet", color: "#8b5cf6" },
  { value: "telefono", label: "Teléfono", color: "#06b6d4" },
  { value: "imss", label: "IMSS", color: "#ef4444" },
  { value: "nomina", label: "Nómina", color: "#f97316" },
  { value: "renta", label: "Renta", color: "#fb7185" },
  { value: "papeleria", label: "Papelería", color: "#84cc16" },
  { value: "limpieza", label: "Limpieza", color: "#14b8a6" },
  { value: "mantenimiento", label: "Mantenimiento", color: "#64748b" },
  { value: "seguros", label: "Seguros", color: "#6366f1" },
  { value: "otro", label: "Otros", color: "#94a3b8" },
];

export const ADMIN_PAYMENT_METHODS: { value: string; label: string }[] = [
  { value: "transferencia", label: "Transferencia" },
  { value: "efectivo", label: "Efectivo" },
  { value: "tarjeta", label: "Tarjeta" },
  { value: "cheque", label: "Cheque" },
  { value: "domiciliacion", label: "Domiciliación" },
  { value: "otro", label: "Otro" },
];

export type AdminExpenseDisplayStatus = "proximo" | "vence_pronto" | "vencido" | "pagado";

export const ADMIN_EXPENSE_STATUS_LABEL: Record<AdminExpenseDisplayStatus, string> = {
  proximo: "Próximo",
  vence_pronto: "Vence pronto",
  vencido: "Vencido",
  pagado: "Pagado",
};

export const ADMIN_EXPENSE_STATUS_TONE: Record<AdminExpenseDisplayStatus, string> = {
  proximo: "bg-emerald-100 text-emerald-800",
  vence_pronto: "bg-orange-100 text-orange-800",
  vencido: "bg-red-100 text-red-800",
  pagado: "bg-emerald-100 text-emerald-800",
};

export const ADMIN_EXPENSE_STATUS_DOT: Record<AdminExpenseDisplayStatus, string> = {
  proximo: "bg-emerald-500",
  vence_pronto: "bg-orange-500",
  vencido: "bg-red-500",
  pagado: "bg-emerald-500",
};

export type AdminExpenseDocGap = "pendiente_pago" | "pendiente_factura";

export const ADMIN_DOC_GAP_LABEL: Record<AdminExpenseDocGap, string> = {
  pendiente_pago: "Pendiente pago",
  pendiente_factura: "Pendiente factura",
};

/** Falta el PDF de pago, el de factura, o los dos. Cada uno se marca por separado. */
export function adminExpenseDocGaps(files: { kind: string }[]): AdminExpenseDocGap[] {
  const kinds = new Set(files.map((file) => file.kind));
  const gaps: AdminExpenseDocGap[] = [];
  if (!kinds.has("comprobante_pago")) gaps.push("pendiente_pago");
  if (!kinds.has("factura")) gaps.push("pendiente_factura");
  return gaps;
}

const CATEGORY_VALUES = new Set(ADMIN_EXPENSE_CATEGORIES.map((item) => item.value));
const PAYMENT_VALUES = new Set(ADMIN_PAYMENT_METHODS.map((item) => item.value));
const FREQUENCY_VALUES = new Set<CommitmentFrequency>(["unico", "mensual", "bimestral", "trimestral", "anual"]);

export function isAdminCategory(value: string): boolean {
  return CATEGORY_VALUES.has(value);
}

export function isAdminPaymentMethod(value: string): boolean {
  return PAYMENT_VALUES.has(value);
}

export function isAdminFrequency(value: string): value is CommitmentFrequency {
  return FREQUENCY_VALUES.has(value as CommitmentFrequency);
}

export function categoryLabel(value: string): string {
  return ADMIN_EXPENSE_CATEGORIES.find((item) => item.value === value)?.label ?? "Otros";
}

export function paymentMethodLabel(value: string): string {
  return ADMIN_PAYMENT_METHODS.find((item) => item.value === value)?.label ?? value;
}

/** Estatus visible: pagado, vencido, dentro de 7 días, o todavía lejano. */
export function adminExpenseStatus(workflowStatus: string, dueDate: string, from = new Date()): AdminExpenseDisplayStatus {
  if (workflowStatus === "paid") return "pagado";
  const days = daysUntil(dueDate, from);
  if (days < 0) return "vencido";
  if (days <= 7) return "vence_pronto";
  return "proximo";
}

export function mexicoMonthKey(date: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Mexico_City",
    year: "numeric",
    month: "2-digit",
  }).format(date);
  return parts.slice(0, 7);
}

export function addFrequency(date: Date, frequency: string): Date {
  const months = frequency === "mensual" ? 1 : frequency === "bimestral" ? 2 : frequency === "trimestral" ? 3 : frequency === "anual" ? 12 : 0;
  const year = date.getFullYear();
  const month = date.getMonth() + months;
  const day = date.getDate();
  const last = new Date(year, month + 1, 0).getDate();
  return new Date(year, month, Math.min(day, last), 12, 0, 0, 0);
}

export function occurrenceKeyFromDate(date: Date): string {
  return toDateInputValue(date);
}
