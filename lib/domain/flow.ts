import type { OrderStatus, Role, PaymentType, OrderProcessKind } from "./types";
import { ROLE_LABEL, PAYMENT_TYPE_TEXT } from "./labels";

export const INVOICE_UPLOAD_ROLES: Role[] = ["compras", "pagos", "recepcion", "contabilidad"];

/** Roles que pueden validar y cerrar expedientes (OC = pago = factura). */
export const EXPEDIENTE_CLOSE_ROLES: Role[] = ["pagos", "recepcion", "contabilidad"];

export type FlowStepDef = {
  step: number;
  shortTitle: string;
  detail: string;
  primaryRole: Role | null;
};

/** Proceso A — OC con aprobación de Ingeniería. */
export const FLOW_STEPS_A: readonly FlowStepDef[] = [
  {
    step: 1,
    shortTitle: "Ingeniería",
    detail: "Santiago crea y envía la solicitud de material (Proceso A)",
    primaryRole: "ingeniero",
  },
  {
    step: 2,
    shortTitle: "Compras",
    detail: "Paty cotiza, crea la OC en CONTPAQi, sube el PDF y define la modalidad de pago",
    primaryRole: "compras",
  },
  {
    step: 3,
    shortTitle: "Ingeniería",
    detail: "Santiago revisa el PDF de la OC y aprueba o solicita corrección",
    primaryRole: "ingeniero",
  },
  {
    step: 4,
    shortTitle: "Administración",
    detail: "Carolina realiza el pago y sube el comprobante",
    primaryRole: "pagos",
  },
  {
    step: 5,
    shortTitle: "Compras",
    detail: "Paty envía comprobante al proveedor y solicita factura",
    primaryRole: "compras",
  },
  {
    step: 6,
    shortTitle: "Factura",
    detail: "Compras, Administración, Recepción o Contabilidad suben el PDF de la factura",
    primaryRole: null,
  },
  {
    step: 7,
    shortTitle: "Contabilidad",
    detail: "Helena valida OC = Pago = Factura y cierra el expediente",
    primaryRole: "contabilidad",
  },
] as const;

/** Proceso C — OC enviada directo a Administración / Carolina (sin Ingeniería). */
export const FLOW_STEPS_C: readonly FlowStepDef[] = [
  {
    step: 1,
    shortTitle: "Compras",
    detail: "Paty registra la OC y la envía a Administración (Proceso C)",
    primaryRole: "compras",
  },
  {
    step: 2,
    shortTitle: "Administración",
    detail: "Carolina realiza el pago y sube el comprobante",
    primaryRole: "pagos",
  },
  {
    step: 3,
    shortTitle: "Compras",
    detail: "Paty envía comprobante al proveedor y solicita factura",
    primaryRole: "compras",
  },
  {
    step: 4,
    shortTitle: "Factura",
    detail: "Compras, Administración, Recepción o Contabilidad suben el PDF de la factura",
    primaryRole: null,
  },
  {
    step: 5,
    shortTitle: "Contabilidad",
    detail: "Helena valida OC = Pago = Factura y cierra el expediente",
    primaryRole: "contabilidad",
  },
] as const;

/** Proceso B — Gasto directo sin OC. */
export const FLOW_STEPS_B: readonly FlowStepDef[] = [
  {
    step: 1,
    shortTitle: "Ingeniería",
    detail: "Santiago registra el gasto directo",
    primaryRole: "ingeniero",
  },
  {
    step: 2,
    shortTitle: "Administración",
    detail: "Carolina paga y sube el comprobante",
    primaryRole: "pagos",
  },
  {
    step: 3,
    shortTitle: "Factura",
    detail: "Se carga la factura del proveedor",
    primaryRole: null,
  },
  {
    step: 4,
    shortTitle: "Cierre",
    detail: "Validación y cierre del expediente",
    primaryRole: "contabilidad",
  },
] as const;

/** @deprecated Usar FLOW_STEPS_A; se mantiene como alias del Proceso A. */
export const FLOW_STEPS = FLOW_STEPS_A;

export function flowStepsForProcess(kind: OrderProcessKind | "b" = "a"): readonly FlowStepDef[] {
  if (kind === "c") return FLOW_STEPS_C;
  if (kind === "b") return FLOW_STEPS_B;
  return FLOW_STEPS_A;
}

export function flowPhaseNumber(status: OrderStatus, kind: OrderProcessKind = "a"): number {
  if (kind === "c") {
    switch (status) {
      case "awaitingPatyDeadline":
      case "awaitingPayment":
        return 2;
      case "paid":
        return 3;
      case "awaitingInvoice":
        return 4;
      case "invoiceReceived":
      case "difference":
        return 5;
      case "completed":
        return 6;
      case "draft":
      default:
        return 1;
    }
  }

  switch (status) {
    case "awaitingEngineer":
      return 3;
    case "engineerRejected":
      return 2;
    case "awaitingPatyDeadline":
    case "awaitingPayment":
      return 4;
    case "paid":
      return 5;
    case "awaitingInvoice":
      return 6;
    case "invoiceReceived":
    case "difference":
      return 7;
    case "completed":
      return 8;
    default:
      return 2;
  }
}

export function flowProgressPercent(status: OrderStatus, kind: OrderProcessKind = "a"): number {
  if (status === "completed") return 100;
  const steps = flowStepsForProcess(kind);
  const phase = flowPhaseNumber(status, kind);
  return Math.round(((phase - 1) / steps.length) * 100);
}

export function isFlowComplete(status: OrderStatus): boolean {
  return status === "completed";
}

export function getPendingRoles(status: OrderStatus): Role[] {
  switch (status) {
    case "awaitingEngineer":
      return ["ingeniero"];
    case "engineerRejected":
    case "awaitingPatyDeadline":
    case "paid":
      /** Compras y Administración (puede actuar como Compras). */
      return ["compras", "pagos"];
    case "awaitingPayment":
      return ["pagos"];
    case "awaitingInvoice":
      return INVOICE_UPLOAD_ROLES;
    case "invoiceReceived":
    case "difference":
      return [...EXPEDIENTE_CLOSE_ROLES];
    case "completed":
      return [];
    default:
      return [];
  }
}

export function getPendingRole(status: OrderStatus): Role | null {
  return getPendingRoles(status)[0] ?? null;
}

export function formatPendingRoles(status: OrderStatus): string {
  const roles = getPendingRoles(status);
  if (roles.length === 0) return "—";
  return roles.map((r) => ROLE_LABEL[r]).join(" / ");
}

export function canRoleAdvance(role: Role, status: OrderStatus): boolean {
  return getPendingRoles(status).includes(role);
}

export function describeGate(status: OrderStatus, paymentType?: PaymentType | null): string {
  switch (status) {
    case "awaitingEngineer":
      return "Le toca a Ingeniería revisar y aprobar la orden de compra.";
    case "engineerRejected":
      return "Ingeniería solicitó correcciones. Compras debe actualizar y volver a enviar el PDF.";
    case "awaitingPatyDeadline":
      return "Paty debe indicar la fecha límite de pago para Administración (orden programada).";
    case "awaitingPayment":
      if (paymentType === "inmediato") {
        return "Administración debe saldar el 100% y subir el comprobante de pago.";
      }
      if (paymentType === "programado") {
        return "Administración debe registrar el pago completo antes de la fecha límite.";
      }
      if (paymentType === "parcialidades") {
        return "Administración debe registrar abonos hasta completar el total.";
      }
      return "Administración debe gestionar el pago de la orden.";
    case "paid":
      return "Compras debe enviar el comprobante al proveedor, solicitar la factura y marcar «Esperando factura».";
    case "awaitingInvoice":
      return "Compras, Administración, Recepción o Contabilidad pueden subir el PDF de la factura.";
    case "invoiceReceived":
      return "Administración, Recepción o Contabilidad deben validar que OC = Pago = Factura.";
    case "difference":
      return "Hay una diferencia. Administración, Recepción o Contabilidad deben revisar y resolver.";
    case "completed":
      return "Expediente cerrado. Todos pueden consultar y descargar.";
    default:
      return "";
  }
}

export function sessionHintForCase(
  viewerRole: Role,
  status: OrderStatus,
  canAdvance: boolean
): string {
  if (isFlowComplete(status)) {
    return "Este expediente ya está completo. Puedes ver y descargar los documentos.";
  }
  if (canAdvance) {
    return "Te corresponde avanzar: usa los botones de «Tu tarea» más abajo.";
  }
  const pending = getPendingRoles(status);
  if (pending.length > 1) {
    return `Ahora le toca a ${formatPendingRoles(status)}. Puedes seguir el avance aquí.`;
  }
  const area = pending[0] ? ROLE_LABEL[pending[0]] : "otra área";
  return `Ahora le toca a ${area}. Puedes seguir el avance aquí; solo quien corresponde puede modificar.`;
}

export function rolePlaybook(role: Role): string[] {
  switch (role) {
    case "compras":
      return [
        "Recibe solicitudes de Ingeniería, cotiza y registra la OC con PDF.",
        "Define si el pago será inmediato, a 30 días o por parcialidades.",
        "Tras el pago, coordinar con el proveedor y marcar «Esperando factura».",
      ];
    case "ingeniero":
      return [
        "Crea obras y vincula solicitudes de material (Proceso A) o gasto directo (Proceso B).",
        "Revisa el PDF de la OC que envía Compras y aprueba o solicita corrección.",
      ];
    case "pagos":
      return [
        "Registrar el pago y subir el comprobante bancario.",
        "También puedes subir la factura del proveedor si hace falta.",
      ];
    case "recepcion":
      return [
        "Subir el PDF de la factura cuando llegue del proveedor.",
        "Consultar expedientes completados.",
      ];
    case "contabilidad":
      return [
        "Validar que OC, pago y factura coinciden.",
        "Cerrar el expediente o marcar diferencia si algo no cuadra.",
      ];
    case "direccion":
      return [
        "Consultar el resumen de gastos, pagos y expedientes del consorcio.",
        "Dar seguimiento a autorizaciones pendientes y actividad del equipo.",
      ];
    default:
      return [];
  }
}

export function paymentTypeDescription(type: PaymentType): string {
  return PAYMENT_TYPE_TEXT[type];
}

export function statusAfterEngineerApprove(
  paymentType: PaymentType,
  suggestedParcialidades: boolean
): OrderStatus {
  const effective =
    suggestedParcialidades && paymentType !== "programado" ? "parcialidades" : paymentType;
  if (effective === "programado") return "awaitingPatyDeadline";
  return "awaitingPayment";
}

export function resolveEngineerPaymentType(
  engineerChoice: PaymentType,
  suggestedPaymentType: PaymentType | null
): PaymentType {
  if (suggestedPaymentType === "parcialidades") return "parcialidades";
  return engineerChoice;
}
