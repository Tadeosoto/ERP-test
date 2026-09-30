import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSessionUser } from "@/lib/auth/session-server";
import { apiErrorResponse } from "@/lib/api/handle-route-error";
import { asRole } from "@/lib/services/mappers";
import { canAccessViaticos } from "@/lib/viaticos/access";
import { mapViaticoDetail, viaticoDetailInclude } from "@/lib/viaticos/mappers";
import { removeViaticoExpenseDiskFiles } from "@/lib/services/viatico-files";

type Ctx = { params: Promise<{ id: string; expenseId: string }> };

export async function DELETE(_request: Request, ctx: Ctx) {
  try {
    const user = await requireSessionUser();
    if (!canAccessViaticos(asRole(user.role))) {
      return NextResponse.json({ error: "No tienes acceso a viáticos." }, { status: 403 });
    }
    const { id, expenseId } = await ctx.params;
    const expense = await prisma.viaticoExpense.findFirst({ where: { id: expenseId, viaticoId: id } });
    if (!expense) return NextResponse.json({ error: "Gasto no encontrado." }, { status: 404 });
    await removeViaticoExpenseDiskFiles(expenseId);
    await prisma.viaticoExpense.delete({ where: { id: expenseId } });
    const row = await prisma.viatico.findUnique({ where: { id }, include: viaticoDetailInclude });
    return NextResponse.json({ viatico: row ? mapViaticoDetail(row) : null });
  } catch (e) {
    return apiErrorResponse(e);
  }
}
