import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { parseIsoDateInput } from "@/lib/domain/recurring-commitments";
import { canManageRecurringCommitments } from "@/lib/domain/transitions";
import { requireSessionUser } from "@/lib/auth/session-server";
import { asRole } from "@/lib/services/mappers";
import {
  mapRecurringCommitment,
  recurringCommitmentInclude,
} from "@/lib/services/recurring-commitment-mappers";
import { apiErrorResponse } from "@/lib/api/handle-route-error";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, ctx: Ctx) {
  try {
    const user = await requireSessionUser();
    const role = asRole(user.role);
    if (!canManageRecurringCommitments(role)) {
      return NextResponse.json({ error: "No tienes permiso para editar compromisos." }, { status: 403 });
    }

    const { id } = await ctx.params;
    const existing = await prisma.recurringCommitment.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Compromiso no encontrado." }, { status: 404 });
    }

    const body = (await request.json()) as {
      supplierId?: string | null;
      supplierName?: string;
      concept?: string;
      frequency?: string;
      dueDate?: string | null;
      currency?: string;
      estimatedAmount?: number | null;
      workflowStatus?: string;
      notes?: string;
    };

    let supplierName = body.supplierName?.trim() ?? existing.supplierName;
    let supplierId = body.supplierId !== undefined ? body.supplierId : existing.supplierId;
    if (supplierId) {
      const supplier = await prisma.supplier.findUnique({ where: { id: supplierId } });
      if (!supplier) {
        return NextResponse.json({ error: "Proveedor no encontrado." }, { status: 404 });
      }
      supplierName = supplier.commercialName || supplier.legalName;
    }

    const due = parseIsoDateInput(body.dueDate ?? "") ?? existing.dueDate;
    const day = due instanceof Date ? due.getDate() : new Date(due).getDate();
    const dueDate = due instanceof Date ? due : new Date(due);

    const row = await prisma.recurringCommitment.update({
      where: { id },
      data: {
        supplierId,
        supplierName,
        concept: body.concept?.trim() ?? existing.concept,
        frequency: body.frequency ?? existing.frequency,
        expectedReceptionDay: day,
        nextReceptionDate: dueDate,
        dueDate,
        currency: body.currency?.trim() || existing.currency,
        estimatedAmount:
          body.estimatedAmount !== undefined
            ? body.estimatedAmount != null && Number.isFinite(body.estimatedAmount)
              ? body.estimatedAmount
              : null
            : existing.estimatedAmount,
        workflowStatus: body.workflowStatus ?? existing.workflowStatus,
        notes: body.notes !== undefined ? body.notes.slice(0, 200) : existing.notes,
      },
      include: recurringCommitmentInclude,
    });

    return NextResponse.json({ commitment: mapRecurringCommitment(row) });
  } catch (e) {
    return apiErrorResponse(e);
  }
}

export async function DELETE(_request: Request, ctx: Ctx) {
  try {
    const user = await requireSessionUser();
    const role = asRole(user.role);
    if (!canManageRecurringCommitments(role)) {
      return NextResponse.json({ error: "No tienes permiso para eliminar compromisos." }, { status: 403 });
    }

    const { id } = await ctx.params;
    const existing = await prisma.recurringCommitment.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Compromiso no encontrado." }, { status: 404 });
    }

    await prisma.recurringCommitment.update({
      where: { id },
      data: { active: false },
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    return apiErrorResponse(e);
  }
}
