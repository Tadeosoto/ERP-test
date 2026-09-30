import type { CompanyCardDto, CompanyCardMovementDto } from "@/lib/domain/types";
import { employeeFullName } from "@/lib/viaticos/summary";
import {
  asCardBank,
  asCardKind,
  asDestination,
  asExpenseStatus,
  asMovementKind,
  asReceiptKind,
  cardSummary,
  destinationLabel,
  RECEIPT_LABEL,
  STATUS_LABEL,
} from "@/lib/tarjetas/summary";

export const movementFileSelect = {
  id: true,
  kind: true,
  originalFileName: true,
  mimeType: true,
  sizeBytes: true,
  createdAt: true,
} as const;

export const movementInclude = {
  card: { select: { id: true, label: true, kind: true, lastFour: true } },
  obra: { select: { name: true } },
  responsibleUser: { select: { name: true } },
  responsibleEmployee: { select: { firstName: true, lastName: true } },
  files: { select: movementFileSelect, orderBy: { createdAt: "asc" as const } },
};

type FileRow = {
  id: string;
  kind: string;
  originalFileName: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: Date;
};

export type MovementRow = {
  id: string;
  cardId: string;
  kind: string;
  occurredOn: Date;
  amount: number;
  supplierName: string;
  concept: string;
  category: string;
  destinationKind: string;
  obraId: string | null;
  costCenter: string;
  responsibleUserId: string | null;
  responsibleEmployeeId: string | null;
  receiptKind: string;
  missingReceiptReason: string;
  status: string;
  card: { label: string; kind: string; lastFour: string };
  obra: { name: string } | null;
  responsibleUser: { name: string } | null;
  responsibleEmployee: { firstName: string; lastName: string } | null;
  files: FileRow[];
};

export function mapMovement(row: MovementRow): CompanyCardMovementDto {
  const kind = asMovementKind(row.kind) ?? "gasto";
  const receiptKind = asReceiptKind(row.receiptKind) ?? "";
  const status = kind === "carga" ? "carga" : (asExpenseStatus(row.status) ?? "");
  const responsibleName = row.responsibleUser
    ? row.responsibleUser.name
    : row.responsibleEmployee
      ? employeeFullName(row.responsibleEmployee.firstName, row.responsibleEmployee.lastName)
      : "—";
  const cardKind = asCardKind(row.card.kind) ?? "debito";
  return {
    id: row.id,
    cardId: row.cardId,
    cardLabel: row.card.label,
    cardKind,
    cardLastFour: row.card.lastFour,
    kind,
    occurredOn: row.occurredOn.toISOString(),
    amount: row.amount,
    supplierName: row.supplierName,
    concept: row.concept,
    category: row.category,
    destinationKind: asDestination(row.destinationKind) ?? "",
    destinationLabel: destinationLabel({
      destinationKind: row.destinationKind,
      obraName: row.obra?.name,
      costCenter: row.costCenter,
    }),
    obraId: row.obraId,
    costCenter: row.costCenter,
    responsibleUserId: row.responsibleUserId,
    responsibleEmployeeId: row.responsibleEmployeeId,
    responsibleName,
    receiptKind,
    receiptLabel: receiptKind ? RECEIPT_LABEL[receiptKind] : "—",
    missingReceiptReason: row.missingReceiptReason,
    status,
    statusLabel: status ? STATUS_LABEL[status] : "—",
    files: row.files.map((file) => ({
      id: file.id,
      kind: file.kind,
      originalFileName: file.originalFileName,
      mimeType: file.mimeType,
      sizeBytes: file.sizeBytes,
      createdAt: file.createdAt.toISOString(),
    })),
  };
}

export function mapCard(
  row: {
    id: string;
    bank: string;
    kind: string;
    label: string;
    slot: number;
    lastFour: string;
    movements: { kind: string; amount: number; status: string }[];
  }
): CompanyCardDto {
  return {
    id: row.id,
    bank: asCardBank(row.bank) ?? "banbajio",
    kind: asCardKind(row.kind) ?? "debito",
    label: row.label,
    slot: row.slot,
    lastFour: row.lastFour,
    summary: cardSummary(row.movements),
  };
}
