import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  canSendMaterialRequest,
  type MaterialRequestStatus,
} from "@/lib/domain/solicitudes";
import { requireSessionUser } from "@/lib/auth/session-server";
import { asRole } from "@/lib/services/mappers";
import { notifyByRoles } from "@/lib/services/notifications";
import {
  mapMaterialRequest,
  materialRequestInclude,
} from "@/lib/services/solicitud-mappers";
import { apiErrorResponse } from "@/lib/api/handle-route-error";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(request: Request, ctx: Ctx) {
  try {
    const user = await requireSessionUser();
    const { id } = await ctx.params;
    const row = await prisma.materialRequest.findUnique({
      where: { id },
      include: { obra: true },
    });
    if (!row) return NextResponse.json({ error: "Solicitud no encontrada." }, { status: 404 });

    const status = row.status as MaterialRequestStatus;
    const role = asRole(user.role);
    const body = (await request.json()) as { action?: string };

    if (body.action === "send") {
      if (!canSendMaterialRequest(status, role, row.createdByUserId, user.id)) {
        return NextResponse.json({ error: "No puedes enviar esta solicitud." }, { status: 403 });
      }
      if (!row.materials.trim()) {
        return NextResponse.json({ error: "Indica los materiales antes de enviar." }, { status: 400 });
      }

      const updated = await prisma.materialRequest.update({
        where: { id },
        data: { status: "sent", sentAt: new Date() },
        include: materialRequestInclude,
      });

      await notifyByRoles(
        "",
        "material_request_sent",
        `Ingeniería envió solicitud de material para «${row.obra.name}». Compras: cotiza y crea la OC.`,
        ["compras"]
      );

      return NextResponse.json({ request: mapMaterialRequest(updated) });
    }

    return NextResponse.json({ error: "Acción no reconocida." }, { status: 400 });
  } catch (e) {
    return apiErrorResponse(e);
  }
}
