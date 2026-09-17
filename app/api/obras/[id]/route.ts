import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { prisma } from "@/lib/db";
import { canConfigureObra, canDeleteObra } from "@/lib/domain/transitions";
import { requireSessionUser } from "@/lib/auth/session-server";
import { cleanupOrderStoredFiles } from "@/lib/services/files";
import { asRole, mapObra, obraInclude } from "@/lib/services/mappers";
import { apiErrorResponse } from "@/lib/api/handle-route-error";
import { engineerCanAccessObra, resolveObraEngineerMemberIds } from "@/lib/obras/obra-members";

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

function newMemberId() {
  return `om_${randomBytes(12).toString("hex")}`;
}

export async function GET(_request: Request, ctx: Ctx) {
  try {
    const user = await requireSessionUser();
    const role = asRole(user.role);
    const { id } = await ctx.params;
    const obra = await prisma.obra.findUnique({
      where: { id },
      include: obraInclude,
    });
    if (!obra) {
      return NextResponse.json({ error: "Obra no encontrada." }, { status: 404 });
    }
    if (
      !engineerCanAccessObra({
        role,
        userId: user.id,
        createdByUserId: obra.createdByUserId,
        memberUserIds: obra.members.map((m) => m.userId),
      })
    ) {
      return NextResponse.json({ error: "No tienes acceso a esta obra." }, { status: 403 });
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
      engineerUserIds?: string[];
    };

    const existing = await prisma.obra.findUnique({
      where: { id },
      include: { members: true },
    });
    if (!existing) {
      return NextResponse.json({ error: "Obra no encontrada." }, { status: 404 });
    }

    if (
      role === "ingeniero" &&
      !engineerCanAccessObra({
        role,
        userId: user.id,
        createdByUserId: existing.createdByUserId,
        memberUserIds: existing.members.map((m) => m.userId),
      })
    ) {
      return NextResponse.json({ error: "No tienes acceso a esta obra." }, { status: 403 });
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
    if (body.estimatedEndDate !== undefined) {
      data.estimatedEndDate = parseOptionalDate(body.estimatedEndDate);
    }
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

    if (body.engineerUserIds !== undefined) {
      const engineers = await prisma.user.findMany({
        where: { role: "ingeniero" },
        select: { id: true, role: true },
      });
      const members = resolveObraEngineerMemberIds({
        engineerUserIds: body.engineerUserIds,
        creatorUserId: existing.createdByUserId ?? user.id,
        creatorRole:
          existing.createdByUserId === user.id
            ? role
            : role === "ingeniero"
              ? "ingeniero"
              : "pagos",
        engineerUsers: engineers,
      });
      if (!members.ok) {
        return NextResponse.json({ error: members.error }, { status: 400 });
      }

      await prisma.$transaction(async (tx) => {
        await tx.obraMember.deleteMany({ where: { obraId: id } });
        await tx.obraMember.createMany({
          data: members.userIds.map((userId) => ({
            id: newMemberId(),
            obraId: id,
            userId,
          })),
        });
        if (Object.keys(data).length > 0) {
          await tx.obra.update({ where: { id }, data });
        }
      });

      const obra = await prisma.obra.findUniqueOrThrow({
        where: { id },
        include: obraInclude,
      });
      return NextResponse.json({ obra: mapObra(obra) });
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: "Nada que actualizar." }, { status: 400 });
    }

    const obra = await prisma.obra.update({
      where: { id },
      data,
      include: obraInclude,
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
