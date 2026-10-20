import { NextResponse } from "next/server";
import { requireSessionUser } from "@/lib/auth/session-server";
import { asRole } from "@/lib/services/mappers";
import { apiErrorResponse } from "@/lib/api/handle-route-error";
import { buildFridayReview } from "@/lib/pagos/friday-review-service";

export async function GET(request: Request) {
  try {
    const user = await requireSessionUser();
    const role = asRole(user.role);
    if (role !== "pagos" && role !== "direccion") {
      return NextResponse.json({ error: "No tienes acceso a esta vista." }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const week = searchParams.get("week");
    const payload = await buildFridayReview(week);
    return NextResponse.json(payload);
  } catch (e) {
    return apiErrorResponse(e);
  }
}
