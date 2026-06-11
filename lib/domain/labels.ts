import type { Role, OrderStatus, PaymentLabel, PaymentType } from "./types";
import { SYSTEM_STATUS } from "./system-status";

/** Etiquetas de compatibilidad; preferir SystemStatusBadge + SYSTEM_STATUS. */
export const STATUS_LABEL: Record<OrderStatus, string> = Object.fromEntries(
  (Object.entries(SYSTEM_STATUS) as [OrderStatus, (typeof SYSTEM_STATUS)[OrderStatus]][]).map(
    ([k, v]) => [k, v.label]
  )
) as Record<OrderStatus, string>;

export const ROLE_LABEL: Record<Role, string> = {
  pagos: "Administración",
  compras: "Compras",
  ingeniero: "Ingeniería",
  recepcion: "Recepción",
  contabilidad: "Contabilidad",
};

export const PAYMENT_LABEL_TEXT: Record<PaymentLabel, string> = {
  pendiente: "Saldo pendiente",
  saldada: "Saldada",
};

export const PAYMENT_TYPE_TEXT: Record<PaymentType, string> = {
  inmediato: "Pago inmediato (100%)",
  programado: "Pago programado",
  parcialidades: "Pago por parcialidades",
};

export const PAYMENT_TYPE_SHORT: Record<PaymentType, string> = {
  inmediato: "Inmediato",
  programado: "Programado",
  parcialidades: "Parcialidades",
};

export const FILE_KIND_LABEL: Record<string, string> = {
  oc_pdf: "PDF orden de compra",
  comprobante_pago: "Comprobante de pago",
  complemento_pago: "Complemento de pago",
  factura: "Factura",
};

export function roleDisplayName(role: Role, userName?: string): string {
  if (userName) return userName;
  return ROLE_LABEL[role];
}
