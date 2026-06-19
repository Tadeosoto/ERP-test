import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  canEditMaterialRequest,
  type MaterialRequestStatus,
} from "@/lib/domain/solicitudes";
import { requireSessionUser } from "@/lib/auth/session-server";
import { asRole } from "@/lib/services/mappers";
import {
  mapMaterialRequest,
  materialRequestInclude,
} from "@/lib/services/solicitud-mappers";
import { apiErrorResponse } from "@/lib/api/handle-route-error";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_request: Request, ctx: Ctx) {
  try {
    await requireSessionUser();
    const { id } = await ctx.params;
    const row = await prisma.materialRequest.findUnique({
      where: { id },
      include: materialRequestInclude,
    });
    if (!row) return NextResponse.json({ error: "Solicitud no encontrada." }, { status: 404 });
    return NextResponse.json({ request: mapMaterialRequest(row) });
  } catch (e) {
    return apiErrorResponse(e);
  }
}

export async function PATCH(request: Request, ctx: Ctx) {
  try {
    const user = await requireSessionUser();
    const { id } = await ctx.params;
    const row = await prisma.materialRequest.findUnique({ where: { id } });
    if (!row) return NextResponse.json({ error: "Solicitud no encontrada." }, { status: 404 });

    const status = row.status as MaterialRequestStatus;
    const role = asRole(user.role);
    if (!canEditMaterialRequest(status, role, row.createdByUserId, user.id)) {
      return NextResponse.json({ error: "No puedes editar esta solicitud." }, { status: 403 });
    }

    const body = (await request.json()) as {
      obraId?: string;
      costCenter?: string;
      materials?: string;
      quantities?: string;
      justification?: string;
    };

    const updated = await prisma.materialRequest.update({
      where: { id },
      data: {
        obraId: body.obraId ?? row.obraId,
        costCenter: body.costCenter?.trim() ?? row.costCenter,
        materials: body.materials?.trim() ?? row.materials,
        quantities: body.quantities?.trim() ?? row.quantities,
        justification: body.justification?.trim() ?? row.justification,
      },
      include: materialRequestInclude,
    });

    return NextResponse.json({ request: mapMaterialRequest(updated) });
  } catch (e) {
    return apiErrorResponse(e);
  }
}
