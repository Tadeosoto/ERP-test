import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  isAdminCategory,
  isAdminFrequency,
  isAdminPaymentMethod,
  occurrenceKeyFromDate,
} from "@/lib/domain/admin-expenses";
import { parseIsoDateInput } from "@/lib/domain/recurring-commitments";
import {
  canManageRecurringCommitments,
  canViewRecurringCommitments,
} from "@/lib/domain/transitions";
import { requireSessionUser } from "@/lib/auth/session-server";
import { asRole } from "@/lib/services/mappers";
import { ensureAdminExpenseOccurrences } from "@/lib/services/admin-expense-roll-forward";
import {
  mapRecurringCommitment,
  recurringCommitmentInclude,
} from "@/lib/services/recurring-commitment-mappers";
import { apiErrorResponse } from "@/lib/api/handle-route-error";

export async function GET() {
  try {
    const user = await requireSessionUser();
    const role = asRole(user.role);
    if (!canViewRecurringCommitments(role)) {
      return NextResponse.json(
        { error: "No tienes permiso para ver los gastos administrativos." },
        { status: 403 }
      );
    }
    await ensureAdminExpenseOccurrences();
    const rows = await prisma.recurringCommitment.findMany({
      where: { active: true },
      orderBy: [{ occurredOn: "desc" }, { dueDate: "asc" }],
      include: recurringCommitmentInclude,
    });
    return NextResponse.json({ commitments: rows.map(mapRecurringCommitment) });
  } catch (e) {
    return apiErrorResponse(e);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireSessionUser();
    const role = asRole(user.role);
    if (!canManageRecurringCommitments(role)) {
      return NextResponse.json({ error: "No tienes permiso para registrar gastos." }, { status: 403 });
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
      notes?: string;
    };

    if (!body.concept?.trim()) {
      return NextResponse.json({ error: "El concepto es requerido." }, { status: 400 });
    }
    if (!body.frequency || !isAdminFrequency(body.frequency)) {
      return NextResponse.json({ error: "Selecciona la periodicidad." }, { status: 400 });
    }
    if (!body.category || !isAdminCategory(body.category)) {
      return NextResponse.json({ error: "Selecciona la categoría." }, { status: 400 });
    }
    if (!body.paymentMethod || !isAdminPaymentMethod(body.paymentMethod)) {
      return NextResponse.json({ error: "Selecciona la forma de pago." }, { status: 400 });
    }
    const amount = Number(body.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ error: "El importe es obligatorio." }, { status: 400 });
    }
    const due = parseIsoDateInput(body.dueDate ?? "");
    const occurred = parseIsoDateInput(body.occurredOn ?? "");
    if (!occurred) {
      return NextResponse.json({ error: "Indica la fecha del gasto." }, { status: 400 });
    }
    if (!due) {
      return NextResponse.json({ error: "Indica la fecha de vencimiento." }, { status: 400 });
    }

    let supplierId: string | null = body.supplierId ?? null;
    let supplierName = "";
    if (!supplierId) {
      return NextResponse.json({ error: "Selecciona un proveedor." }, { status: 400 });
    }
    const supplier = await prisma.supplier.findUnique({ where: { id: supplierId } });
    if (!supplier) {
      return NextResponse.json({ error: "Proveedor no encontrado." }, { status: 404 });
    }
    supplierName = supplier.commercialName || supplier.legalName;

    const occurrenceKey = occurrenceKeyFromDate(occurred);
    const created = await prisma.recurringCommitment.create({
      data: {
        supplierId,
        supplierName,
        concept: body.concept.trim(),
        frequency: body.frequency,
        expectedReceptionDay: due.getDate(),
        nextReceptionDate: due,
        dueDate: due,
        occurredOn: occurred,
        category: body.category,
        paymentMethod: body.paymentMethod,
        seriesId: `tmp_${occurrenceKey}`,
        occurrenceKey: `tmp_${Date.now()}`,
        obraId: null,
        costCenter: "",
        currency: "MXN",
        estimatedAmount: amount,
        amount,
        lifecycleStatus: "active",
        workflowStatus: "pending",
        notes: (body.notes ?? "").slice(0, 400),
        createdByUserId: user.id,
      },
    });

    const row = await prisma.recurringCommitment.update({
      where: { id: created.id },
      data: { seriesId: created.id, occurrenceKey },
      include: recurringCommitmentInclude,
    });

    return NextResponse.json({ commitment: mapRecurringCommitment(row) });
  } catch (e) {
    return apiErrorResponse(e);
  }
}
