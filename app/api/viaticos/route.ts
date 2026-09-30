import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSessionUser } from "@/lib/auth/session-server";
import { apiErrorResponse } from "@/lib/api/handle-route-error";
import { asRole } from "@/lib/services/mappers";
import { canAccessViaticos } from "@/lib/viaticos/access";
import { mapViaticoDetail, mapViaticoListItem, viaticoDetailInclude, viaticoListInclude } from "@/lib/viaticos/mappers";
import { parsePositiveMoney } from "@/lib/viaticos/summary";

export async function GET() {
  try {
    const user = await requireSessionUser();
    if (!canAccessViaticos(asRole(user.role))) {
      return NextResponse.json({ error: "No tienes acceso a viáticos." }, { status: 403 });
    }
    const rows = await prisma.viatico.findMany({
      include: viaticoListInclude,
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ viaticos: rows.map(mapViaticoListItem) });
  } catch (e) {
    return apiErrorResponse(e);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireSessionUser();
    if (!canAccessViaticos(asRole(user.role))) {
      return NextResponse.json({ error: "No tienes acceso a viáticos." }, { status: 403 });
    }
    const body = (await request.json()) as { employeeId?: string; obraId?: string; deliveredAmount?: unknown };
    const deliveredAmount = parsePositiveMoney(body.deliveredAmount);
    if (!body.employeeId || !body.obraId || deliveredAmount == null) {
      return NextResponse.json(
        { error: "Elige empleado, obra y un monto entregado mayor a cero." },
        { status: 400 }
      );
    }

    const [employee, obra] = await Promise.all([
      prisma.employee.findUnique({ where: { id: body.employeeId } }),
      prisma.obra.findUnique({ where: { id: body.obraId } }),
    ]);
    if (!employee || !employee.active) {
      return NextResponse.json({ error: "El empleado no está activo." }, { status: 400 });
    }
    if (!obra || !obra.active) {
      return NextResponse.json({ error: "La obra no está activa." }, { status: 400 });
    }

    const created = await prisma.viatico.create({
      data: {
        employeeId: employee.id,
        obraId: obra.id,
        deliveredAmount,
        createdByUserId: user.id,
      },
      include: viaticoDetailInclude,
    });
    return NextResponse.json({ viatico: mapViaticoDetail(created) });
  } catch (e) {
    return apiErrorResponse(e);
  }
}
