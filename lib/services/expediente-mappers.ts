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
  purchaseOrders: { select: { totalAmount: true, amountPaidSoFar: true, currency: true, status: true } },
  recurringCommitments: {
    where: { active: true },
    select: { estimatedAmount: true, currency: true, workflowStatus: true },
  },
  invoiceFirstCommitments: {
    select: {
      totalAmount: true,
      currency: true,
      status: true,
      purchaseOrder: { select: { amountPaidSoFar: true } },
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

export function mapExpedienteListItem(row: ExpedienteListRow): ExpedienteListItemDto {
  const orderTotal = row.purchaseOrders.reduce((s, o) => s + o.totalAmount, 0);
  const orderPaid = row.purchaseOrders.reduce((s, o) => s + o.amountPaidSoFar, 0);
  const commitTotal = row.recurringCommitments.reduce((s, c) => s + (c.estimatedAmount ?? 0), 0);
  const procesoCTotal = row.invoiceFirstCommitments.reduce((s, c) => s + c.totalAmount, 0);
  const procesoCPaid = row.invoiceFirstCommitments.reduce(
    (s, c) => s + (c.purchaseOrder?.amountPaidSoFar ?? 0),
    0
  );
  const totalAmount = orderTotal + commitTotal + procesoCTotal;
  const amountPaidSoFar = orderPaid + procesoCPaid;
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
  const orderTotal = row.purchaseOrders.reduce((s, o) => s + o.totalAmount, 0);
  const orderPaid = row.purchaseOrders.reduce((s, o) => s + o.amountPaidSoFar, 0);
  const commitTotal = row.recurringCommitments.reduce((s, c) => s + (c.estimatedAmount ?? 0), 0);
  const procesoCMapped = row.invoiceFirstCommitments.map(mapInvoiceFirstCommitment);
  const procesoCTotal = procesoCMapped.reduce((s, c) => s + c.displayTotal, 0);
  const procesoCPaid = procesoCMapped.reduce((s, c) => s + c.amountPaidSoFar, 0);
  const totalAmount = orderTotal + commitTotal + procesoCTotal;
  const amountPaidSoFar = orderPaid + procesoCPaid;
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
