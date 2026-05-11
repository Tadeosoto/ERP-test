import type { CaseStatus, Role } from "./types";
import { ROLE_LABEL } from "./labels";

/** Etapas numeradas del diagrama (misma lógica que la línea de tiempo del expediente). */
export const FLOW_STEPS: readonly {
  step: number;
  shortTitle: string;
  detail: string;
  primaryRole: Role | null;
}[] = [
  {
    step: 1,
    shortTitle: "OC",
    detail: "Costos crea y envía la orden de compra",
    primaryRole: "costos",
  },
  {
    step: 2,
    shortTitle: "Ingeniería",
    detail: "Visto bueno técnico",
    primaryRole: "ingeniero",
  },
  {
    step: 3,
    shortTitle: "Pagos",
    detail: "Pago al proveedor",
    primaryRole: "pagos",
  },
  {
    step: 4,
    shortTitle: "Factura",
    detail: "Costos solicita factura al proveedor",
    primaryRole: "costos",
  },
  {
    step: 5,
    shortTitle: "Paquete",
    detail: "Costos registra factura y envía paquete digital a Recepción",
    primaryRole: "costos",
  },
  {
    step: 6,
    shortTitle: "Recepción",
    detail: "Captura en sistema",
    primaryRole: "recepcion",
  },
  {
    step: 7,
    shortTitle: "Contabilidad",
    detail: "Conciliación y cierre",
    primaryRole: "contabilidad",
  },
] as const;

/** Número de etapa activa (1–7) o 8 si ya cerró en contabilidad. */
export function flowPhaseNumber(status: CaseStatus): number {
  switch (status) {
    case "draft":
      return 1;
    case "pendingEngineer":
      return 2;
    case "approved":
      return 3;
    case "paid":
      return 4;
    case "invoiceRequested":
      return 5;
    case "readyForReception":
      return 6;
    case "capturedByReception":
      return 7;
    case "reconciled":
      return 8;
    default:
      return 1;
  }
}

export function isFlowComplete(status: CaseStatus): boolean {
  return status === "reconciled";
}

/** Texto de qué está esperando el expediente (visible para todos). */
export function describeGate(status: CaseStatus): string {
  switch (status) {
    case "draft":
      return "Pendiente: Costos debe enviar la OC a Ingeniería.";
    case "pendingEngineer":
      return "Pendiente: Ingeniería debe dar visto bueno.";
    case "approved":
      return "Pendiente: Pagos debe registrar el pago al proveedor.";
    case "paid":
      return "Pendiente: Costos debe solicitar factura al proveedor.";
    case "invoiceRequested":
      return "Pendiente: Costos debe cargar la factura y enviar el paquete digital a Recepción.";
    case "readyForReception":
      return "Pendiente: Recepción debe capturar en sistema.";
    case "capturedByReception":
      return "Pendiente: Contabilidad debe conciliar y cerrar.";
    case "reconciled":
      return "Expediente cerrado.";
    default:
      return "";
  }
}

/** Guía estática por rol (recordatorio de qué hace cada área en este proceso). */
export function rolePlaybook(role: Role): string[] {
  switch (role) {
    case "costos":
      return [
        "Crear nuevas órdenes de compra y enviarlas a Ingeniería.",
        "Después del pago: solicitar factura al proveedor.",
        "Registrar factura y comprobantes para armar el paquete digital hacia Recepción.",
      ];
    case "ingeniero":
      return [
        "Revisar cada OC que llegue a tu bandeja y dar visto bueno o comentarios.",
      ];
    case "pagos":
      return [
        "Cuando la OC esté aprobada, registrar el pago al proveedor con referencia e importe.",
      ];
    case "recepcion":
      return [
        "Cuando llegue el paquete digital, capturar la información en tu sistema.",
      ];
    case "contabilidad":
      return [
        "Tras la captura en recepción, conciliar montos y cerrar el expediente.",
      ];
    default:
      return [];
  }
}

/** Qué puede hacer el usuario ahora en este expediente (si puede avanzar o solo observar). */
export function sessionHintForCase(
  viewerRole: Role,
  status: CaseStatus,
  canAdvance: boolean
): string {
  if (isFlowComplete(status)) {
    return "Este expediente ya está cerrado. Puedes revisar la información; no hay más acciones.";
  }
  if (canAdvance) {
    return "Te corresponde avanzar este expediente: usa el formulario en «Tu turno» más abajo.";
  }
  const pending = flowPhaseNumber(status);
  const step = FLOW_STEPS.find((s) => s.step === pending);
  const area = step?.primaryRole ? ROLE_LABEL[step.primaryRole] : "otra área";
  return `Ahora le toca a ${area}. Puedes seguir el estado aquí y en el mapa del proceso; las modificaciones solo las puede hacer quien corresponde.`;
}
