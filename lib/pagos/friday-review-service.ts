import { prisma } from "@/lib/db";
import { amountRemaining } from "@/lib/domain/transitions";
import { paymentBasisTotal } from "@/lib/domain/order-fx";
import { mapOrder, orderInclude } from "@/lib/services/mappers";
import type { PurchaseOrderDto, ScheduledPaymentDto } from "@/lib/domain/types";
import {
  belongsInFridayReview,
  computeInvoiceDueYmd,
  dateKeyInMx,
  fridayInvoiceListStatus,
  fridayOfWeek,
  formatWeekRangeLabel,
  isoToYmd,
  mondayOfWeekContaining,
  resolvePaymentTermsDays,
  sundayOfWeek,
  type DeliveryStatus,
  type FridayInvoiceStatus,
  asDeliveryStatus,
} from "@/lib/pagos/friday-review";

export type FridayReviewItem = {
  order: PurchaseOrderDto;
  supplierName: string;
  obraName: string;
  ocFolio: string;
  ocFileId: string | null;
  invoiceFileId: string | null;
  /** Fecha de factura usada para mostrar; puede ser null si solo hay paymentDueDate. */
  invoiceDateYmd: string | null;
  dueDateYmd: string;
  termsDays: number;
  balance: number;
  currency: string;
  listStatus: FridayInvoiceStatus;
  activeSchedule: ScheduledPaymentDto | null;
  deliveryStatus: DeliveryStatus;
  /** True si hay evidencia de factura (PDF, fecha o compromiso C). */
  hasInvoice: boolean;
};

export type FridayReviewPayload = {
  weekMonday: string;
  weekSunday: string;
  weekFriday: string;
  weekLabel: string;
  today: string;
  items: FridayReviewItem[];
  totals: {
    pendingAmount: number;
    invoiceCount: number;
    supplierCount: number;
    overdueAmount: number;
    overdueCount: number;
    dueThisWeekAmount: number;
    dueThisWeekCount: number;
    scheduledAmount: number;
    scheduledCount: number;
    paidThisMonthAmount: number;
    paidThisMonthCount: number;
  };
};

function resolveInvoiceDateYmd(order: {
  invoiceDate: Date | null;
  files: { kind: string; createdAt: Date }[];
  invoiceFirstCommitment?: { invoiceDate: Date } | null;
}): string | null {
  if (order.invoiceDate) return isoToYmd(order.invoiceDate);
  if (order.invoiceFirstCommitment?.invoiceDate) {
    return isoToYmd(order.invoiceFirstCommitment.invoiceDate);
  }
  const factura = order.files
    .filter((f) => f.kind === "factura")
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())[0];
  if (factura) return isoToYmd(factura.createdAt);
  return null;
}

function fileIdByKind(
  files: { id: string; kind: string; createdAt: Date }[],
  kind: string
): string | null {
  const match = files
    .filter((f) => f.kind === kind)
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0];
  return match?.id ?? null;
}

function monthBoundsMx(todayYmd: string): { start: Date; end: Date } {
  const [y, m] = todayYmd.split("-").map(Number);
  const start = new Date(Date.UTC(y, m - 1, 1));
  const end = new Date(Date.UTC(y, m, 1));
  return { start, end };
}

/**
 * Vencimiento: factura + crédito del proveedor.
 * Si no hay fecha de factura, se usa paymentDueDate (límite que ya fijó Compras).
 */
function resolveDueDateYmd(opts: {
  invoiceDateYmd: string | null;
  termsDays: number;
  paymentDueDate: Date | null;
}): string | null {
  if (opts.invoiceDateYmd) {
    return computeInvoiceDueYmd({
      invoiceDateYmd: opts.invoiceDateYmd,
      termsDays: opts.termsDays,
    });
  }
  return isoToYmd(opts.paymentDueDate);
}

export async function buildFridayReview(weekMondayParam?: string | null): Promise<FridayReviewPayload> {
  const today = dateKeyInMx();
  const weekMonday = weekMondayParam?.match(/^\d{4}-\d{2}-\d{2}$/)
    ? mondayOfWeekContaining(weekMondayParam)
    : mondayOfWeekContaining(today);
  const weekSunday = sundayOfWeek(weekMonday);
  const weekFriday = fridayOfWeek(weekMonday);

  const orders = await prisma.purchaseOrder.findMany({
    where: {
      status: { in: ["awaitingPayment", "awaitingInvoice"] },
    },
    include: {
      ...orderInclude,
      supplier: true,
      invoiceFirstCommitment: { select: { invoiceDate: true } },
    },
  });

  const items: FridayReviewItem[] = [];

  for (const row of orders) {
    const invoiceFileId = fileIdByKind(row.files, "factura");
    const invoiceDateYmd = resolveInvoiceDateYmd(row);
    const hasInvoice = Boolean(invoiceDateYmd || invoiceFileId || row.invoiceFirstCommitmentId);

    const basis = paymentBasisTotal({
      currency: row.currency,
      totalAmount: row.totalAmount,
      fxRate: row.fxRate,
      totalAmountMxn: row.totalAmountMxn,
    });
    const balance = amountRemaining(basis, row.amountPaidSoFar);
    if (balance <= 0.009) continue;

    const termsDays = resolvePaymentTermsDays({
      supplierTermsDays: row.supplier?.paymentTermsDays,
      paymentTermsText: row.paymentTerms,
    });

    const dueDateYmd = resolveDueDateYmd({
      invoiceDateYmd,
      termsDays,
      paymentDueDate: row.paymentDueDate,
    });
    if (!dueDateYmd) continue;

    // Sin evidencia de factura ni fecha de pago fijada: no entra al total de facturas.
    if (!hasInvoice && !row.paymentDueDate) continue;

    if (!belongsInFridayReview({ dueYmd: dueDateYmd, weekMondayYmd: weekMonday })) continue;

    const dto = mapOrder(row);
    const activeScheduleRow = (row.scheduledPayments ?? []).find((s) => s.status === "scheduled");
    const activeSchedule = dto.scheduledPayments?.find((s) => s.status === "scheduled") ?? null;
    const listStatus = fridayInvoiceListStatus({
      dueYmd: dueDateYmd,
      todayYmd: today,
      weekMondayYmd: weekMonday,
      hasActiveSchedule: Boolean(activeScheduleRow),
    });

    items.push({
      order: dto,
      supplierName: row.supplierName,
      obraName: row.obra.name,
      ocFolio: row.ocFolio || row.title,
      ocFileId: fileIdByKind(row.files, "oc_signed_pdf") ?? fileIdByKind(row.files, "oc_pdf"),
      invoiceFileId,
      invoiceDateYmd,
      dueDateYmd,
      termsDays,
      balance,
      currency: row.currency === "USD" && row.totalAmountMxn != null ? "MXN" : row.currency || "MXN",
      listStatus,
      activeSchedule,
      deliveryStatus: asDeliveryStatus(row.deliveryStatus),
      hasInvoice,
    });
  }

  items.sort((a, b) => {
    if (a.dueDateYmd !== b.dueDateYmd) return a.dueDateYmd.localeCompare(b.dueDateYmd);
    return a.supplierName.localeCompare(b.supplierName, "es");
  });

  const overdueItems = items.filter((i) => i.listStatus === "vencida");
  const weekItems = items.filter((i) => i.listStatus === "vence_semana");
  const suppliers = new Set(items.map((i) => i.supplierName));

  const scheduledActive = await prisma.scheduledPayment.findMany({
    where: { status: "scheduled" },
  });
  const scheduledAmount = scheduledActive.reduce((s, r) => s + r.amount, 0);

  const { start: monthStart, end: monthEnd } = monthBoundsMx(today);
  const paidRows = await prisma.paymentRecord.findMany({
    where: { createdAt: { gte: monthStart, lt: monthEnd } },
    select: { amount: true, orderId: true },
  });
  const paidThisMonthAmount = paidRows.reduce((s, r) => s + r.amount, 0);

  return {
    weekMonday,
    weekSunday,
    weekFriday,
    weekLabel: formatWeekRangeLabel(weekMonday),
    today,
    items,
    totals: {
      pendingAmount: items.reduce((s, i) => s + i.balance, 0),
      invoiceCount: items.length,
      supplierCount: suppliers.size,
      overdueAmount: overdueItems.reduce((s, i) => s + i.balance, 0),
      overdueCount: overdueItems.length,
      dueThisWeekAmount: weekItems.reduce((s, i) => s + i.balance, 0),
      dueThisWeekCount: weekItems.length,
      scheduledAmount,
      scheduledCount: scheduledActive.length,
      paidThisMonthAmount,
      paidThisMonthCount: paidRows.length,
    },
  };
}
