import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  canCorrectDirectExpense,
  canEditDirectExpense,
  type DirectExpenseStatus,
} from "@/lib/domain/solicitudes";
import { computePaymentLabel } from "@/lib/domain/transitions";
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
    const asOwnerDraft = canEditDirectExpense(status, role, row.createdByUserId, user.id);
    const asAdminCorrection = canCorrectDirectExpense(status, role);
    if (!asOwnerDraft && !asAdminCorrection) {
      return NextResponse.json({ error: "No puedes editar esta solicitud." }, { status: 403 });
    }

    const body = (await request.json()) as {
      obraId?: string;
      costCenter?: string;
      category?: string;
      supplierName?: string;
      estimatedAmount?: number;
      amountPaidSoFar?: number;
      currency?: string;
      justification?: string;
      /** Solo Administración: volver de «Esperando factura» a «Pagada». */
      reopenToPaid?: boolean;
    };

    if (body.obraId) {
      const obra = await prisma.obra.findUnique({ where: { id: body.obraId } });
      if (!obra) {
        return NextResponse.json({ error: "Obra no encontrada." }, { status: 400 });
      }
    }

    let estimatedAmount = body.estimatedAmount ?? row.estimatedAmount;
    if (!(estimatedAmount >= 0) || !Number.isFinite(estimatedAmount)) {
      return NextResponse.json({ error: "Monto total inválido." }, { status: 400 });
    }

    let amountPaidSoFar = row.amountPaidSoFar;
    if (asAdminCorrection && body.amountPaidSoFar !== undefined) {
      const paid = Number(body.amountPaidSoFar);
      if (!Number.isFinite(paid) || paid < 0) {
        return NextResponse.json({ error: "Monto pagado inválido." }, { status: 400 });
      }
      if (paid > estimatedAmount + 0.01) {
        return NextResponse.json({ error: "El pagado no puede superar el total." }, { status: 400 });
      }
      amountPaidSoFar = paid;
    } else if (amountPaidSoFar > estimatedAmount + 0.01) {
      amountPaidSoFar = estimatedAmount;
    }

    const paymentLabel = computePaymentLabel(estimatedAmount, amountPaidSoFar);
    let nextStatus: DirectExpenseStatus = status;

    if (asAdminCorrection && body.reopenToPaid && status === "awaiting_invoice") {
      nextStatus = "paid";
    } else if (asAdminCorrection && status === "sent") {
      // Si corrigen montos y ya quedó saldado, pasar a pagada.
      if (amountPaidSoFar >= estimatedAmount - 0.01 && estimatedAmount > 0) {
        nextStatus = "paid";
      }
    } else if (asAdminCorrection && (status === "paid" || status === "awaiting_invoice")) {
      // Si bajan el pagado y queda saldo, volver a enviada para poder registrar de nuevo.
      if (amountPaidSoFar < estimatedAmount - 0.01) {
        nextStatus = "sent";
      } else if (status === "awaiting_invoice" && !body.reopenToPaid) {
        nextStatus = "awaiting_invoice";
      } else if (status === "paid" || body.reopenToPaid) {
        nextStatus = "paid";
      }
    }

    const updated = await prisma.directExpenseRequest.update({
      where: { id },
      data: {
        obraId: body.obraId ?? row.obraId,
        costCenter: body.costCenter !== undefined ? body.costCenter.trim() : row.costCenter,
        category: body.category !== undefined ? body.category.trim() : row.category,
        supplierName: body.supplierName !== undefined ? body.supplierName.trim() : row.supplierName,
        estimatedAmount,
        amountPaidSoFar,
        paymentLabel,
        currency: body.currency?.trim() ?? row.currency,
        justification:
          body.justification !== undefined ? body.justification.trim() : row.justification,
        status: nextStatus,
      },
      include: directExpenseInclude,
    });

    return NextResponse.json({ expense: mapDirectExpense(updated) });
  } catch (e) {
    return apiErrorResponse(e);
  }
}
