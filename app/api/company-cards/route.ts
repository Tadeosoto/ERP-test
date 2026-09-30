import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSessionUser } from "@/lib/auth/session-server";
import { apiErrorResponse } from "@/lib/api/handle-route-error";
import { asRole } from "@/lib/services/mappers";
import { canAccessCompanyCards } from "@/lib/tarjetas/access";
import { mapCard } from "@/lib/tarjetas/mappers";

export async function GET() {
  try {
    const user = await requireSessionUser();
    if (!canAccessCompanyCards({ role: asRole(user.role), email: user.email })) {
      return NextResponse.json({ error: "No tienes acceso a tarjetas empresariales." }, { status: 403 });
    }
    const cards = await prisma.companyCard.findMany({
      orderBy: [{ bank: "asc" }, { slot: "asc" }],
      include: { movements: { select: { kind: true, amount: true, status: true } } },
    });
    return NextResponse.json({ cards: cards.map(mapCard) });
  } catch (e) {
    return apiErrorResponse(e);
  }
}
