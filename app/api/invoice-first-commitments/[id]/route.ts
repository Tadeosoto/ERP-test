import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSessionUser } from "@/lib/auth/session-server";
import {
  invoiceFirstInclude,
  mapInvoiceFirstCommitment,
} from "@/lib/services/invoice-first-mappers";
import { apiErrorResponse } from "@/lib/api/handle-route-error";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_request: Request, ctx: Ctx) {
  try {
    await requireSessionUser();
    const { id } = await ctx.params;
    const row = await prisma.invoiceFirstCommitment.findUnique({
      where: { id },
      include: invoiceFirstInclude,
    });
    if (!row) {
      return NextResponse.json({ error: "Compromiso no encontrado." }, { status: 404 });
    }
    return NextResponse.json({ commitment: mapInvoiceFirstCommitment(row) });
  } catch (e) {
    return apiErrorResponse(e);
  }
}
