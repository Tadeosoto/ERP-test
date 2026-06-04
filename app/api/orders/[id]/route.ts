import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSessionUser } from "@/lib/auth/session-server";
import { mapOrder, orderInclude } from "@/lib/services/mappers";

type Ctx = { params: Promise<{ id: string }> };

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
    if (e instanceof Error && e.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
    return NextResponse.json({ error: "Error al obtener orden." }, { status: 500 });
  }
}
