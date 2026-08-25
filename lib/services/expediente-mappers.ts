import type {
  ExpedienteDetailDto,
  ExpedienteListItemDto,
} from "@/lib/domain/types";
import type { Prisma } from "@prisma/client";
import { mapOrder, orderInclude } from "@/lib/services/mappers";
import {
  mapRecurringCommitment,
  recurringCommitmentInclude,
} from "@/lib/services/recurring-commitment-mappers";
import { mapInvoiceFirstCommitment, invoiceFirstInclude } from "@/lib/services/invoice-first-mappers";

export const expedienteListInclude = {
  obra: true,
  createdBy: true,
  purchaseOrders: {
    select: {
      totalAmount: true,
      amountPaidSoFar: true,
      currency: true,
      status: true,
      invoiceFirstCommitmentId: true,
    },
  },
  recurringCommitments: {
    where: { active: true },
    select: { estimatedAmount: true, currency: true, workflowStatus: true },
  },
  invoiceFirstCommitments: {
    select: {
      id: true,
      totalAmount: true,
      currency: true,
      status: true,
      purchaseOrder: { select: { totalAmount: true, amountPaidSoFar: true } },
    },
  },
} satisfies Prisma.ExpedienteInclude;

export const expedienteDetailInclude = {
  obra: true,
  createdBy: true,
  purchaseOrders: { include: orderInclude, orderBy: { createdAt: "desc" as const } },
  recurringCommitments: {
    where: { active: true },
    include: recurringCommitmentInclude,
    orderBy: { dueDate: "asc" as const },
  },
  invoiceFirstCommitments: {
    include: invoiceFirstInclude,
    orderBy: { createdAt: "desc" as const },
  },
} satisfies Prisma.ExpedienteInclude;

export type ExpedienteListRow = Prisma.ExpedienteGetPayload<{ include: typeof expedienteListInclude }>;
export type ExpedienteDetailRow = Prisma.ExpedienteGetPayload<{ include: typeof expedienteDetailInclude }>;

function statusFromCounts(input: {
  orders: { status: string }[];
  commitments: { workflowStatus: string }[];
  procesoC: { status: string }[];
}): string {
  const hasItems = input.orders.length + input.commitments.length + input.procesoC.length > 0;
  if (!hasItems) return "Vacío";
  const allDone =
    input.orders.every((o) => o.status === "completed") &&
    input.commitments.every((c) => c.workflowStatus === "paid") &&
    input.procesoC.every((c) => c.status === "completed");
  if (allDone) return "Completo";
  return "En proceso";
}

/** Evita contar dos veces la OC generada desde un Proceso C del mismo expediente. */
function computeExpedienteTotals(input: {
  purchaseOrders: Array<{
    totalAmount: number;
    amountPaidSoFar: number;
    invoiceFirstCommitmentId?: string | null;
  }>;
  recurringCommitments: Array<{ estimatedAmount: number | null }>;
  invoiceFirstCommitments: Array<{
    id: string;
    totalAmount: number;
    purchaseOrder?: { totalAmount?: number; amountPaidSoFar?: number } | null;
  }>;
}): { totalAmount: number; amountPaidSoFar: number } {
  const procesoCIds = new Set(input.invoiceFirstCommitments.map((c) => c.id));
  const standaloneOrders = input.purchaseOrders.filter(
    (o) => !o.invoiceFirstCommitmentId || !procesoCIds.has(o.invoiceFirstCommitmentId)
  );
  const orderTotal = standaloneOrders.reduce((s, o) => s + o.totalAmount, 0);
  const orderPaid = standaloneOrders.reduce((s, o) => s + o.amountPaidSoFar, 0);
  const commitTotal = input.recurringCommitments.reduce((s, c) => s + (c.estimatedAmount ?? 0), 0);
  const procesoCTotal = input.invoiceFirstCommitments.reduce((s, c) => {
    const linkedOrderTotal = c.purchaseOrder?.totalAmount ?? 0;
    return s + (linkedOrderTotal > 0.01 ? linkedOrderTotal : c.totalAmount);
  }, 0);
  const procesoCPaid = input.invoiceFirstCommitments.reduce(
    (s, c) => s + (c.purchaseOrder?.amountPaidSoFar ?? 0),
    0
  );
  return {
    totalAmount: orderTotal + commitTotal + procesoCTotal,
    amountPaidSoFar: orderPaid + procesoCPaid,
  };
}

export function mapExpedienteListItem(row: ExpedienteListRow): ExpedienteListItemDto {
  const { totalAmount, amountPaidSoFar } = computeExpedienteTotals(row);
  const currency =
    row.purchaseOrders[0]?.currency ??
    row.recurringCommitments[0]?.currency ??
    row.invoiceFirstCommitments[0]?.currency ??
    "MXN";

  return {
    id: row.id,
    folio: row.folio,
    name: row.name,
    notes: row.notes,
    obraId: row.obraId,
    obraName: row.obra?.name ?? null,
    createdByName: row.createdBy.name,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    ordersCount: row.purchaseOrders.length,
    commitmentsCount: row.recurringCommitments.length,
    procesoCCount: row.invoiceFirstCommitments.length,
    totalAmount,
    amountPaidSoFar,
    amountRemaining: Math.max(0, totalAmount - amountPaidSoFar),
    currency,
    statusLabel: statusFromCounts({
      orders: row.purchaseOrders,
      commitments: row.recurringCommitments,
      procesoC: row.invoiceFirstCommitments,
    }),
  };
}

export function mapExpedienteDetail(row: ExpedienteDetailRow): ExpedienteDetailDto {
  const procesoCMapped = row.invoiceFirstCommitments.map(mapInvoiceFirstCommitment);
  const { totalAmount, amountPaidSoFar } = computeExpedienteTotals({
    purchaseOrders: row.purchaseOrders,
    recurringCommitments: row.recurringCommitments,
    invoiceFirstCommitments: row.invoiceFirstCommitments,
  });
  const currency =
    row.purchaseOrders[0]?.currency ??
    row.recurringCommitments[0]?.currency ??
    row.invoiceFirstCommitments[0]?.currency ??
    "MXN";

  return {
    id: row.id,
    folio: row.folio,
    name: row.name,
    notes: row.notes,
    obraId: row.obraId,
    obraName: row.obra?.name ?? null,
    createdByName: row.createdBy.name,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    ordersCount: row.purchaseOrders.length,
    commitmentsCount: row.recurringCommitments.length,
    procesoCCount: row.invoiceFirstCommitments.length,
    totalAmount,
    amountPaidSoFar,
    amountRemaining: Math.max(0, totalAmount - amountPaidSoFar),
    currency,
    statusLabel: statusFromCounts({
      orders: row.purchaseOrders,
      commitments: row.recurringCommitments,
      procesoC: row.invoiceFirstCommitments,
    }),
    purchaseOrders: row.purchaseOrders.map(mapOrder),
    recurringCommitments: row.recurringCommitments.map(mapRecurringCommitment),
    invoiceFirstCommitments: procesoCMapped,
  };
}

export async function nextExpedienteFolio(
  client: {
    expediente: {
      count: (args: { where: { folio: { startsWith: string } } }) => Promise<number>;
    };
  },
  at = new Date()
): Promise<string> {
  const yy = String(at.getFullYear()).slice(-2);
  const mm = String(at.getMonth() + 1).padStart(2, "0");
  const prefix = `EXP-${yy}${mm}-`;
  const count = await client.expediente.count({ where: { folio: { startsWith: prefix } } });
  return `${prefix}${String(count + 1).padStart(4, "0")}`;
}
