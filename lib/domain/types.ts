export type Role = "pagos" | "compras" | "ingeniero" | "recepcion" | "contabilidad";

export type OrderStatus =
  | "awaitingEngineer"
  | "engineerRejected"
  | "awaitingPatyDeadline"
  | "awaitingPayment"
  | "awaitingFinalDocs"
  | "completed";

/** Modalidad acordada tras aprobación de ingeniería (o parcialidades sugerida por Paty). */
export type PaymentType = "inmediato" | "programado" | "parcialidades";

/** Estado de saldo de la orden. */
export type PaymentLabel = "pendiente" | "saldada";

export type FileKind = "oc_pdf" | "complemento_pago" | "factura";

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
  totalAmount: number;
  amountPaidSoFar: number;
  amountRemaining: number;
  currency: string;
  paymentLabel: PaymentLabel;
  paymentType: PaymentType | null;
  suggestedPaymentType: PaymentType | null;
  paymentDueDate: string | null;
  status: OrderStatus;
  createdAt: string;
  updatedAt: string;
  createdByName: string;
  comments: OrderCommentDto[];
  files: StoredFileDto[];
  paymentRecords: PaymentRecordDto[];
}

export interface ObraDto {
  id: string;
  name: string;
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
