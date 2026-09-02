import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { canCreateExpedientes, canViewExpedientes } from "@/lib/domain/expedientes";
import { requireSessionUser } from "@/lib/auth/session-server";
import { asRole } from "@/lib/services/mappers";
import {
  expedienteListInclude,
  mapExpedienteListItem,
  nextExpedienteFolio,
} from "@/lib/services/expediente-mappers";
import { apiErrorResponse } from "@/lib/api/handle-route-error";

export async function GET(request: Request) {
  try {
    const user = await requireSessionUser();
    if (!canViewExpedientes(asRole(user.role))) {
      return NextResponse.json({ error: "No autorizado." }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const q = (searchParams.get("q") ?? "").trim().toLowerCase();
    const obraId = searchParams.get("obraId")?.trim() || null;
    const limit = Math.min(200, Math.max(1, Number(searchParams.get("limit") ?? 100) || 100));

    const rows = await prisma.expediente.findMany({
      orderBy: [{ updatedAt: "desc" }, { folio: "desc" }],
      take: limit,
      include: expedienteListInclude,
      where: {
        ...(obraId ? { obraId } : {}),
        ...(q
          ? {
              OR: [
                { folio: { contains: q, mode: "insensitive" } },
                { name: { contains: q, mode: "insensitive" } },
                { notes: { contains: q, mode: "insensitive" } },
                { obra: { name: { contains: q, mode: "insensitive" } } },
              ],
            }
          : {}),
      },
    });

    return NextResponse.json({ expedientes: rows.map(mapExpedienteListItem) });
  } catch (e) {
    return apiErrorResponse(e);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireSessionUser();
    const role = asRole(user.role);
    if (!canCreateExpedientes(role)) {
      return NextResponse.json(
        { error: "Solo Administración y Dirección pueden crear expedientes." },
        { status: 403 }
      );
    }

    const body = (await request.json()) as {
      name?: string;
      notes?: string;
      obraId?: string | null;
      folio?: string | null;
    };

    const name = body.name?.trim() ?? "";
    if (!name) {
      return NextResponse.json({ error: "El nombre del expediente es requerido." }, { status: 400 });
    }

    const obraId = body.obraId?.trim() ?? "";
    if (!obraId) {
      return NextResponse.json({ error: "La obra es requerida. Los expedientes pertenecen a una obra." }, { status: 400 });
    }

    const folio = body.folio?.trim() || (await nextExpedienteFolio(prisma));
    const exists = await prisma.expediente.findUnique({ where: { folio } });
    if (exists) {
      return NextResponse.json({ error: "Ese folio de expediente ya existe." }, { status: 400 });
    }

    const obra = await prisma.obra.findUnique({ where: { id: obraId } });
    if (!obra) return NextResponse.json({ error: "Obra no encontrada." }, { status: 404 });

    const row = await prisma.expediente.create({
      data: {
        folio,
        name,
        notes: (body.notes ?? "").trim(),
        obraId,
        createdByUserId: user.id,
      },
      include: expedienteListInclude,
    });

    return NextResponse.json({ expediente: mapExpedienteListItem(row) });
  } catch (e) {
    return apiErrorResponse(e);
  }
}
