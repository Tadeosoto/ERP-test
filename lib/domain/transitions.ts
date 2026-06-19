import type { Role, OrderStatus, PaymentType, PaymentLabel } from "./types";
import { INVOICE_UPLOAD_ROLES, statusAfterEngineerApprove } from "./flow";

export function createDraftOrder(): {
  totalAmount: number;
  amountPaidSoFar: number;
  paymentLabel: PaymentLabel;
  suggestedPaymentType: PaymentType | null;
  status: OrderStatus;
} {
  return {
    totalAmount: 0,
    amountPaidSoFar: 0,
    paymentLabel: "pendiente",
    suggestedPaymentType: null,
    status: "draft",
  };
}

export function createOrderByCompras(input: {
  totalAmount: number;
  suggestedPaymentType?: PaymentType | null;
}): {
  totalAmount: number;
  amountPaidSoFar: number;
  paymentLabel: PaymentLabel;
  suggestedPaymentType: PaymentType | null;
  status: OrderStatus;
} {
  if (input.totalAmount <= 0) throw new Error("El total de la orden debe ser mayor a cero.");
  return {
    totalAmount: input.totalAmount,
    amountPaidSoFar: 0,
    paymentLabel: "pendiente",
    suggestedPaymentType: input.suggestedPaymentType ?? null,
    status: "awaitingEngineer",
  };
}

export function afterSendToEngineer(): OrderStatus {
  return "awaitingEngineer";
}

export function afterEngineerReject(): OrderStatus {
  return "engineerRejected";
}

export function afterPatySetsDeadline(): OrderStatus {
  return "awaitingPayment";
}

export function afterOcPdfReuploaded(): OrderStatus {
  return "awaitingEngineer";
}

export function afterFullPayment(): OrderStatus {
  return "paid";
}

export function afterMarkAwaitingInvoice(): OrderStatus {
  return "awaitingInvoice";
}

export function afterInvoiceUploaded(): OrderStatus {
  return "invoiceReceived";
}

export function afterAccountingComplete(): OrderStatus {
  return "completed";
}

export function afterAccountingDifference(): OrderStatus {
  return "difference";
}

export function computePaymentLabel(totalAmount: number, amountPaidSoFar: number): PaymentLabel {
  return amountPaidSoFar >= totalAmount - 0.01 ? "saldada" : "pendiente";
}

export function registerPaymentAmount(input: {
  totalAmount: number;
  currentPaid: number;
  paymentAmount: number;
  paymentType: PaymentType;
}): {
  amountPaidSoFar: number;
  paymentLabel: PaymentLabel;
  status: OrderStatus;
  fullyPaid: boolean;
} {
  if (input.paymentAmount <= 0) throw new Error("El monto del abono debe ser mayor a cero.");
  const amountPaidSoFar = input.currentPaid + input.paymentAmount;
  if (amountPaidSoFar > input.totalAmount + 0.01) {
    throw new Error("El abono supera el total pendiente de la orden.");
  }
  const fullyPaid = amountPaidSoFar >= input.totalAmount - 0.01;
  const paymentLabel = computePaymentLabel(input.totalAmount, amountPaidSoFar);

  if (input.paymentType === "inmediato" && !fullyPaid) {
    throw new Error("Pago inmediato: debe saldarse el 100% en un solo registro.");
  }
  if (input.paymentType === "programado" && !fullyPaid) {
    throw new Error("Pago programado: debe registrarse el monto total de la orden.");
  }

  return {
    amountPaidSoFar: fullyPaid ? input.totalAmount : amountPaidSoFar,
    paymentLabel: fullyPaid ? "saldada" : "pendiente",
    status: fullyPaid ? "paid" : "awaitingPayment",
    fullyPaid,
  };
}

export function engineerApproveNextStatus(
  paymentType: PaymentType
): { status: OrderStatus; paymentType: PaymentType } {
  const status = statusAfterEngineerApprove(paymentType, paymentType === "parcialidades");
  return { status, paymentType };
}

export function canCreateOrder(role: Role): boolean {
  return role === "compras";
}

export function canCreateObra(role: Role): boolean {
  return role === "ingeniero";
}

export function canConfigureObra(role: Role): boolean {
  return role === "ingeniero" || role === "compras";
}

export function canUpdateDraftOrder(status: OrderStatus, role: Role): boolean {
  return canComprasEditOrder(status, role);
}

/** Compras puede editar borradores y OCs devueltas por corrección de Ingeniería. */
export function canComprasEditOrder(status: OrderStatus, role: Role): boolean {
  return role === "compras" && (status === "draft" || status === "engineerRejected");
}

export function canDeleteOrder(status: OrderStatus, role: Role, amountPaidSoFar: number): boolean {
  if (role !== "compras") return false;
  if (amountPaidSoFar > 0.01) return false;
  return status === "draft" || status === "engineerRejected";
}

export function canSendToEngineer(status: OrderStatus, role: Role): boolean {
  return role === "compras" && status === "draft";
}

export function canUploadOcPdf(status: OrderStatus, role: Role): boolean {
  return role === "compras" && (status === "draft" || status === "engineerRejected" || status === "awaitingEngineer");
}

export function canEngineerAct(status: OrderStatus, role: Role): boolean {
  return role === "ingeniero" && status === "awaitingEngineer";
}

export function canSetPaymentDeadline(status: OrderStatus, role: Role): boolean {
  return role === "compras" && status === "awaitingPatyDeadline";
}

export function canRegisterPayment(status: OrderStatus, role: Role): boolean {
  return role === "pagos" && status === "awaitingPayment";
}

export function canUploadPaymentReceipt(status: OrderStatus, role: Role): boolean {
  return role === "pagos" && (status === "awaitingPayment" || status === "paid");
}

export function canMarkAwaitingInvoice(status: OrderStatus, role: Role): boolean {
  return role === "compras" && status === "paid";
}

export function canUploadInvoice(status: OrderStatus, role: Role): boolean {
  return INVOICE_UPLOAD_ROLES.includes(role) && (status === "paid" || status === "awaitingInvoice");
}

export function canAccountingValidate(status: OrderStatus, role: Role): boolean {
  return role === "contabilidad" && status === "invoiceReceived";
}

export function canAccountingResolveDifference(status: OrderStatus, role: Role): boolean {
  return role === "contabilidad" && status === "difference";
}

export function amountRemaining(totalAmount: number, amountPaidSoFar: number): number {
  return Math.max(0, totalAmount - amountPaidSoFar);
}
