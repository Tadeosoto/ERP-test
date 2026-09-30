import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSessionUser } from "@/lib/auth/session-server";
import { apiErrorResponse } from "@/lib/api/handle-route-error";
import { asRole } from "@/lib/services/mappers";
import { canAccessCompanyCards, canEditCardDigits } from "@/lib/tarjetas/access";
import { mapCard } from "@/lib/tarjetas/mappers";
import { cardLabelWithDigits } from "@/lib/tarjetas/summary";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_request: Request, ctx: Ctx) {
  try {
    const user = await requireSessionUser();
    if (!canAccessCompanyCards({ role: asRole(user.role), email: user.email })) {
      return NextResponse.json({ error: "No tienes acceso a tarjetas empresariales." }, { status: 403 });
    }
    const { id } = await ctx.params;
    const card = await prisma.companyCard.findUnique({
      where: { id },
      include: { movements: { select: { kind: true, amount: true, status: true } } },
    });
    if (!card) return NextResponse.json({ error: "Tarjeta no encontrada." }, { status: 404 });
    return NextResponse.json({ card: mapCard(card) });
  } catch (e) {
    return apiErrorResponse(e);
  }
}

export async function PATCH(request: Request, ctx: Ctx) {
  try {
    const user = await requireSessionUser();
    const role = asRole(user.role);
    if (!canAccessCompanyCards({ role, email: user.email })) {
      return NextResponse.json({ error: "No tienes acceso a tarjetas empresariales." }, { status: 403 });
    }
    if (!canEditCardDigits({ role })) {
      return NextResponse.json({ error: "Solo Administración registra los últimos 4 dígitos." }, { status: 403 });
    }
    const { id } = await ctx.params;
    const body = (await request.json()) as { lastFour?: string };
    const lastFour = String(body.lastFour ?? "").trim();
    if (!/^\d{4}$/.test(lastFour)) {
      return NextResponse.json({ error: "Escribe exactamente 4 números." }, { status: 400 });
    }
    const existing = await prisma.companyCard.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "Tarjeta no encontrada." }, { status: 404 });
    const card = await prisma.companyCard.update({
      where: { id },
      data: { lastFour, label: cardLabelWithDigits(existing.label, lastFour) },
      include: { movements: { select: { kind: true, amount: true, status: true } } },
    });
    return NextResponse.json({ card: mapCard(card) });
  } catch (e) {
    return apiErrorResponse(e);
  }
}
