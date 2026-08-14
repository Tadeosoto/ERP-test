import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  canDeleteExpedientes,
  canEditExpedientes,
  canViewExpedientes,
} from "@/lib/domain/expedientes";
import { requireSessionUser } from "@/lib/auth/session-server";
import { asRole } from "@/lib/services/mappers";
import {
  expedienteDetailInclude,
  mapExpedienteDetail,
} from "@/lib/services/expediente-mappers";
import { apiErrorResponse } from "@/lib/api/handle-route-error";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_request: Request, ctx: Ctx) {
  try {
    const user = await requireSessionUser();
    if (!canViewExpedientes(asRole(user.role))) {
      return NextResponse.json({ error: "No autorizado." }, { status: 403 });
    }

    const { id } = await ctx.params;
    const row = await prisma.expediente.findFirst({
      where: { OR: [{ id }, { folio: id }] },
      include: expedienteDetailInclude,
    });
    if (!row) return NextResponse.json({ error: "Expediente no encontrado." }, { status: 404 });

    return NextResponse.json({ expediente: mapExpedienteDetail(row) });
  } catch (e) {
    return apiErrorResponse(e);
  }
}

export async function PATCH(request: Request, ctx: Ctx) {
  try {
    const user = await requireSessionUser();
    const role = asRole(user.role);
    if (!canEditExpedientes(role)) {
      return NextResponse.json(
        { error: "Solo Administración y Dirección pueden editar expedientes." },
        { status: 403 }
      );
    }

    const { id } = await ctx.params;
    const existing = await prisma.expediente.findFirst({
      where: { OR: [{ id }, { folio: id }] },
    });
    if (!existing) return NextResponse.json({ error: "Expediente no encontrado." }, { status: 404 });

    const body = (await request.json()) as {
      name?: string;
      notes?: string;
      obraId?: string | null;
      folio?: string;
    };

    if (body.folio && body.folio.trim() !== existing.folio) {
      const clash = await prisma.expediente.findUnique({ where: { folio: body.folio.trim() } });
      if (clash) {
        return NextResponse.json({ error: "Ese folio ya está en uso." }, { status: 400 });
      }
    }

    const row = await prisma.expediente.update({
      where: { id: existing.id },
      data: {
        name: body.name?.trim() ?? existing.name,
        notes: body.notes !== undefined ? body.notes.trim() : existing.notes,
        obraId: body.obraId !== undefined ? body.obraId || null : existing.obraId,
        folio: body.folio?.trim() || existing.folio,
      },
      include: expedienteDetailInclude,
    });

    return NextResponse.json({ expediente: mapExpedienteDetail(row) });
  } catch (e) {
    return apiErrorResponse(e);
  }
}

export async function DELETE(_request: Request, ctx: Ctx) {
  try {
    const user = await requireSessionUser();
    if (!canDeleteExpedientes(asRole(user.role))) {
      return NextResponse.json(
        { error: "Solo Administración y Dirección pueden eliminar expedientes." },
        { status: 403 }
      );
    }

    const { id } = await ctx.params;
    const existing = await prisma.expediente.findFirst({
      where: { OR: [{ id }, { folio: id }] },
      include: {
        _count: {
          select: {
            purchaseOrders: true,
            recurringCommitments: true,
            invoiceFirstCommitments: true,
          },
        },
      },
    });
    if (!existing) return NextResponse.json({ error: "Expediente no encontrado." }, { status: 404 });

    const linked =
      existing._count.purchaseOrders +
      existing._count.recurringCommitments +
      existing._count.invoiceFirstCommitments;
    if (linked > 0) {
      return NextResponse.json(
        {
          error:
            "No se puede eliminar: aún tiene OC, compromisos o pagos Proceso C vinculados. Desvincúlalos primero.",
        },
        { status: 400 }
      );
    }

    await prisma.expediente.delete({ where: { id: existing.id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return apiErrorResponse(e);
  }
}
