import type {
  DirectExpenseDto,
  DirectExpenseFileDto,
  DirectExpensePaymentDto,
  MaterialRequestDto,
  SolicitudAttachmentDto,
} from "@/lib/domain/types";
import type { DirectExpenseStatus, MaterialRequestStatus } from "@/lib/domain/solicitudes";
import { amountRemaining } from "@/lib/domain/transitions";
import type {
  DirectExpenseFile,
  DirectExpensePayment,
  DirectExpenseRequest,
  MaterialRequest,
  Obra,
  SolicitudAttachment,
  User,
} from "@prisma/client";

export const materialRequestInclude = {
  obra: true,
  createdBy: true,
  attachments: true,
  purchaseOrder: { select: { id: true } },
} as const;

export const directExpenseInclude = {
  obra: true,
  createdBy: true,
  attachments: true,
  files: true,
  paymentRecords: { include: { recordedBy: true }, orderBy: { createdAt: "desc" as const } },
} as const;

function mapAttachment(a: SolicitudAttachment): SolicitudAttachmentDto {
  return {
    id: a.id,
    originalFileName: a.originalFileName,
    mimeType: a.mimeType,
    sizeBytes: a.sizeBytes,
    createdAt: a.createdAt.toISOString(),
  };
}

type MaterialWithRelations = MaterialRequest & {
  obra: Obra;
  createdBy: User;
  attachments: SolicitudAttachment[];
  purchaseOrder?: { id: string } | null;
};

export function mapMaterialRequest(r: MaterialWithRelations): MaterialRequestDto {
  return {
    id: r.id,
    obraId: r.obraId,
    obraName: r.obra.name,
    costCenter: r.costCenter,
    materials: r.materials,
    quantities: r.quantities,
    justification: r.justification,
    status: r.status as MaterialRequestStatus,
    createdByUserId: r.createdByUserId,
    createdByName: r.createdBy.name,
    sentAt: r.sentAt?.toISOString() ?? null,
    purchaseOrderId: r.purchaseOrder?.id ?? null,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
    attachments: r.attachments.map(mapAttachment),
  };
}

type DirectExpenseWithRelations = DirectExpenseRequest & {
  obra: Obra;
  createdBy: User;
  attachments: SolicitudAttachment[];
  files: DirectExpenseFile[];
  paymentRecords: (DirectExpensePayment & { recordedBy: User })[];
};

function mapExpenseFile(f: DirectExpenseFile): DirectExpenseFileDto {
  return {
    id: f.id,
    kind: f.kind,
    originalFileName: f.originalFileName,
    mimeType: f.mimeType,
    sizeBytes: f.sizeBytes,
    createdAt: f.createdAt.toISOString(),
  };
}

function mapExpensePayment(p: DirectExpensePayment & { recordedBy: User }): DirectExpensePaymentDto {
  return {
    id: p.id,
    amount: p.amount,
    reference: p.reference,
    notes: p.notes,
    recordedByName: p.recordedBy.name,
    createdAt: p.createdAt.toISOString(),
  };
}

export function mapDirectExpense(r: DirectExpenseWithRelations): DirectExpenseDto {
  const paid = r.amountPaidSoFar;
  const total = r.estimatedAmount;
  return {
    id: r.id,
    obraId: r.obraId,
    obraName: r.obra.name,
    costCenter: r.costCenter,
    category: r.category,
    supplierName: r.supplierName,
    estimatedAmount: total,
    amountPaidSoFar: paid,
    amountRemaining: amountRemaining(total, paid),
    currency: r.currency,
    justification: r.justification,
    paymentLabel: r.paymentLabel as DirectExpenseDto["paymentLabel"],
    status: r.status as DirectExpenseStatus,
    createdByUserId: r.createdByUserId,
    createdByName: r.createdBy.name,
    sentAt: r.sentAt?.toISOString() ?? null,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
    attachments: r.attachments.map(mapAttachment),
    files: r.files.map(mapExpenseFile),
    paymentRecords: r.paymentRecords.map(mapExpensePayment),
  };
}
