import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSessionUser } from "@/lib/auth/session-server";
import { apiErrorResponse } from "@/lib/api/handle-route-error";
import { mapObra } from "@/lib/services/mappers";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_request: Request, ctx: Ctx) {
  try {
    await requireSessionUser();
    const { id } = await ctx.params;
    const obra = await prisma.obra.findUnique({
      where: { id },
      include: { _count: { select: { orders: true } } },
    });
    if (!obra) {
      return NextResponse.json({ error: "Obra no encontrada." }, { status: 404 });
    }
    return NextResponse.json({ obra: mapObra(obra) });
  } catch (e) {
    return apiErrorResponse(e);
  }
}

export async function PATCH(request: Request, ctx: Ctx) {
  try {
    const user = await requireSessionUser();
    if (user.role !== "compras") {
      return NextResponse.json({ error: "Solo Compras puede configurar obras." }, { status: 403 });
    }
    const { id } = await ctx.params;
    const body = (await request.json()) as { name?: string; active?: boolean };

    const existing = await prisma.obra.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Obra no encontrada." }, { status: 404 });
    }

    const data: { name?: string; active?: boolean } = {};
    if (body.name !== undefined) {
      const trimmed = body.name.trim();
      if (!trimmed) {
        return NextResponse.json({ error: "El nombre no puede estar vacío." }, { status: 400 });
      }
      data.name = trimmed;
    }
    if (body.active !== undefined) {
      data.active = Boolean(body.active);
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: "Nada que actualizar." }, { status: 400 });
    }

    const obra = await prisma.obra.update({
      where: { id },
      data,
      include: { _count: { select: { orders: true } } },
    });
    return NextResponse.json({ obra: mapObra(obra) });
  } catch (e) {
    return apiErrorResponse(e);
  }
}
