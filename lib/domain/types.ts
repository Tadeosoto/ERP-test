import type { DirectExpenseStatus, MaterialRequestStatus } from "./solicitudes";

export type Role = "pagos" | "compras" | "ingeniero" | "recepcion" | "contabilidad";

export type OrderStatus =
  | "draft"
  | "awaitingEngineer"
  | "engineerRejected"
  | "awaitingPatyDeadline"
  | "awaitingPayment"
  | "paid"
  | "awaitingInvoice"
  | "invoiceReceived"
  | "completed"
  | "difference";

/** Modalidad acordada tras aprobación de ingeniería (o parcialidades sugerida por Paty). */
export type PaymentType = "inmediato" | "programado" | "parcialidades";

/** Estado de saldo de la orden. */
export type PaymentLabel = "pendiente" | "saldada";

export type FileKind = "oc_pdf" | "comprobante_pago" | "complemento_pago" | "factura";

export type CommentKind = "approval" | "rejection";

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: Role;
}

export interface StoredFileDto {
  id: string;
  kind: FileKind;
  originalFileName: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
}

export interface PaymentRecordDto {
  id: string;
  amount: number;
  reference: string;
  notes: string;
  recordedByName: string;
  createdAt: string;
}

export interface OrderCommentDto {
  id: string;
  body: string;
  kind: CommentKind;
  authorName: string;
  createdAt: string;
}

export interface PurchaseOrderDto {
  id: string;
  obraId: string;
  obraName: string;
  title: string;
  description: string;
  supplierName: string;
  supplierId: string | null;
  ocFolio: string;
  ocDate: string | null;
  paymentTerms: string;
  internalReference: string;
  documentDate: string | null;
  assignedEngineerUserId: string | null;
  assignedEngineerName: string | null;
  materialRequestId: string | null;
  totalAmount: number;
  amountPaidSoFar: number;
  amountRemaining: number;
  currency: string;
  paymentLabel: PaymentLabel;
  paymentType: PaymentType | null;
  suggestedPaymentType: PaymentType | null;
  paymentDueDate: string | null;
  status: OrderStatus;
  sentToEngineerAt: string | null;
  createdAt: string;
  updatedAt: string;
  createdByName: string;
  comments: OrderCommentDto[];
  files: StoredFileDto[];
  paymentRecords: PaymentRecordDto[];
}

export interface SupplierDto {
  id: string;
  legalName: string;
  rfc: string;
  commercialName: string;
  taxRegime: string;
  phone: string;
  email: string;
  website: string;
  street: string;
  neighborhood: string;
  zipCode: string;
  city: string;
  state: string;
  country: string;
  primaryContact: string;
  notes: string;
  displayName: string;
  createdAt: string;
}

export interface ObraDto {
  id: string;
  name: string;
  code: string;
  client: string;
  managerName: string;
  startDate: string | null;
  estimatedEndDate: string | null;
  active: boolean;
  createdAt: string;
  orderCount: number;
}

export interface NotificationDto {
  id: string;
  orderId: string | null;
  type: string;
  message: string;
  read: boolean;
  createdAt: string;
}

export type MovementKind =
  | "order_created"
  | "approval"
  | "rejection"
  | "payment"
  | "file_upload";

export interface MovementDto {
  id: string;
  kind: MovementKind;
  role: Role;
  actorName: string;
  description: string;
  context: string;
  orderId: string;
  orderTitle: string;
  obraId: string;
  obraName: string;
  createdAt: string;
}

export interface PendingMovementDto {
  id: string;
  role: Role;
  description: string;
  orderId: string;
  orderTitle: string;
  obraId: string;
  obraName: string;
  status: OrderStatus;
  updatedAt: string;
}

export interface SolicitudAttachmentDto {
  id: string;
  originalFileName: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
}

export interface MaterialRequestDto {
  id: string;
  obraId: string;
  obraName: string;
  costCenter: string;
  materials: string;
  quantities: string;
  justification: string;
  status: MaterialRequestStatus;
  createdByUserId: string;
  createdByName: string;
  sentAt: string | null;
  purchaseOrderId: string | null;
  createdAt: string;
  updatedAt: string;
  attachments: SolicitudAttachmentDto[];
}

export interface DirectExpensePaymentDto {
  id: string;
  amount: number;
  reference: string;
  notes: string;
  recordedByName: string;
  createdAt: string;
}

export interface DirectExpenseFileDto {
  id: string;
  kind: string;
  originalFileName: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
}

export interface DirectExpenseDto {
  id: string;
  obraId: string;
  obraName: string;
  costCenter: string;
  category: string;
  supplierName: string;
  estimatedAmount: number;
  amountPaidSoFar: number;
  amountRemaining: number;
  currency: string;
  justification: string;
  paymentLabel: PaymentLabel;
  status: DirectExpenseStatus;
  createdByUserId: string;
  createdByName: string;
  sentAt: string | null;
  createdAt: string;
  updatedAt: string;
  attachments: SolicitudAttachmentDto[];
  files: DirectExpenseFileDto[];
  paymentRecords: DirectExpensePaymentDto[];
}
