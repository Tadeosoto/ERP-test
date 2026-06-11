import type {
  CommentKind,
  FileKind,
  NotificationDto,
  ObraDto,
  OrderCommentDto,
  OrderStatus,
  PaymentLabel,
  PaymentRecordDto,
  PaymentType,
  PurchaseOrderDto,
  Role,
  StoredFileDto,
} from "@/lib/domain/types";
import type {
  Obra,
  OrderComment,
  PaymentRecord,
  PurchaseOrder,
  StoredFile,
  User,
} from "@prisma/client";
import { amountRemaining } from "@/lib/domain/transitions";

export function asRole(value: string): Role {
  return value as Role;
}

export function asOrderStatus(value: string): OrderStatus {
  const legacy: Record<string, OrderStatus> = {
    awaitingOcPdf: "awaitingEngineer",
    awaitingBalancePayment: "awaitingPayment",
    awaitingFinalDocs: "awaitingInvoice",
    parcial: "awaitingPayment",
  };
  return (legacy[value] ?? value) as OrderStatus;
}

export function asPaymentLabel(value: string): PaymentLabel {
  if (value === "parcial") return "pendiente";
  return value as PaymentLabel;
}

export function asPaymentType(value: string | null | undefined): PaymentType | null {
  if (!value) return null;
  return value as PaymentType;
}

export function asFileKind(value: string): FileKind {
  return value as FileKind;
}

export function asCommentKind(value: string): CommentKind {
  return value as CommentKind;
}

type OrderWithRelations = PurchaseOrder & {
  obra: Obra;
  createdBy: User;
  comments: (OrderComment & { author: User })[];
  files: StoredFile[];
  paymentRecords: (PaymentRecord & { recordedBy: User })[];
};

export function mapPaymentRecord(r: PaymentRecord & { recordedBy: User }): PaymentRecordDto {
  return {
    id: r.id,
    amount: r.amount,
    reference: r.reference,
    notes: r.notes,
    recordedByName: r.recordedBy.name,
    createdAt: r.createdAt.toISOString(),
  };
}

export function mapOrder(order: OrderWithRelations): PurchaseOrderDto {
  const paid = order.amountPaidSoFar;
  const total = order.totalAmount;
  return {
    id: order.id,
    obraId: order.obraId,
    obraName: order.obra.name,
    title: order.title,
    description: order.description,
    supplierName: order.supplierName,
    totalAmount: total,
    amountPaidSoFar: paid,
    amountRemaining: amountRemaining(total, paid),
    currency: order.currency,
    paymentLabel: asPaymentLabel(order.paymentLabel),
    paymentType: asPaymentType(order.paymentType),
    suggestedPaymentType: asPaymentType(order.suggestedPaymentType),
    paymentDueDate: order.paymentDueDate?.toISOString() ?? null,
    status: asOrderStatus(order.status),
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt.toISOString(),
    createdByName: order.createdBy.name,
    comments: order.comments.map(mapComment),
    files: order.files.map(mapFile),
    paymentRecords: order.paymentRecords.map(mapPaymentRecord),
  };
}

export function mapComment(c: OrderComment & { author: User }): OrderCommentDto {
  return {
    id: c.id,
    body: c.body,
    kind: asCommentKind(c.kind),
    authorName: c.author.name,
    createdAt: c.createdAt.toISOString(),
  };
}

export function mapFile(f: StoredFile): StoredFileDto {
  return {
    id: f.id,
    kind: asFileKind(f.kind),
    originalFileName: f.originalFileName,
    mimeType: f.mimeType,
    sizeBytes: f.sizeBytes,
    createdAt: f.createdAt.toISOString(),
  };
}

export function mapObra(obra: Obra & { _count?: { orders: number } }): ObraDto {
  return {
    id: obra.id,
    name: obra.name,
    active: obra.active,
    createdAt: obra.createdAt.toISOString(),
    orderCount: obra._count?.orders ?? 0,
  };
}

export function mapNotification(n: {
  id: string;
  orderId: string | null;
  type: string;
  message: string;
  read: boolean;
  createdAt: Date;
}): NotificationDto {
  return {
    id: n.id,
    orderId: n.orderId,
    type: n.type,
    message: n.message,
    read: n.read,
    createdAt: n.createdAt.toISOString(),
  };
}

export const orderInclude = {
  obra: true,
  createdBy: true,
  comments: { include: { author: true }, orderBy: { createdAt: "desc" as const } },
  files: { orderBy: { createdAt: "desc" as const } },
  paymentRecords: {
    include: { recordedBy: true },
    orderBy: { createdAt: "desc" as const },
  },
};
