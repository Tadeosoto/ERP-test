import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { canConfigureObra, canDeleteObra } from "@/lib/domain/transitions";
import { requireSessionUser } from "@/lib/auth/session-server";
import { cleanupOrderStoredFiles } from "@/lib/services/files";
import { asRole, mapObra } from "@/lib/services/mappers";
import { apiErrorResponse } from "@/lib/api/handle-route-error";

type Ctx = { params: Promise<{ id: string }> };

function parseOptionalDate(value: string | null | undefined): Date | null | undefined {
  if (value === undefined) return undefined;
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function parseMaxMaterialsBudget(value: unknown): number | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === "") return 0;
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 100) / 100;
}

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
    const role = asRole(user.role);
    if (!canConfigureObra(role)) {
      return NextResponse.json({ error: "No tienes permiso para editar obras." }, { status: 403 });
    }
    const { id } = await ctx.params;
    const body = (await request.json()) as {
      name?: string;
      code?: string;
      client?: string;
      managerName?: string;
      startDate?: string | null;
      estimatedEndDate?: string | null;
      active?: boolean;
      maxMaterialsBudget?: number;
    };

    const existing = await prisma.obra.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Obra no encontrada." }, { status: 404 });
    }

    const data: Record<string, unknown> = {};
    if (body.name !== undefined) {
      const trimmed = body.name.trim();
      if (!trimmed) {
        return NextResponse.json({ error: "El nombre no puede estar vacío." }, { status: 400 });
      }
      data.name = trimmed;
    }
    if (body.code !== undefined) data.code = body.code.trim();
    if (body.client !== undefined) data.client = body.client.trim();
    if (body.managerName !== undefined) data.managerName = body.managerName.trim();
    if (body.startDate !== undefined) data.startDate = parseOptionalDate(body.startDate);
    if (body.estimatedEndDate !== undefined) data.estimatedEndDate = parseOptionalDate(body.estimatedEndDate);
    if (body.active !== undefined) data.active = Boolean(body.active);
    if (body.maxMaterialsBudget !== undefined) {
      const maxMaterialsBudget = parseMaxMaterialsBudget(body.maxMaterialsBudget);
      if (maxMaterialsBudget === null) {
        return NextResponse.json(
          { error: "Monto máximo de materiales inválido." },
          { status: 400 }
        );
      }
      data.maxMaterialsBudget = maxMaterialsBudget;
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

export async function DELETE(_request: Request, ctx: Ctx) {
  try {
    const user = await requireSessionUser();
    const role = asRole(user.role);
    if (!canDeleteObra(role)) {
      return NextResponse.json({ error: "No tienes permiso para eliminar obras." }, { status: 403 });
    }

    const { id } = await ctx.params;
    const existing = await prisma.obra.findUnique({
      where: { id },
      include: { orders: { select: { id: true } } },
    });
    if (!existing) {
      return NextResponse.json({ error: "Obra no encontrada." }, { status: 404 });
    }

    for (const order of existing.orders) {
      await cleanupOrderStoredFiles(order.id);
    }
    await prisma.obra.delete({ where: { id } });

    return NextResponse.json({ ok: true });
  } catch (e) {
    return apiErrorResponse(e);
  }
}
