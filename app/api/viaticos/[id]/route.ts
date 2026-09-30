import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSessionUser } from "@/lib/auth/session-server";
import { apiErrorResponse } from "@/lib/api/handle-route-error";
import { asRole } from "@/lib/services/mappers";
import { canAccessViaticos } from "@/lib/viaticos/access";
import { mapViaticoDetail, viaticoDetailInclude } from "@/lib/viaticos/mappers";
import { parsePositiveMoney } from "@/lib/viaticos/summary";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_request: Request, ctx: Ctx) {
  try {
    const user = await requireSessionUser();
    if (!canAccessViaticos(asRole(user.role))) {
      return NextResponse.json({ error: "No tienes acceso a viáticos." }, { status: 403 });
    }
    const { id } = await ctx.params;
    const row = await prisma.viatico.findUnique({ where: { id }, include: viaticoDetailInclude });
    if (!row) return NextResponse.json({ error: "Viático no encontrado." }, { status: 404 });
    return NextResponse.json({ viatico: mapViaticoDetail(row) });
  } catch (e) {
    return apiErrorResponse(e);
  }
}

export async function PATCH(request: Request, ctx: Ctx) {
  try {
    const user = await requireSessionUser();
    if (!canAccessViaticos(asRole(user.role))) {
      return NextResponse.json({ error: "No tienes acceso a viáticos." }, { status: 403 });
    }
    const { id } = await ctx.params;
    const body = (await request.json()) as { deliveredAmount?: unknown };
    const deliveredAmount = parsePositiveMoney(body.deliveredAmount);
    if (deliveredAmount == null) {
      return NextResponse.json({ error: "El monto entregado debe ser mayor a cero." }, { status: 400 });
    }
    const existing = await prisma.viatico.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "Viático no encontrado." }, { status: 404 });
    const row = await prisma.viatico.update({
      where: { id },
      data: { deliveredAmount },
      include: viaticoDetailInclude,
    });
    return NextResponse.json({ viatico: mapViaticoDetail(row) });
  } catch (e) {
    return apiErrorResponse(e);
  }
}
