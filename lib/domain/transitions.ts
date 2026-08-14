import type { Role, OrderStatus, PaymentType, PaymentLabel } from "./types";
import { INVOICE_UPLOAD_ROLES, EXPEDIENTE_CLOSE_ROLES, statusAfterEngineerApprove } from "./flow";

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

/** Compras (Paty) o Administración (Rosa) actuando con capacidades de Compras. */
export function canActAsCompras(role: Role): boolean {
  return role === "compras" || role === "pagos";
}

export function canCreateOrder(role: Role): boolean {
  return canActAsCompras(role);
}

export function canCreateObra(role: Role): boolean {
  return role === "ingeniero" || role === "pagos";
}

/** Rosa (Administración) tiene permisos elevados de eliminación. */
export function isAdministration(role: Role): boolean {
  return role === "pagos";
}

/** Paty (compras) y Rosa (pagos) pueden crear, editar y eliminar proveedores. */
export function canManageSuppliers(role: Role): boolean {
  return role === "compras" || role === "pagos";
}

export function canManageRecurringCommitments(role: Role): boolean {
  return role === "pagos";
}

/** Contabilidad, Recepción y Administración pueden consultar factura y comprobante. */
export function canConsultPaymentDocuments(role: Role): boolean {
  return role === "pagos" || role === "recepcion" || role === "contabilidad";
}

export function canDeleteObra(role: Role): boolean {
  return isAdministration(role);
}

export function canDeleteOrderFile(role: Role): boolean {
  return isAdministration(role);
}

export function canDeletePayment(role: Role): boolean {
  return isAdministration(role);
}

export function canConfigureObra(role: Role): boolean {
  return role === "ingeniero" || canActAsCompras(role);
}

export function canUpdateDraftOrder(status: OrderStatus, role: Role): boolean {
  return canComprasEditOrder(status, role);
}

/** Estados en los que la OC ya avanzó a pago/factura/cierre y Compras no debe editarla ni borrarla. */
const COMPRAS_LOCKED_STATUSES: OrderStatus[] = [
  "paid",
  "awaitingInvoice",
  "invoiceReceived",
  "completed",
  "difference",
];

/** Compras / Administración pueden editar la OC mientras no haya entrado a pago ni cierre documental. */
export function canComprasEditOrder(status: OrderStatus, role: Role): boolean {
  if (!canActAsCompras(role)) return false;
  return !COMPRAS_LOCKED_STATUSES.includes(status);
}

export function canDeleteOrder(status: OrderStatus, role: Role, amountPaidSoFar: number): boolean {
  if (role === "pagos" || role === "direccion") return true;
  if (role !== "compras") return false;
  if (amountPaidSoFar > 0.01) return false;
  return !COMPRAS_LOCKED_STATUSES.includes(status);
}

export function canSendToEngineer(status: OrderStatus, role: Role): boolean {
  return canActAsCompras(role) && status === "draft";
}

/** Compras / Administración: OC borrador enviada directo a pago (Proceso C, sin Ingeniería). */
export function canSendToAdministration(status: OrderStatus, role: Role): boolean {
  return canActAsCompras(role) && status === "draft";
}

export function canUploadOcPdf(status: OrderStatus, role: Role): boolean {
  return (
    canActAsCompras(role) &&
    (status === "draft" || status === "engineerRejected" || status === "awaitingEngineer")
  );
}

export function canEngineerAct(status: OrderStatus, role: Role): boolean {
  return role === "ingeniero" && status === "awaitingEngineer";
}

export function canSetPaymentDeadline(status: OrderStatus, role: Role): boolean {
  return canActAsCompras(role) && status === "awaitingPatyDeadline";
}

export function canRegisterPayment(status: OrderStatus, role: Role): boolean {
  return role === "pagos" && status === "awaitingPayment";
}

export function canUploadPaymentReceipt(status: OrderStatus, role: Role): boolean {
  return role === "pagos" && (status === "awaitingPayment" || status === "paid");
}

export function canMarkAwaitingInvoice(status: OrderStatus, role: Role): boolean {
  return canActAsCompras(role) && status === "paid";
}

export function canUploadInvoice(status: OrderStatus, role: Role): boolean {
  return INVOICE_UPLOAD_ROLES.includes(role) && (status === "paid" || status === "awaitingInvoice");
}

export function canAccountingValidate(status: OrderStatus, role: Role): boolean {
  return EXPEDIENTE_CLOSE_ROLES.includes(role) && status === "invoiceReceived";
}

export function canAccountingResolveDifference(status: OrderStatus, role: Role): boolean {
  return EXPEDIENTE_CLOSE_ROLES.includes(role) && status === "difference";
}

export function amountRemaining(totalAmount: number, amountPaidSoFar: number): number {
  return Math.max(0, totalAmount - amountPaidSoFar);
}
