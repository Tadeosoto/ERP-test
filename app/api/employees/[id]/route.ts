import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSessionUser } from "@/lib/auth/session-server";
import { apiErrorResponse } from "@/lib/api/handle-route-error";
import { asRole } from "@/lib/services/mappers";
import { canAccessViaticos } from "@/lib/viaticos/access";
import { mapEmployee } from "@/lib/viaticos/mappers";

type Ctx = { params: Promise<{ id: string }> };

function cleanName(value: unknown): string {
  return String(value ?? "").replace(/\s+/g, " ").trim().slice(0, 80);
}

export async function PATCH(request: Request, ctx: Ctx) {
  try {
    const user = await requireSessionUser();
    if (!canAccessViaticos(asRole(user.role))) {
      return NextResponse.json({ error: "No tienes acceso a empleados." }, { status: 403 });
    }
    const { id } = await ctx.params;
    const body = (await request.json()) as { firstName?: string; lastName?: string; active?: boolean };
    const existing = await prisma.employee.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "Empleado no encontrado." }, { status: 404 });

    const firstName = body.firstName === undefined ? existing.firstName : cleanName(body.firstName);
    const lastName = body.lastName === undefined ? existing.lastName : cleanName(body.lastName);
    if (!firstName || !lastName) {
      return NextResponse.json({ error: "Nombre y apellido son obligatorios." }, { status: 400 });
    }

    const employee = await prisma.employee.update({
      where: { id },
      data: {
        firstName,
        lastName,
        active: typeof body.active === "boolean" ? body.active : existing.active,
      },
    });
    return NextResponse.json({ employee: mapEmployee(employee) });
  } catch (e) {
    return apiErrorResponse(e);
  }
}
