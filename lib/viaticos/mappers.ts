import type { ViaticoExpenseDto, ViaticoDetailDto, ViaticoListItemDto, EmployeeDto } from "@/lib/domain/types";
import { asReceiptKind, employeeFullName, viaticoSummary } from "@/lib/viaticos/summary";

type EmployeeRow = {
  id: string;
  firstName: string;
  lastName: string;
  active: boolean;
  createdAt: Date;
};

type FileRow = {
  id: string;
  kind: string;
  originalFileName: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: Date;
};

type ExpenseRow = {
  id: string;
  concept: string;
  amount: number;
  receiptKind: string;
  missingReceiptReason: string;
  createdAt: Date;
  files?: FileRow[];
};

type ViaticoListRow = {
  id: string;
  employeeId: string;
  obraId: string;
  deliveredAmount: number;
  createdAt: Date;
  employee: { firstName: string; lastName: string };
  obra: { name: string };
  expenses: { amount: number; receiptKind: string }[];
};

export function mapEmployee(row: EmployeeRow): EmployeeDto {
  return {
    id: row.id,
    firstName: row.firstName,
    lastName: row.lastName,
    fullName: employeeFullName(row.firstName, row.lastName),
    active: row.active,
    createdAt: row.createdAt.toISOString(),
  };
}

export function mapViaticoListItem(row: ViaticoListRow): ViaticoListItemDto {
  return {
    id: row.id,
    employeeId: row.employeeId,
    employeeName: employeeFullName(row.employee.firstName, row.employee.lastName),
    obraId: row.obraId,
    obraName: row.obra.name,
    deliveredAmount: row.deliveredAmount,
    createdAt: row.createdAt.toISOString(),
    summary: viaticoSummary(row.deliveredAmount, row.expenses),
  };
}

export function mapViaticoDetail(row: Omit<ViaticoListRow, "expenses"> & { expenses: ExpenseRow[] }): ViaticoDetailDto {
  const expenses: ViaticoExpenseDto[] = row.expenses.map((expense) => ({
    id: expense.id,
    concept: expense.concept,
    amount: expense.amount,
    receiptKind: asReceiptKind(expense.receiptKind) ?? "sin_comprobante",
    missingReceiptReason: expense.missingReceiptReason,
    createdAt: expense.createdAt.toISOString(),
    files: (expense.files ?? []).map((file) => ({
      id: file.id,
      kind: file.kind,
      originalFileName: file.originalFileName,
      mimeType: file.mimeType,
      sizeBytes: file.sizeBytes,
      createdAt: file.createdAt.toISOString(),
    })),
  }));
  return { ...mapViaticoListItem(row), expenses };
}

/** Metadatos del archivo, sin el binario. */
export const viaticoFileSelect = {
  id: true,
  kind: true,
  originalFileName: true,
  mimeType: true,
  sizeBytes: true,
  createdAt: true,
} as const;

export const viaticoDetailInclude = {
  employee: { select: { firstName: true, lastName: true } },
  obra: { select: { name: true } },
  expenses: {
    orderBy: { createdAt: "asc" as const },
    include: {
      files: { select: viaticoFileSelect, orderBy: { createdAt: "asc" as const } },
    },
  },
};

export const viaticoListInclude = {
  employee: { select: { firstName: true, lastName: true } },
  obra: { select: { name: true } },
  expenses: { select: { amount: true, receiptKind: true } },
};
