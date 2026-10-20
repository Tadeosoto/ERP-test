/** Semana laboral MX y vencimientos para «Pendientes semanales» / pagos del viernes. */

export const DELIVERY_STATUSES = [
  "pedido",
  "en_camino",
  "entrega_parcial",
  "surtido_completo",
] as const;

export type DeliveryStatus = (typeof DELIVERY_STATUSES)[number];

export const DELIVERY_STATUS_LABEL: Record<DeliveryStatus, string> = {
  pedido: "Pedido",
  en_camino: "En camino",
  entrega_parcial: "Entrega parcial",
  surtido_completo: "Surtido completo",
};

export type FridayInvoiceStatus = "vencida" | "vence_semana" | "programada";

const MX_TZ = "America/Mexico_City";

/** YYYY-MM-DD en zona México. */
export function dateKeyInMx(d: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: MX_TZ }).format(d);
}

function parseYmd(ymd: string): { y: number; m: number; d: number } | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd.trim());
  if (!m) return null;
  return { y: Number(m[1]), m: Number(m[2]), d: Number(m[3]) };
}

/** Medianoche UTC del día civil MX (para comparar solo fechas). */
export function mxDayUtc(ymd: string): Date {
  const p = parseYmd(ymd);
  if (!p) return new Date(NaN);
  return new Date(Date.UTC(p.y, p.m - 1, p.d));
}

export function addCalendarDaysYmd(ymd: string, days: number): string {
  const base = mxDayUtc(ymd);
  base.setUTCDate(base.getUTCDate() + days);
  const y = base.getUTCFullYear();
  const m = String(base.getUTCMonth() + 1).padStart(2, "0");
  const d = String(base.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Lunes (YYYY-MM-DD) de la semana que contiene `anchorYmd` (lun–dom). */
export function mondayOfWeekContaining(anchorYmd: string): string {
  const day = mxDayUtc(anchorYmd);
  const dow = day.getUTCDay();
  const offset = dow === 0 ? -6 : 1 - dow;
  return addCalendarDaysYmd(anchorYmd, offset);
}

export function sundayOfWeek(mondayYmd: string): string {
  return addCalendarDaysYmd(mondayYmd, 6);
}

/** Viernes de esa semana. */
export function fridayOfWeek(mondayYmd: string): string {
  return addCalendarDaysYmd(mondayYmd, 4);
}

export function shiftWeek(mondayYmd: string, deltaWeeks: number): string {
  return addCalendarDaysYmd(mondayYmd, deltaWeeks * 7);
}

export function formatWeekRangeLabel(mondayYmd: string): string {
  const sun = sundayOfWeek(mondayYmd);
  const fmt = (ymd: string) => {
    const p = parseYmd(ymd);
    if (!p) return ymd;
    return new Intl.DateTimeFormat("es-MX", {
      day: "numeric",
      month: "short",
      timeZone: "UTC",
    }).format(new Date(Date.UTC(p.y, p.m - 1, p.d)));
  };
  return `${fmt(mondayYmd)} – ${fmt(sun)}`;
}

export function parseTermsDaysFromText(paymentTerms: string | null | undefined): number | null {
  if (!paymentTerms) return null;
  const m = paymentTerms.match(/(\d+)\s*d[ií]as/i);
  if (!m) return null;
  const n = Number(m[1]);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function resolvePaymentTermsDays(opts: {
  supplierTermsDays?: number | null;
  paymentTermsText?: string | null;
}): number {
  if (opts.supplierTermsDays != null && opts.supplierTermsDays > 0) {
    return opts.supplierTermsDays;
  }
  return parseTermsDaysFromText(opts.paymentTermsText) ?? 30;
}

export function isoToYmd(iso: string | Date | null | undefined): string | null {
  if (!iso) return null;
  const d = typeof iso === "string" ? new Date(iso) : iso;
  if (Number.isNaN(d.getTime())) return null;
  return dateKeyInMx(d);
}

export function computeInvoiceDueYmd(opts: {
  invoiceDateYmd: string;
  termsDays: number;
}): string {
  return addCalendarDaysYmd(opts.invoiceDateYmd, opts.termsDays);
}

export function fridayInvoiceListStatus(opts: {
  dueYmd: string;
  todayYmd: string;
  weekMondayYmd: string;
  hasActiveSchedule: boolean;
}): FridayInvoiceStatus {
  if (opts.hasActiveSchedule) return "programada";
  if (opts.dueYmd < opts.todayYmd) return "vencida";
  const weekEnd = sundayOfWeek(opts.weekMondayYmd);
  if (opts.dueYmd >= opts.weekMondayYmd && opts.dueYmd <= weekEnd) return "vence_semana";
  return "vence_semana";
}

export const FRIDAY_STATUS_LABEL: Record<FridayInvoiceStatus, string> = {
  vencida: "Vencida",
  vence_semana: "Vence esta semana",
  programada: "Programada",
};

/** Incluye en revisión de la semana: vencidas o con vencimiento lun–dom de esa semana. */
export function belongsInFridayReview(opts: {
  dueYmd: string;
  weekMondayYmd: string;
}): boolean {
  const weekEnd = sundayOfWeek(opts.weekMondayYmd);
  return opts.dueYmd <= weekEnd;
}

export function asDeliveryStatus(value: string | null | undefined): DeliveryStatus {
  if (value && (DELIVERY_STATUSES as readonly string[]).includes(value)) {
    return value as DeliveryStatus;
  }
  return "pedido";
}
