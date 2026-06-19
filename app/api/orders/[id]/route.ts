import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { canComprasEditOrder, canDeleteOrder } from "@/lib/domain/transitions";
import { requireSessionUser } from "@/lib/auth/session-server";
import { asOrderStatus, asRole, mapOrder, orderInclude } from "@/lib/services/mappers";
import { apiErrorResponse } from "@/lib/api/handle-route-error";
import type { PaymentType } from "@/lib/domain/types";

type Ctx = { params: Promise<{ id: string }> };

function buildTitle(ocFolio: string, supplierName: string): string {
  if (ocFolio.trim()) return ocFolio.trim();
  return supplierName.trim() || "Orden de compra";
}

export async function GET(_request: Request, ctx: Ctx) {
  try {
    await requireSessionUser();
    const { id } = await ctx.params;
    const order = await prisma.purchaseOrder.findUnique({
      where: { id },
      include: orderInclude,
    });
    if (!order) return NextResponse.json({ error: "Orden no encontrada." }, { status: 404 });
    return NextResponse.json({ order: mapOrder(order) });
  } catch (e) {
    return apiErrorResponse(e);
  }
}

export async function PATCH(request: Request, ctx: Ctx) {
  try {
    const user = await requireSessionUser();
    const { id } = await ctx.params;
    const order = await prisma.purchaseOrder.findUnique({ where: { id } });
    if (!order) return NextResponse.json({ error: "Orden no encontrada." }, { status: 404 });

    const status = asOrderStatus(order.status);
    const role = asRole(user.role);
    if (!canComprasEditOrder(status, role)) {
      return NextResponse.json(
        { error: "Solo puedes editar órdenes en borrador o con corrección solicitada." },
        { status: 403 }
      );
    }

    const body = (await request.json()) as {
      obraId?: string;
      supplierName?: string;
      supplierId?: string | null;
      ocFolio?: string;
      ocDate?: string | null;
      paymentTerms?: string;
      description?: string;
      internalReference?: string;
      documentDate?: string | null;
      totalAmount?: number;
      currency?: string;
      paymentType?: PaymentType | null;
      assignedEngineerUserId?: string | null;
    };

    const supplierName = body.supplierName?.trim() ?? order.supplierName;
    const ocFolio = body.ocFolio?.trim() ?? order.ocFolio;

    const updated = await prisma.purchaseOrder.update({
      where: { id },
      data: {
        obraId: body.obraId ?? order.obraId,
        supplierName,
        supplierId: body.supplierId !== undefined ? body.supplierId : order.supplierId,
        ocFolio,
        title: buildTitle(ocFolio, supplierName),
        ocDate: body.ocDate !== undefined ? (body.ocDate ? new Date(body.ocDate) : null) : order.ocDate,
        paymentTerms: body.paymentTerms?.trim() ?? order.paymentTerms,
        description: body.description?.trim() ?? order.description,
        internalReference: body.internalReference?.trim() ?? order.internalReference,
        documentDate:
          body.documentDate !== undefined
            ? body.documentDate
              ? new Date(body.documentDate)
              : null
            : order.documentDate,
        totalAmount: body.totalAmount ?? order.totalAmount,
        currency: body.currency?.trim() ?? order.currency,
        paymentType: body.paymentType !== undefined ? body.paymentType : order.paymentType,
        suggestedPaymentType:
          body.paymentType === "parcialidades"
            ? "parcialidades"
            : body.paymentType
              ? null
              : order.suggestedPaymentType,
        assignedEngineerUserId:
          body.assignedEngineerUserId !== undefined
            ? body.assignedEngineerUserId
            : order.assignedEngineerUserId,
      },
      include: orderInclude,
    });

    return NextResponse.json({ order: mapOrder(updated) });
  } catch (e) {
    return apiErrorResponse(e);
  }
}

export async function DELETE(_request: Request, ctx: Ctx) {
  try {
    const user = await requireSessionUser();
    const { id } = await ctx.params;
    const order = await prisma.purchaseOrder.findUnique({ where: { id } });
    if (!order) return NextResponse.json({ error: "Orden no encontrada." }, { status: 404 });

    const status = asOrderStatus(order.status);
    const role = asRole(user.role);
    if (!canDeleteOrder(status, role, order.amountPaidSoFar)) {
      return NextResponse.json(
        { error: "No puedes eliminar esta orden (solo borradores o correcciones sin pagos)." },
        { status: 403 }
      );
    }

    await prisma.$transaction(async (tx) => {
      if (order.materialRequestId) {
        await tx.materialRequest.updateMany({
          where: { id: order.materialRequestId, status: "in_oc_process" },
          data: { status: "sent" },
        });
      }
      await tx.purchaseOrder.delete({ where: { id } });
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    return apiErrorResponse(e);
  }
}
