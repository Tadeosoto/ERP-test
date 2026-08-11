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

export async function GET() {
  try {
    await requireSessionUser();
    const rows = await prisma.recurringCommitment.findMany({
      where: { active: true },
      orderBy: [{ dueDate: "asc" }, { supplierName: "asc" }],
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
      return NextResponse.json({ error: "No tienes permiso para crear compromisos." }, { status: 403 });
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

    if (!body.concept?.trim()) {
      return NextResponse.json({ error: "El concepto es requerido." }, { status: 400 });
    }
    if (!body.frequency?.trim()) {
      return NextResponse.json({ error: "La frecuencia es requerida." }, { status: 400 });
    }
    const due = parseIsoDateInput(body.dueDate ?? "");
    if (!due) {
      return NextResponse.json({ error: "Indica la fecha límite de pago." }, { status: 400 });
    }

    let supplierName = body.supplierName?.trim() ?? "";
    let supplierId: string | null = body.supplierId ?? null;
    if (supplierId) {
      const supplier = await prisma.supplier.findUnique({ where: { id: supplierId } });
      if (!supplier) {
        return NextResponse.json({ error: "Proveedor no encontrado." }, { status: 404 });
      }
      supplierName = supplier.commercialName || supplier.legalName;
    }
    if (!supplierName) {
      return NextResponse.json({ error: "Selecciona un proveedor." }, { status: 400 });
    }

    const day = due.getDate();

    const row = await prisma.recurringCommitment.create({
      data: {
        supplierId,
        supplierName,
        concept: body.concept.trim(),
        frequency: body.frequency,
        expectedReceptionDay: day,
        nextReceptionDate: due,
        dueDate: due,
        obraId: null,
        costCenter: "",
        currency: body.currency?.trim() || "MXN",
        estimatedAmount:
          body.estimatedAmount != null && Number.isFinite(body.estimatedAmount)
            ? body.estimatedAmount
            : null,
        lifecycleStatus: "active",
        workflowStatus: "pending",
        notes: (body.notes ?? "").slice(0, 200),
        createdByUserId: user.id,
      },
      include: recurringCommitmentInclude,
    });

    return NextResponse.json({ commitment: mapRecurringCommitment(row) });
  } catch (e) {
    return apiErrorResponse(e);
  }
}
