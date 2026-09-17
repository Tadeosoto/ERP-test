import type { OrderStatus } from "./types";

export type SystemStatusTone = "orange" | "red" | "green";
export type SystemStatusIcon = "clock" | "x" | "check" | "alert";

export const SYSTEM_STATUS: Record<
  OrderStatus,
  { label: string; subtitle?: string; tone: SystemStatusTone; icon: SystemStatusIcon }
> = {
  draft: {
    label: "Borrador",
    tone: "orange",
    icon: "clock",
  },
  awaitingEngineer: {
    label: "Pendiente aprobación",
    tone: "orange",
    icon: "clock",
  },
  engineerRejected: {
    label: "Corrección solicitada",
    tone: "red",
    icon: "x",
  },
  awaitingPatyDeadline: {
    label: "Fecha de pago",
    subtitle: "Compras define fecha límite",
    tone: "orange",
    icon: "clock",
  },
  awaitingAuthorization: {
    label: "Por autorizar",
    subtitle: "Admin o Dirección",
    tone: "orange",
    icon: "clock",
  },
  awaitingPayment: {
    label: "OC pendiente",
    subtitle: "Órdenes de compra pendientes",
    tone: "orange",
    icon: "clock",
  },
  paid: {
    label: "Saldada",
    subtitle: "Total pagado",
    tone: "green",
    icon: "check",
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
    subtitle: "Orden cerrada",
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
