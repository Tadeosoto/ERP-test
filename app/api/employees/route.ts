import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSessionUser } from "@/lib/auth/session-server";
import { apiErrorResponse } from "@/lib/api/handle-route-error";
import { asRole } from "@/lib/services/mappers";
import { canAccessViaticos } from "@/lib/viaticos/access";
import { mapEmployee } from "@/lib/viaticos/mappers";

function cleanName(value: unknown): string {
  return String(value ?? "").replace(/\s+/g, " ").trim().slice(0, 80);
}

export async function GET() {
  try {
    const user = await requireSessionUser();
    if (!canAccessViaticos(asRole(user.role))) {
      return NextResponse.json({ error: "No tienes acceso a empleados." }, { status: 403 });
    }
    const employees = await prisma.employee.findMany({
      orderBy: [{ active: "desc" }, { lastName: "asc" }, { firstName: "asc" }],
    });
    return NextResponse.json({ employees: employees.map(mapEmployee) });
  } catch (e) {
    return apiErrorResponse(e);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireSessionUser();
    if (!canAccessViaticos(asRole(user.role))) {
      return NextResponse.json({ error: "No tienes acceso a empleados." }, { status: 403 });
    }
    const body = (await request.json()) as { firstName?: string; lastName?: string };
    const firstName = cleanName(body.firstName);
    const lastName = cleanName(body.lastName);
    if (!firstName || !lastName) {
      return NextResponse.json({ error: "Nombre y apellido son obligatorios." }, { status: 400 });
    }
    const employee = await prisma.employee.create({ data: { firstName, lastName } });
    return NextResponse.json({ employee: mapEmployee(employee) });
  } catch (e) {
    return apiErrorResponse(e);
  }
}
