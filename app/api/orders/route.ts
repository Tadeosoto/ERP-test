import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createOrderByCompras } from "@/lib/domain/transitions";
import { requireSessionUser } from "@/lib/auth/session-server";
import { NotificationEvents, notifyByRoles } from "@/lib/services/notifications";
import { mapOrder, orderInclude } from "@/lib/services/mappers";
import { apiErrorResponse } from "@/lib/api/handle-route-error";
import type { PaymentType } from "@/lib/domain/types";
export async function GET(request: Request) {
  try {
    await requireSessionUser();
    const { searchParams } = new URL(request.url);
    const obraId = searchParams.get("obraId");
    const orders = await prisma.purchaseOrder.findMany({
      where: obraId ? { obraId } : undefined,
      include: orderInclude,
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ orders: orders.map(mapOrder) });
  } catch (e) {
    return apiErrorResponse(e);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireSessionUser();
    if (user.role !== "compras") {
      return NextResponse.json({ error: "Solo Compras (Paty) puede crear órdenes." }, { status: 403 });
    }

    const body = (await request.json()) as {
      obraId?: string;
      title?: string;
      supplierName?: string;
      totalAmount?: number;
      description?: string;
      suggestedPaymentType?: PaymentType | null;
    };

    if (!body.obraId || !body.title?.trim() || !body.supplierName?.trim()) {
      return NextResponse.json({ error: "Obra, título y proveedor son requeridos." }, { status: 400 });
    }

    const suggested =
      body.suggestedPaymentType === "parcialidades" ? "parcialidades" : null;

    const computed = createOrderByCompras({
      totalAmount: Number(body.totalAmount),
      suggestedPaymentType: suggested,
    });

    const order = await prisma.purchaseOrder.create({
      data: {
        obraId: body.obraId,
        title: body.title.trim(),
        supplierName: body.supplierName.trim(),
        description: body.description?.trim() ?? "",
        totalAmount: computed.totalAmount,
        amountPaidSoFar: computed.amountPaidSoFar,
        paymentLabel: computed.paymentLabel,
        suggestedPaymentType: computed.suggestedPaymentType,
        status: computed.status,
        createdByUserId: user.id,
      },
      include: orderInclude,
    });

    const evt = NotificationEvents.orderCreated(order.title);
    await notifyByRoles(order.id, evt.type, evt.message, evt.roles);

    return NextResponse.json({ order: mapOrder(order) });
  } catch (e) {
    return apiErrorResponse(e);
  }
}