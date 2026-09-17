import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { canCreateObra } from "@/lib/domain/transitions";
import { requireSessionUser } from "@/lib/auth/session-server";
import { asRole, mapObra, obraInclude } from "@/lib/services/mappers";
import { apiErrorResponse } from "@/lib/api/handle-route-error";
import { resolveObraEngineerMemberIds } from "@/lib/obras/obra-members";
import { randomBytes } from "crypto";

function parseOptionalDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function parseMaxMaterialsBudget(value: unknown): number | null {
  if (value === undefined || value === null || value === "") return null;
  const n = typeof value === "number" ? value : Number(String(value).replace(/,/g, ""));
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.round(n * 100) / 100;
}

function newMemberId() {
  return `om_${randomBytes(12).toString("hex")}`;
}

export async function GET() {
  try {
    const user = await requireSessionUser();
    const role = asRole(user.role);

    const obras = await prisma.obra.findMany({
      where:
        role === "ingeniero"
          ? {
              OR: [
                { createdByUserId: user.id },
                { members: { some: { userId: user.id } } },
              ],
            }
          : undefined,
      orderBy: { createdAt: "desc" },
      include: obraInclude,
    });
    return NextResponse.json({ obras: obras.map(mapObra) });
  } catch (e) {
    return apiErrorResponse(e);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireSessionUser();
    const role = asRole(user.role);
    if (!canCreateObra(role)) {
      return NextResponse.json({ error: "No tienes permiso para crear obras." }, { status: 403 });
    }

    const body = (await request.json()) as {
      name?: string;
      code?: string;
      client?: string;
      managerName?: string;
      startDate?: string | null;
      estimatedEndDate?: string | null;
      maxMaterialsBudget?: number;
      engineerUserIds?: string[];
    };

    if (!body.name?.trim()) {
      return NextResponse.json({ error: "Nombre de obra requerido." }, { status: 400 });
    }

    const maxMaterialsBudget = parseMaxMaterialsBudget(body.maxMaterialsBudget);
    if (maxMaterialsBudget === null) {
      return NextResponse.json(
        { error: "El monto máximo de materiales es obligatorio y debe ser mayor a cero." },
        { status: 400 }
      );
    }

    const engineers = await prisma.user.findMany({
      where: { role: "ingeniero" },
      select: { id: true, role: true },
    });
    const members = resolveObraEngineerMemberIds({
      engineerUserIds: body.engineerUserIds,
      creatorUserId: user.id,
      creatorRole: role,
      engineerUsers: engineers,
    });
    if (!members.ok) {
      return NextResponse.json({ error: members.error }, { status: 400 });
    }

    const obra = await prisma.obra.create({
      data: {
        name: body.name.trim(),
        code: body.code?.trim() ?? "",
        client: body.client?.trim() ?? "",
        managerName: body.managerName?.trim() ?? "",
        startDate: parseOptionalDate(body.startDate),
        estimatedEndDate: parseOptionalDate(body.estimatedEndDate),
        maxMaterialsBudget,
        active: true,
        createdByUserId: user.id,
        members: {
          create: members.userIds.map((userId) => ({
            id: newMemberId(),
            userId,
          })),
        },
      },
      include: obraInclude,
    });
    return NextResponse.json({ obra: mapObra(obra) });
  } catch (e) {
    return apiErrorResponse(e);
  }
}
