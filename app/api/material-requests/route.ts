import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { canCreateMaterialRequest } from "@/lib/domain/solicitudes";
import { requireSessionUser } from "@/lib/auth/session-server";
import { asRole } from "@/lib/services/mappers";
import { canActAsCompras } from "@/lib/domain/transitions";
import {
  mapMaterialRequest,
  materialRequestInclude,
} from "@/lib/services/solicitud-mappers";
import { apiErrorResponse } from "@/lib/api/handle-route-error";

export async function GET(request: Request) {
  try {
    const user = await requireSessionUser();
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const mine = searchParams.get("mine") === "1";
    const all = searchParams.get("all") === "1";

    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (mine && user.role === "ingeniero") where.createdByUserId = user.id;
    if (canActAsCompras(asRole(user.role))) {
      if (all) {
        where.status = { not: "draft" };
      } else if (!status) {
        where.status = { in: ["sent", "in_oc_process"] };
      }
    }

    const rows = await prisma.materialRequest.findMany({
      where,
      include: materialRequestInclude,
      orderBy: { updatedAt: "desc" },
    });
    return NextResponse.json({ requests: rows.map(mapMaterialRequest) });
  } catch (e) {
    return apiErrorResponse(e);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireSessionUser();
    const role = asRole(user.role);
    if (!canCreateMaterialRequest(role)) {
      return NextResponse.json({ error: "Solo Ingeniería puede crear solicitudes de material." }, { status: 403 });
    }

    const body = (await request.json()) as {
      obraId?: string;
      costCenter?: string;
      materials?: string;
      quantities?: string;
      justification?: string;
    };

    if (!body.obraId?.trim()) {
      return NextResponse.json({ error: "La obra es requerida." }, { status: 400 });
    }
    if (!body.materials?.trim()) {
      return NextResponse.json({ error: "Indica los materiales solicitados." }, { status: 400 });
    }

    const row = await prisma.materialRequest.create({
      data: {
        obraId: body.obraId,
        costCenter: body.costCenter?.trim() ?? "",
        materials: body.materials.trim(),
        quantities: body.quantities?.trim() ?? "",
        justification: body.justification?.trim() ?? "",
        status: "draft",
        createdByUserId: user.id,
      },
      include: materialRequestInclude,
    });

    return NextResponse.json({ request: mapMaterialRequest(row) });
  } catch (e) {
    return apiErrorResponse(e);
  }
}
