import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { canCreateObra } from "@/lib/domain/transitions";
import { requireSessionUser } from "@/lib/auth/session-server";
import { asRole } from "@/lib/services/mappers";
import { apiErrorResponse } from "@/lib/api/handle-route-error";
import { mapObra } from "@/lib/services/mappers";

function parseOptionalDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

export async function GET() {
  try {
    await requireSessionUser();
    const obras = await prisma.obra.findMany({
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { orders: true } } },
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
      return NextResponse.json({ error: "Solo Ingeniería puede crear obras." }, { status: 403 });
    }

    const body = (await request.json()) as {
      name?: string;
      code?: string;
      client?: string;
      managerName?: string;
      startDate?: string | null;
      estimatedEndDate?: string | null;
    };

    if (!body.name?.trim()) {
      return NextResponse.json({ error: "Nombre de obra requerido." }, { status: 400 });
    }

    const obra = await prisma.obra.create({
      data: {
        name: body.name.trim(),
        code: body.code?.trim() ?? "",
        client: body.client?.trim() ?? "",
        managerName: body.managerName?.trim() ?? "",
        startDate: parseOptionalDate(body.startDate),
        estimatedEndDate: parseOptionalDate(body.estimatedEndDate),
        active: true,
      },
      include: { _count: { select: { orders: true } } },
    });
    return NextResponse.json({ obra: mapObra(obra) });
  } catch (e) {
    return apiErrorResponse(e);
  }
}
