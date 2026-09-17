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

/**
 * Proceso A — Flujo general de OC por obra.
 * Fin operativo: total de la OC saldado (registro de OC + pagos/documentos).
 */
export const FLOW_STEPS_A: readonly FlowStepDef[] = [
  {
    step: 1,
    shortTitle: "Obra",
    detail: "Se crea la obra y se designa el equipo de ingenieros involucrados",
    primaryRole: "ingeniero",
  },
  {
    step: 2,
    shortTitle: "Solicitud",
    detail: "El ingeniero pide a Compras la cantidad y el material que necesita",
    primaryRole: "ingeniero",
  },
  {
    step: 3,
    shortTitle: "Compras",
    detail: "Paty arma la OC, elige proveedor, define plazos y envía el PDF a Ingeniería",
    primaryRole: "compras",
  },
  {
    step: 4,
    shortTitle: "Ingeniería",
    detail: "El ingeniero revisa, aprueba con PDF firmado o pide corrección a Compras",
    primaryRole: "ingeniero",
  },
  {
    step: 5,
    shortTitle: "Autorización",
    detail: "Carolina o Diomedes revisan la OC; el primero que aprueba avanza",
    primaryRole: "pagos",
  },
  {
    step: 6,
    shortTitle: "Pago",
    detail: "Queda lista para pagar; Carolina registra pagos y comprobantes hasta saldar",
    primaryRole: "pagos",
  },
  {
    step: 7,
    shortTitle: "Saldada",
    detail: "Total pagado. Compras coordina factura con el proveedor; todos consultan documentos",
    primaryRole: "compras",
  },
] as const;

/** Proceso C — Factura primero (Dirección inicia); OC sin paso de Ingeniería. */
export const FLOW_STEPS_C: readonly FlowStepDef[] = [
  {
    step: 1,
    shortTitle: "Dirección",
    detail: "Diomedes registra la factura (PDF) y solicita apertura de expediente (Proceso C)",
    primaryRole: "direccion",
  },
  {
    step: 2,
    shortTitle: "Administración",
    detail: "Carolina revisa la factura y solicita la OC a Compras",
    primaryRole: "pagos",
  },
  {
    step: 3,
    shortTitle: "Compras",
    detail: "Paty genera la OC vinculada y la envía a Administración (sin Ingeniería)",
    primaryRole: "compras",
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
    detail: "Paty envía comprobante al proveedor y confirma la documentación",
    primaryRole: "compras",
  },
  {
    step: 6,
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
        return 4;
      case "paid":
        return 5;
      case "awaitingInvoice":
        return 5;
      case "invoiceReceived":
      case "difference":
        return 6;
      case "completed":
        return 7;
      case "draft":
      default:
        return 3;
    }
  }

  switch (status) {
    case "draft":
    case "engineerRejected":
      return 3;
    case "awaitingEngineer":
      return 4;
    case "awaitingPatyDeadline":
    case "awaitingAuthorization":
      return 5;
    case "awaitingPayment":
      return 6;
    case "paid":
    case "awaitingInvoice":
    case "invoiceReceived":
    case "difference":
    case "completed":
      return 7;
    default:
      return 3;
  }
}

export function flowProgressPercent(status: OrderStatus, kind: OrderProcessKind = "a"): number {
  if (status === "completed") return 100;
  if (
    kind === "a" &&
    (status === "paid" || status === "awaitingInvoice" || status === "invoiceReceived")
  ) {
    return 100;
  }
  const steps = flowStepsForProcess(kind);
  const phase = flowPhaseNumber(status, kind);
  return Math.round(((phase - 1) / steps.length) * 100);
}

export function isFlowComplete(status: OrderStatus): boolean {
  return status === "completed";
}

/** Fin operativo del Proceso A: OC saldada (pagos registrados; factura puede seguir en curso). */
export function isProcessASettled(status: OrderStatus): boolean {
  return (
    status === "paid" ||
    status === "awaitingInvoice" ||
    status === "invoiceReceived" ||
    status === "completed"
  );
}

export function getPendingRoles(status: OrderStatus): Role[] {
  switch (status) {
    case "awaitingEngineer":
      return ["ingeniero"];
    case "engineerRejected":
    case "awaitingPatyDeadline":
    case "paid":
      return ["compras", "pagos"];
    case "awaitingAuthorization":
      return ["pagos", "direccion"];
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
      return "Ingeniería revisa la OC, sube el PDF firmado y aprueba, o pide corrección a Compras.";
    case "engineerRejected":
      return "Ingeniería pidió correcciones. Compras actualiza la OC y la vuelve a enviar.";
    case "awaitingPatyDeadline":
      return "Compras indica la fecha límite de pago; luego pasa a autorización de Admin o Dirección.";
    case "awaitingAuthorization":
      return "Carolina o Diomedes autorizan la OC. El primero que aprueba avanza a listo para pagar.";
    case "awaitingPayment":
      if (paymentType === "parcialidades") {
        return "OC autorizada / lista para pagar. Carolina registra abonos y comprobantes hasta saldar.";
      }
      if (paymentType === "programado") {
        return "OC lista para pagar. Carolina registra el pago completo antes de la fecha límite.";
      }
      return "OC lista para pagar. Carolina registra el pago y sube el comprobante.";
    case "paid":
      return "Total saldado. Compras envía comprobante al proveedor y registra la factura.";
    case "awaitingInvoice":
      return "Pueden subir el PDF de la factura del proveedor. La OC ya está saldada.";
    case "invoiceReceived":
      return "Factura registrada. Pueden consultar documentos de la OC y los pagos.";
    case "difference":
      return "Hay una diferencia documental. Administración o Contabilidad deben revisar.";
    case "completed":
      return "Documentación completa. Todos pueden consultar y descargar.";
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
        "Recibe solicitudes de materiales, elige proveedor y arma la OC con plazos y PDF.",
        "Si Ingeniería pide corrección, actualiza y reenvía la OC.",
        "Tras el pago, manda el comprobante al proveedor y registra la factura.",
      ];
    case "ingeniero":
      return [
        "Crea obras y designa el equipo de ingenieros involucrados.",
        "Solicita materiales (cantidad + material) solo en tus obras.",
        "Aprueba la OC con PDF firmado o pide corrección a Compras.",
      ];
    case "pagos":
      return [
        "Autoriza OC (tú o Dirección; un sí basta) y registra pagos con comprobante.",
        "Si hay plazos, sube comprobantes hasta saldar el total de la OC.",
        "Los compromisos recurrentes son un proceso aparte de servicios.",
      ];
    case "recepcion":
      return [
        "Subir el PDF de la factura cuando llegue del proveedor.",
        "Consultar expedientes y documentos de pago por obra.",
      ];
    case "contabilidad":
      return [
        "Consultar OC, pagos y facturas por obra.",
        "Apoyar si hay diferencias documentales.",
      ];
    case "direccion":
      return [
        "Autoriza OC junto con Administración (el primero que aprueba avanza).",
        "Consulta pagos, saldos y documentos por obra.",
        "Compromisos y Proceso C se manejan aparte cuando aplique.",
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
  suggestedParcialidades: boolean,
  hasPaymentDueDate = false
): OrderStatus {
  const effective =
    suggestedParcialidades && paymentType !== "programado" ? "parcialidades" : paymentType;
  if (effective === "programado" && !hasPaymentDueDate) return "awaitingPatyDeadline";
  return "awaitingAuthorization";
}

export function resolveEngineerPaymentType(
  engineerChoice: PaymentType,
  suggestedPaymentType: PaymentType | null
): PaymentType {
  if (suggestedPaymentType === "parcialidades") return "parcialidades";
  return engineerChoice;
}
