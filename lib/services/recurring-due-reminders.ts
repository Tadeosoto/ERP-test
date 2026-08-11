import { prisma } from "@/lib/db";
import {
  daysUntil,
  relativeDayLabel,
  RECURRING_DUE_REMINDER_DAYS,
  RECURRING_DUE_REMINDER_TYPE,
} from "@/lib/domain/recurring-commitments";
import { formatDateShort } from "@/lib/format";

function startOfToday(d = new Date()): Date {
  const t = new Date(d);
  t.setHours(0, 0, 0, 0);
  return t;
}

/**
 * Crea avisos diarios a Administración desde 3 días antes de la fecha límite
 * (y mientras siga vencido / pendiente). Idempotente por compromiso + día.
 */
export async function ensureRecurringDueReminders(): Promise<number> {
  const today = startOfToday();
  const commitments = await prisma.recurringCommitment.findMany({
    where: {
      active: true,
      lifecycleStatus: "active",
      NOT: { workflowStatus: "paid" },
    },
  });

  const adminUsers = await prisma.user.findMany({ where: { role: "pagos" } });
  if (adminUsers.length === 0) return 0;

  let created = 0;

  for (const c of commitments) {
    const diff = daysUntil(c.dueDate.toISOString(), today);
    if (diff > RECURRING_DUE_REMINDER_DAYS) continue;

    const dueLabel = formatDateShort(c.dueDate.toISOString());
    const relative = relativeDayLabel(c.dueDate.toISOString());
    const message =
      diff < 0
        ? `Compromiso recurrente «${c.concept}» (${c.supplierName}) venció el ${dueLabel} (${relative}).`
        : `Compromiso recurrente «${c.concept}» (${c.supplierName}) vence el ${dueLabel} (${relative}).`;

    for (const user of adminUsers) {
      const already = await prisma.notification.findFirst({
        where: {
          userId: user.id,
          recurringCommitmentId: c.id,
          type: RECURRING_DUE_REMINDER_TYPE,
          createdAt: { gte: today },
        },
        select: { id: true },
      });
      if (already) continue;

      await prisma.notification.create({
        data: {
          userId: user.id,
          recurringCommitmentId: c.id,
          type: RECURRING_DUE_REMINDER_TYPE,
          message,
          requiresAcknowledgement: true,
          acknowledged: false,
          read: false,
        },
      });
      created += 1;
    }
  }

  return created;
}
