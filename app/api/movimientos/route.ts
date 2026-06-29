import { NextResponse } from "next/server";
import { requireSessionUser } from "@/lib/auth/session-server";
import { apiErrorResponse } from "@/lib/api/handle-route-error";
import type { Role } from "@/lib/domain/types";
import { fetchPendingMovements, fetchRecentMovements } from "@/lib/services/activity-feed";
import { asRole } from "@/lib/services/mappers";

const ROLES: Role[] = ["compras", "pagos", "ingeniero", "recepcion", "contabilidad", "direccion"];

export async function GET(request: Request) {
  try {
    await requireSessionUser();
    const { searchParams } = new URL(request.url);
    const vista = searchParams.get("vista") === "pendientes" ? "pendientes" : "recientes";
    const q = searchParams.get("q") ?? undefined;
    const obraId = searchParams.get("obraId") ?? undefined;
    const orderId = searchParams.get("orderId") ?? undefined;
    const roleParam = searchParams.get("rol");
    const role = roleParam && ROLES.includes(roleParam as Role) ? asRole(roleParam) : undefined;
    const limit = searchParams.get("limit")
      ? Number.parseInt(searchParams.get("limit")!, 10)
      : undefined;

    const filters = { q, role, obraId, orderId, limit };

    if (vista === "pendientes") {
      const pending = await fetchPendingMovements(filters);
      return NextResponse.json({ pending });
    }

    const recent = await fetchRecentMovements(filters);
    return NextResponse.json({ recent });
  } catch (e) {
    return apiErrorResponse(e);
  }
}
