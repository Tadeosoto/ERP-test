import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSessionUser } from "@/lib/auth/session-server";
import { apiErrorResponse } from "@/lib/api/handle-route-error";
import { mapObra } from "@/lib/services/mappers";

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
    if (user.role !== "compras") {
      return NextResponse.json({ error: "Solo Compras puede crear obras." }, { status: 403 });
    }
    const { name } = (await request.json()) as { name?: string };
    if (!name?.trim()) {
      return NextResponse.json({ error: "Nombre de obra requerido." }, { status: 400 });
    }
    const obra = await prisma.obra.create({
      data: { name: name.trim(), active: true },
      include: { _count: { select: { orders: true } } },
    });
    return NextResponse.json({ obra: mapObra(obra) });
  } catch (e) {
    return apiErrorResponse(e);
  }
}
