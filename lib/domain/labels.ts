import type { CaseStatus, Role } from "./types";

export const ROLE_LABEL: Record<Role, string> = {
  costos: "Costos",
  ingeniero: "Ingeniero",
  pagos: "Pagos",
  recepcion: "Recepción",
  contabilidad: "Contabilidad",
};

export const STATUS_LABEL: Record<CaseStatus, string> = {
  draft: "Borrador",
  pendingEngineer: "En ingeniería",
  approved: "Aprobada · pendiente pago",
  paid: "Pagada · pendiente factura",
  invoiceRequested: "Factura solicitada",
  readyForReception: "En recepción",
  capturedByReception: "Capturado",
  reconciled: "Cerrado",
};
