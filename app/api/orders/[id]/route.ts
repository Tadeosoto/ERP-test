import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { canUpdateDraftOrder } from "@/lib/domain/transitions";
import { requireSessionUser } from "@/lib/auth/session-server";
import { asOrderStatus, asRole, mapOrder, orderInclude } from "@/lib/services/mappers";
import { apiErrorResponse } from "@/lib/api/handle-route-error";

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
    if (!canUpdateDraftOrder(status, role)) {
      return NextResponse.json({ error: "Solo puedes editar órdenes en borrador." }, { status: 403 });
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
