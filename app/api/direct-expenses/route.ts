import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { canCreateDirectExpense } from "@/lib/domain/solicitudes";
import { requireSessionUser } from "@/lib/auth/session-server";
import { asRole } from "@/lib/services/mappers";
import {
  directExpenseInclude,
  mapDirectExpense,
} from "@/lib/services/solicitud-mappers";
import { apiErrorResponse } from "@/lib/api/handle-route-error";

export async function GET(request: Request) {
  try {
    const user = await requireSessionUser();
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const mine = searchParams.get("mine") === "1";
    const obraId = searchParams.get("obraId");
    const includeCompleted = searchParams.get("includeCompleted") === "1";

    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (obraId) where.obraId = obraId;
    if (mine && user.role === "ingeniero") where.createdByUserId = user.id;
    if (user.role === "pagos" && !status) {
      where.status = {
        in: includeCompleted
          ? ["sent", "paid", "awaiting_invoice", "invoice_received", "difference", "completed"]
          : ["sent", "paid", "awaiting_invoice", "invoice_received", "difference"],
      };
    }
    // Dirección / recepción / contabilidad pueden consultar gastos de una obra o el listado.
    if (
      ["direccion", "recepcion", "contabilidad"].includes(user.role) &&
      !status &&
      !where.status
    ) {
      where.status = { not: "draft" };
    }

    const rows = await prisma.directExpenseRequest.findMany({
      where,
      include: directExpenseInclude,
      orderBy: { updatedAt: "desc" },
    });
    return NextResponse.json({ expenses: rows.map(mapDirectExpense) });
  } catch (e) {
    return apiErrorResponse(e);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireSessionUser();
    const role = asRole(user.role);
    if (!canCreateDirectExpense(role)) {
      return NextResponse.json({ error: "Solo Ingeniería puede crear solicitudes de gasto directo." }, { status: 403 });
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

    if (!body.obraId?.trim()) {
      return NextResponse.json({ error: "La obra es requerida." }, { status: 400 });
    }
    if (!body.justification?.trim()) {
      return NextResponse.json({ error: "La justificación es requerida." }, { status: 400 });
    }

    const amount = Number(body.estimatedAmount ?? 0);

    const row = await prisma.directExpenseRequest.create({
      data: {
        obraId: body.obraId,
        costCenter: body.costCenter?.trim() ?? "",
        category: body.category?.trim() ?? "",
        supplierName: body.supplierName?.trim() ?? "",
        estimatedAmount: amount,
        currency: body.currency?.trim() || "MXN",
        justification: body.justification.trim(),
        status: "draft",
        createdByUserId: user.id,
      },
      include: directExpenseInclude,
    });

    return NextResponse.json({ expense: mapDirectExpense(row) });
  } catch (e) {
    return apiErrorResponse(e);
  }
}
