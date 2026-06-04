import type { Role, OrderStatus, PaymentType, PaymentLabel } from "./types";
import { statusAfterEngineerApprove } from "./flow";

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

export function afterEngineerReject(): OrderStatus {
  return "engineerRejected";
}

export function afterPatySetsDeadline(): OrderStatus {
  return "awaitingPayment";
}

export function afterOcPdfReuploaded(): OrderStatus {
  return "awaitingEngineer";
}

export function afterFinalDocsUploaded(): OrderStatus {
  return "completed";
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
    status: fullyPaid ? "awaitingFinalDocs" : "awaitingPayment",
    fullyPaid,
  };
}

export function engineerApproveNextStatus(
  engineerPaymentType: PaymentType,
  suggestedPaymentType: PaymentType | null
): { status: OrderStatus; paymentType: PaymentType } {
  const paymentType =
    suggestedPaymentType === "parcialidades" ? "parcialidades" : engineerPaymentType;
  const status = statusAfterEngineerApprove(paymentType, suggestedPaymentType === "parcialidades");
  return { status, paymentType };
}

export function canCreateOrder(role: Role): boolean {
  return role === "compras";
}

export function canUploadOcPdf(status: OrderStatus, role: Role): boolean {
  return role === "compras" && (status === "engineerRejected" || status === "awaitingEngineer");
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

export function canUploadFinalDocs(status: OrderStatus, role: Role): boolean {
  return role === "compras" && status === "awaitingFinalDocs";
}

export function amountRemaining(totalAmount: number, amountPaidSoFar: number): number {
  return Math.max(0, totalAmount - amountPaidSoFar);
}
