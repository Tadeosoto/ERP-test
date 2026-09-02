import type { RecurringCommitmentDto, RecurringCommitmentFileDto } from "@/lib/domain/types";
import type { Prisma } from "@prisma/client";

export const recurringCommitmentInclude = {
  supplier: true,
  obra: true,
  createdBy: true,
  files: { orderBy: { createdAt: "desc" as const } },
} satisfies Prisma.RecurringCommitmentInclude;

export type RecurringCommitmentRow = Prisma.RecurringCommitmentGetPayload<{
  include: typeof recurringCommitmentInclude;
}>;

function mapFile(f: RecurringCommitmentRow["files"][number]): RecurringCommitmentFileDto {
  return {
    id: f.id,
    kind: f.kind,
    originalFileName: f.originalFileName,
    mimeType: f.mimeType,
    sizeBytes: f.sizeBytes,
    createdAt: f.createdAt.toISOString(),
  };
}

export function mapRecurringCommitment(row: RecurringCommitmentRow): RecurringCommitmentDto {
  return {
    id: row.id,
    supplierId: row.supplierId,
    supplierName: row.supplierName,
    concept: row.concept,
    frequency: row.frequency,
    expectedReceptionDay: row.expectedReceptionDay,
    nextReceptionDate: row.nextReceptionDate.toISOString(),
    dueDate: row.dueDate.toISOString(),
    obraId: row.obraId,
    obraName: row.obra?.name ?? null,
    costCenter: row.costCenter,
    currency: row.currency,
    estimatedAmount: row.estimatedAmount,
    lifecycleStatus: row.lifecycleStatus,
    workflowStatus: row.workflowStatus,
    notes: row.notes,
    active: row.active,
    createdByName: row.createdBy.name,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    files: row.files.map(mapFile),
  };
}
