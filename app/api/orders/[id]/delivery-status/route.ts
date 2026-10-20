import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSessionUser } from "@/lib/auth/session-server";
import { asRole, mapOrder, orderInclude } from "@/lib/services/mappers";
import { apiErrorResponse } from "@/lib/api/handle-route-error";
import { DELIVERY_STATUSES, asDeliveryStatus } from "@/lib/pagos/friday-review";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, ctx: Ctx) {
  try {
    const user = await requireSessionUser();
    const role = asRole(user.role);
    if (role !== "pagos" && role !== "direccion" && role !== "compras") {
      return NextResponse.json({ error: "No tienes permiso." }, { status: 403 });
    }

    const { id } = await ctx.params;
    const body = (await request.json()) as { deliveryStatus?: string };
    if (!body.deliveryStatus || !(DELIVERY_STATUSES as readonly string[]).includes(body.deliveryStatus)) {
      return NextResponse.json({ error: "Estado de entrega inválido." }, { status: 400 });
    }

    const updated = await prisma.purchaseOrder.update({
      where: { id },
      data: { deliveryStatus: asDeliveryStatus(body.deliveryStatus) },
      include: orderInclude,
    });

    return NextResponse.json({ order: mapOrder(updated) });
  } catch (e) {
    return apiErrorResponse(e);
  }
}
