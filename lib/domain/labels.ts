import type { Role, OrderStatus, PaymentLabel, PaymentType } from "./types";

export const ROLE_LABEL: Record<Role, string> = {
  pagos: "Pagos",
  compras: "Compras",
  ingeniero: "Ingeniero",
  recepcion: "Recepción",
  contabilidad: "Contabilidad",
};

export const STATUS_LABEL: Record<OrderStatus, string> = {
  awaitingEngineer: "En revisión de ingeniería",
  engineerRejected: "Correcciones solicitadas",
  awaitingPatyDeadline: "Paty debe indicar fecha límite de pago",
  awaitingPayment: "Pendiente de pago (Carolina)",
  awaitingFinalDocs: "Esperando factura y documentos",
  completed: "Completada",
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

export const FILE_KIND_LABEL: Record<string, string> = {
  oc_pdf: "PDF orden de compra",
  complemento_pago: "Complemento de pago",
  factura: "Factura",
};

export function roleDisplayName(role: Role, userName?: string): string {
  if (userName) return userName;
  return ROLE_LABEL[role];
}
