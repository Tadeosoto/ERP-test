import type {
  InvoiceFirstCommitmentDto,
  InvoiceFirstFileDto,
  PurchaseOrderDto,
} from "@/lib/domain/types";
import type { InvoiceFirstStatus } from "@/lib/domain/proceso-c";
import { amountRemaining } from "@/lib/domain/transitions";
import type {
  InvoiceFirstCommitment,
  InvoiceFirstFile,
  Obra,
  PurchaseOrder,
  Supplier,
  User,
} from "@prisma/client";

export const invoiceFirstInclude = {
  supplier: true,
  obra: true,
  createdBy: true,
  files: true,
  purchaseOrder: {
    select: {
      id: true,
      ocFolio: true,
      title: true,
      totalAmount: true,
      amountPaidSoFar: true,
      currency: true,
      paymentType: true,
      status: true,
      updatedAt: true,
      paymentRecords: { orderBy: { createdAt: "desc" as const }, take: 1 },
    },
  },
} as const;

type InvoiceFirstWithRelations = InvoiceFirstCommitment & {
  supplier: Supplier | null;
  obra: Obra | null;
  createdBy: User;
  files: InvoiceFirstFile[];
  purchaseOrder?: {
    id: string;
    ocFolio: string;
    title: string;
    totalAmount: number;
    amountPaidSoFar: number;
    currency: string;
    paymentType: string | null;
    status: string;
    updatedAt: Date;
    paymentRecords: { createdAt: Date }[];
  } | null;
};

function mapFile(f: InvoiceFirstFile): InvoiceFirstFileDto {
  return {
    id: f.id,
    kind: f.kind,
    originalFileName: f.originalFileName,
    mimeType: f.mimeType,
    sizeBytes: f.sizeBytes,
    createdAt: f.createdAt.toISOString(),
  };
}

export function mapInvoiceFirstCommitment(r: InvoiceFirstWithRelations): InvoiceFirstCommitmentDto {
  const order = r.purchaseOrder;
  const paid = order?.amountPaidSoFar ?? 0;
  const commitmentTotal = r.totalAmount;
  const orderTotal = order?.totalAmount ?? 0;
  const total = orderTotal > 0.01 ? orderTotal : commitmentTotal;
  const lastPayment =
    order?.paymentRecords[0]?.createdAt.toISOString() ??
    (paid > 0 ? order?.updatedAt.toISOString() ?? null : null);

  return {
    id: r.id,
    invoiceFolio: r.invoiceFolio,
    supplierId: r.supplierId,
    supplierName: r.supplierName,
    obraId: r.obraId,
    obraName: r.obra?.name ?? null,
    totalAmount: r.totalAmount,
    amountPaidSoFar: paid,
    amountRemaining: amountRemaining(total, paid),
    displayTotal: total,
    currency: r.currency,
    invoiceDate: r.invoiceDate.toISOString(),
    comment: r.comment,
    status: r.status as InvoiceFirstStatus,
    createdByUserId: r.createdByUserId,
    createdByName: r.createdBy.name,
    ocRequestedAt: r.ocRequestedAt?.toISOString() ?? null,
    purchaseOrderId: order?.id ?? null,
    purchaseOrderFolio: order?.ocFolio || order?.title || null,
    purchaseOrderStatus: order?.status ?? null,
    paymentType: order?.paymentType ?? null,
    lastPaymentAt: lastPayment,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
    files: r.files.map(mapFile),
  };
}

export function invoiceFirstTabKey(
  c: InvoiceFirstCommitmentDto
): "todos" | "esperando_oc" | "parciales" | "completados" {
  if (c.status === "completed") return "completados";
  if (c.status === "in_payment") {
    if (c.amountRemaining > 0.01 && c.amountPaidSoFar > 0.01) return "parciales";
    if (c.purchaseOrderStatus === "completed") return "completados";
    if (c.amountPaidSoFar > 0.01 && c.amountRemaining > 0.01) return "parciales";
    if (
      c.paymentType === "parcialidades" &&
      c.amountRemaining > 0.01 &&
      !["completed", "draft"].includes(c.purchaseOrderStatus ?? "")
    ) {
      return "parciales";
    }
    if (c.amountPaidSoFar > 0.01) return "parciales";
  }
  if (c.status === "awaiting_oc" || c.status === "oc_requested") return "esperando_oc";
  return "todos";
}

export function mergeOrderPaymentIntoCommitment(
  c: InvoiceFirstCommitmentDto,
  order: PurchaseOrderDto | undefined
): InvoiceFirstCommitmentDto {
  if (!order) return c;
  const paid = order.paymentRecords.length
    ? order.paymentRecords.reduce((s, r) => s + r.amount, 0)
    : order.amountPaidSoFar;
  const lastPayment =
    order.paymentRecords[0]?.createdAt ??
    (paid > 0 ? order.updatedAt : null);

  return {
    ...c,
    amountPaidSoFar: paid,
    amountRemaining: amountRemaining(order.totalAmount, paid),
    displayTotal: order.totalAmount,
    purchaseOrderFolio: order.ocFolio || order.title,
    purchaseOrderStatus: order.status,
    paymentType: order.paymentType,
    lastPaymentAt: lastPayment,
    status: order.status === "completed" ? "completed" : c.status === "in_payment" ? "in_payment" : c.status,
  };
}
