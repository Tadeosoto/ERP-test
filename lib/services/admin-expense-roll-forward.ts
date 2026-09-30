import { prisma } from "@/lib/db";
import { addFrequency, occurrenceKeyFromDate } from "@/lib/domain/admin-expenses";

function dayStamp(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

/**
 * Cuando llega el siguiente periodo de un gasto que no es único, crea esa cuota
 * como pendiente. No copia archivos. Si el periodo ya existe (incluso eliminado), no lo duplica.
 */
export async function ensureAdminExpenseOccurrences(): Promise<number> {
  const today = dayStamp(new Date());
  const rows = await prisma.recurringCommitment.findMany({
    where: { frequency: { not: "unico" } },
    orderBy: { occurredOn: "asc" },
  });

  const bySeries = new Map<string, typeof rows>();
  for (const row of rows) {
    const key = row.seriesId || row.id;
    const list = bySeries.get(key) ?? [];
    list.push(row);
    bySeries.set(key, list);
  }

  let created = 0;

  for (const [, list] of bySeries) {
    const active = list.filter((row) => row.active && row.lifecycleStatus === "active");
    if (active.length === 0) continue;
    let cursor = active[active.length - 1];

    for (let step = 0; step < 18; step += 1) {
      if (cursor.frequency === "unico") break;
      const nextOn = addFrequency(cursor.occurredOn, cursor.frequency);
      if (dayStamp(nextOn) > today) break;
      const key = occurrenceKeyFromDate(nextOn);
      const existing = list.find((row) => row.occurrenceKey === key);
      if (existing) {
        cursor = existing;
        continue;
      }

      const nextDue = addFrequency(cursor.dueDate, cursor.frequency);
      const amount = cursor.amount || cursor.estimatedAmount || 0;
      try {
        const createdRow = await prisma.recurringCommitment.create({
          data: {
            supplierId: cursor.supplierId,
            supplierName: cursor.supplierName,
            concept: cursor.concept,
            frequency: cursor.frequency,
            expectedReceptionDay: nextDue.getDate(),
            nextReceptionDate: nextDue,
            dueDate: nextDue,
            occurredOn: nextOn,
            category: cursor.category || "otro",
            paymentMethod: cursor.paymentMethod,
            seriesId: cursor.seriesId,
            occurrenceKey: key,
            obraId: null,
            costCenter: "",
            currency: cursor.currency || "MXN",
            estimatedAmount: amount,
            amount,
            lifecycleStatus: "active",
            workflowStatus: "pending",
            notes: "",
            createdByUserId: cursor.createdByUserId,
          },
        });
        list.push(createdRow);
        cursor = createdRow;
        created += 1;
      } catch (error) {
        const code = typeof error === "object" && error && "code" in error ? String(error.code) : "";
        if (code === "P2002") break;
        throw error;
      }
    }
  }

  return created;
}
