import type { OrderStatus, Role, PaymentType, PaymentLabel } from "./types";
import { ROLE_LABEL, PAYMENT_TYPE_TEXT } from "./labels";

export const FLOW_STEPS: readonly {
  step: number;
  shortTitle: string;
  detail: string;
  primaryRole: Role | null;
}[] = [
  {
    step: 1,
    shortTitle: "OC",
    detail: "Paty crea la orden y sube el PDF",
    primaryRole: "compras",
  },
  {
    step: 2,
    shortTitle: "Ingeniería",
    detail: "Santiago verifica y aprueba (define modalidad de pago)",
    primaryRole: "ingeniero",
  },
  {
    step: 3,
    shortTitle: "Fecha",
    detail: "Si es programado, Paty indica la fecha límite a Carolina",
    primaryRole: "compras",
  },
  {
    step: 4,
    shortTitle: "Pagos",
    detail: "Carolina paga (inmediato, programado o abonos)",
    primaryRole: "pagos",
  },
  {
    step: 5,
    shortTitle: "Documentos",
    detail: "Paty sube factura y complemento si aplica",
    primaryRole: "compras",
  },
  {
    step: 6,
    shortTitle: "Cierre",
    detail: "Todos consultan y descargan",
    primaryRole: null,
  },
] as const;

export function flowPhaseNumber(status: OrderStatus): number {
  switch (status) {
    case "awaitingEngineer":
      return 2;
    case "engineerRejected":
      return 1;
    case "awaitingPatyDeadline":
      return 3;
    case "awaitingPayment":
      return 4;
    case "awaitingFinalDocs":
      return 5;
    case "completed":
      return 6;
    default:
      return 1;
  }
}

export function flowProgressPercent(status: OrderStatus): number {
  const phase = flowPhaseNumber(status);
  if (status === "completed") return 100;
  return Math.round(((phase - 1) / FLOW_STEPS.length) * 100);
}

export function isFlowComplete(status: OrderStatus): boolean {
  return status === "completed";
}

export function getPendingRole(status: OrderStatus): Role | null {
  switch (status) {
    case "awaitingEngineer":
      return "ingeniero";
    case "engineerRejected":
    case "awaitingPatyDeadline":
      return "compras";
    case "awaitingPayment":
      return "pagos";
    case "awaitingFinalDocs":
      return "compras";
    case "completed":
      return null;
    default:
      return null;
  }
}

export function canRoleAdvance(role: Role, status: OrderStatus): boolean {
  return getPendingRole(status) === role;
}

export function describeGate(status: OrderStatus, paymentType?: PaymentType | null): string {
  switch (status) {
    case "awaitingEngineer":
      return "Le toca a Santiago revisar la orden de compra.";
    case "engineerRejected":
      return "Santiago pidió correcciones. Paty debe actualizar y volver a enviar el PDF.";
    case "awaitingPatyDeadline":
      return "Paty debe indicar la fecha límite de pago para Carolina (orden programada).";
    case "awaitingPayment":
      if (paymentType === "inmediato") {
        return "Le toca a Carolina saldar el 100% de la orden (pago inmediato).";
      }
      if (paymentType === "programado") {
        return "Le toca a Carolina realizar el pago completo antes de la fecha límite.";
      }
      if (paymentType === "parcialidades") {
        return "Le toca a Carolina registrar abonos hasta completar el total.";
      }
      return "Le toca a Carolina gestionar el pago de la orden.";
    case "awaitingFinalDocs":
      return "Le toca a Paty subir la factura (y complemento si aplica).";
    case "completed":
      return "Proceso terminado. Todos pueden consultar y descargar.";
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
    return "Esta orden ya está completa. Puedes ver y descargar los documentos.";
  }
  if (canAdvance) {
    return "Te corresponde avanzar: usa los botones de «Tu tarea» más abajo.";
  }
  const pending = getPendingRole(status);
  const area = pending ? ROLE_LABEL[pending] : "otra área";
  return `Ahora le toca a ${area}. Puedes seguir el avance aquí; solo quien corresponde puede modificar.`;
}

export function rolePlaybook(role: Role): string[] {
  switch (role) {
    case "compras":
      return [
        "Crear obras y entrar a cada una para ver sus órdenes y configurar nombre o estado.",
        "Crear la orden de compra tras negociar con proveedores y subir el PDF.",
        "Si la orden es por parcialidades, indícalo al crear la OC.",
        "Si ingeniería la marca como programada, indica la fecha límite de pago a Carolina.",
        "Al final, subir factura (obligatorio) y complemento de pago si aplica.",
      ];
    case "ingeniero":
      return [
        "Revisar el PDF y los datos de la orden.",
        "Aprobar indicando si el pago será inmediato o programado (parcialidades si Paty ya lo indicó).",
      ];
    case "pagos":
      return [
        "Tras la aprobación de ingeniería, pagar según la modalidad: inmediato, programado o abonos parciales.",
        "Llevar el control de cuánto se ha pagado y cuánto falta.",
      ];
    case "recepcion":
      return ["Recibir aviso cuando Paty suba documentos finales y descargarlos."];
    case "contabilidad":
      return ["Recibir aviso cuando Paty suba documentos finales y descargarlos."];
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
