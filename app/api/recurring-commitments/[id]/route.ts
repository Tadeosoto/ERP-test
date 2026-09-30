import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  isAdminCategory,
  isAdminFrequency,
  isAdminPaymentMethod,
  occurrenceKeyFromDate,
} from "@/lib/domain/admin-expenses";
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
      return NextResponse.json({ error: "No tienes permiso para editar gastos." }, { status: 403 });
    }

    const { id } = await ctx.params;
    const existing = await prisma.recurringCommitment.findUnique({ where: { id } });
    if (!existing || !existing.active) {
      return NextResponse.json({ error: "Gasto no encontrado." }, { status: 404 });
    }

    const body = (await request.json()) as {
      supplierId?: string | null;
      concept?: string;
      frequency?: string;
      dueDate?: string | null;
      occurredOn?: string | null;
      category?: string;
      paymentMethod?: string;
      amount?: number | null;
      workflowStatus?: string;
      notes?: string;
    };

    let supplierName = existing.supplierName;
    let supplierId = body.supplierId !== undefined ? body.supplierId : existing.supplierId;
    if (supplierId) {
      const supplier = await prisma.supplier.findUnique({ where: { id: supplierId } });
      if (!supplier) {
        return NextResponse.json({ error: "Proveedor no encontrado." }, { status: 404 });
      }
      supplierName = supplier.commercialName || supplier.legalName;
    } else {
      return NextResponse.json({ error: "Selecciona un proveedor." }, { status: 400 });
    }

    if (body.frequency !== undefined && !isAdminFrequency(body.frequency)) {
      return NextResponse.json({ error: "Periodicidad inválida." }, { status: 400 });
    }
    if (body.category !== undefined && !isAdminCategory(body.category)) {
      return NextResponse.json({ error: "Categoría inválida." }, { status: 400 });
    }
    if (body.paymentMethod !== undefined && !isAdminPaymentMethod(body.paymentMethod)) {
      return NextResponse.json({ error: "Forma de pago inválida." }, { status: 400 });
    }

    let amount = existing.amount || existing.estimatedAmount || 0;
    if (body.amount !== undefined) {
      amount = Number(body.amount);
      if (!Number.isFinite(amount) || amount <= 0) {
        return NextResponse.json({ error: "El importe es obligatorio." }, { status: 400 });
      }
    }

    const due = parseIsoDateInput(body.dueDate ?? "") ?? existing.dueDate;
    const occurred = parseIsoDateInput(body.occurredOn ?? "") ?? existing.occurredOn;
    const workflow =
      body.workflowStatus === "paid" ? "paid" : body.workflowStatus === "pending" ? "pending" : existing.workflowStatus;

    const row = await prisma.recurringCommitment.update({
      where: { id },
      data: {
        supplierId,
        supplierName,
        concept: body.concept?.trim() || existing.concept,
        frequency: body.frequency ?? existing.frequency,
        expectedReceptionDay: due.getDate(),
        nextReceptionDate: due,
        dueDate: due,
        occurredOn: occurred,
        occurrenceKey: occurrenceKeyFromDate(occurred),
        category: body.category ?? existing.category,
        paymentMethod: body.paymentMethod ?? existing.paymentMethod,
        currency: "MXN",
        estimatedAmount: amount,
        amount,
        workflowStatus: workflow,
        notes: body.notes !== undefined ? body.notes.slice(0, 400) : existing.notes,
      },
      include: recurringCommitmentInclude,
    });

    return NextResponse.json({ commitment: mapRecurringCommitment(row) });
  } catch (e) {
    const code = typeof e === "object" && e && "code" in e ? String(e.code) : "";
    if (code === "P2002") {
      return NextResponse.json(
        { error: "Ya existe un gasto de esta serie en esa fecha." },
        { status: 400 }
      );
    }
    return apiErrorResponse(e);
  }
}

export async function DELETE(_request: Request, ctx: Ctx) {
  try {
    const user = await requireSessionUser();
    const role = asRole(user.role);
    if (!canManageRecurringCommitments(role)) {
      return NextResponse.json({ error: "No tienes permiso para eliminar gastos." }, { status: 403 });
    }

    const { id } = await ctx.params;
    const existing = await prisma.recurringCommitment.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Gasto no encontrado." }, { status: 404 });
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
