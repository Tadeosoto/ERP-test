import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  canEditDirectExpense,
  type DirectExpenseStatus,
} from "@/lib/domain/solicitudes";
import { requireSessionUser } from "@/lib/auth/session-server";
import { asRole } from "@/lib/services/mappers";
import {
  directExpenseInclude,
  mapDirectExpense,
} from "@/lib/services/solicitud-mappers";
import { apiErrorResponse } from "@/lib/api/handle-route-error";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_request: Request, ctx: Ctx) {
  try {
    await requireSessionUser();
    const { id } = await ctx.params;
    const row = await prisma.directExpenseRequest.findUnique({
      where: { id },
      include: directExpenseInclude,
    });
    if (!row) return NextResponse.json({ error: "Solicitud no encontrada." }, { status: 404 });
    return NextResponse.json({ expense: mapDirectExpense(row) });
  } catch (e) {
    return apiErrorResponse(e);
  }
}

export async function PATCH(request: Request, ctx: Ctx) {
  try {
    const user = await requireSessionUser();
    const { id } = await ctx.params;
    const row = await prisma.directExpenseRequest.findUnique({ where: { id } });
    if (!row) return NextResponse.json({ error: "Solicitud no encontrada." }, { status: 404 });

    const status = row.status as DirectExpenseStatus;
    const role = asRole(user.role);
    if (!canEditDirectExpense(status, role, row.createdByUserId, user.id)) {
      return NextResponse.json({ error: "No puedes editar esta solicitud." }, { status: 403 });
    }

    const body = (await request.json()) as {
      obraId?: string;
      costCenter?: string;
      category?: string;
      supplierName?: string;
      estimatedAmount?: number;
      currency?: string;
      justification?: string;
    };

    const updated = await prisma.directExpenseRequest.update({
      where: { id },
      data: {
        obraId: body.obraId ?? row.obraId,
        costCenter: body.costCenter?.trim() ?? row.costCenter,
        category: body.category?.trim() ?? row.category,
        supplierName: body.supplierName?.trim() ?? row.supplierName,
        estimatedAmount: body.estimatedAmount ?? row.estimatedAmount,
        currency: body.currency?.trim() ?? row.currency,
        justification: body.justification?.trim() ?? row.justification,
      },
      include: directExpenseInclude,
    });

    return NextResponse.json({ expense: mapDirectExpense(updated) });
  } catch (e) {
    return apiErrorResponse(e);
  }
}
