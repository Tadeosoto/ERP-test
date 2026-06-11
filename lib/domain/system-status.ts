import type { OrderStatus } from "./types";

export type SystemStatusTone = "orange" | "red" | "green";
export type SystemStatusIcon = "clock" | "x" | "check" | "alert";

export const SYSTEM_STATUS: Record<
  OrderStatus,
  { label: string; subtitle?: string; tone: SystemStatusTone; icon: SystemStatusIcon }
> = {
  awaitingEngineer: {
    label: "Pendiente aprobación",
    tone: "orange",
    icon: "clock",
  },
  engineerRejected: {
    label: "Rechazada",
    tone: "red",
    icon: "x",
  },
  awaitingPatyDeadline: {
    label: "Aprobada",
    tone: "green",
    icon: "check",
  },
  awaitingPayment: {
    label: "Aprobada",
    tone: "green",
    icon: "check",
  },
  paid: {
    label: "Pagada",
    tone: "orange",
    icon: "clock",
  },
  awaitingInvoice: {
    label: "Esperando factura",
    tone: "orange",
    icon: "clock",
  },
  invoiceReceived: {
    label: "Factura recibida",
    tone: "orange",
    icon: "clock",
  },
  completed: {
    label: "Completada",
    subtitle: "Expediente cerrado",
    tone: "green",
    icon: "check",
  },
  difference: {
    label: "Diferencia",
    tone: "red",
    icon: "alert",
  },
};

export const STATUS_TONE_CLASS: Record<SystemStatusTone, string> = {
  orange: "border-orange-300 bg-orange-50 text-orange-900",
  red: "border-red-300 bg-red-50 text-red-800",
  green: "border-emerald-400 bg-emerald-50 text-emerald-800",
};
