import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSessionUser } from "@/lib/auth/session-server";
import type { InvoiceFirstStatus } from "@/lib/domain/proceso-c";
import { canRequestOcForInvoiceFirst } from "@/lib/domain/proceso-c";
import { asRole } from "@/lib/services/mappers";
import {
  invoiceFirstInclude,
  mapInvoiceFirstCommitment,
} from "@/lib/services/invoice-first-mappers";
import { NotificationEvents, notifyInvoiceFirstByRoles } from "@/lib/services/notifications";
import { apiErrorResponse } from "@/lib/api/handle-route-error";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(request: Request, ctx: Ctx) {
  try {
    const user = await requireSessionUser();
    const role = asRole(user.role);
    const { id } = await ctx.params;
    const body = (await request.json()) as { action?: string };

    const row = await prisma.invoiceFirstCommitment.findUnique({
      where: { id },
      include: invoiceFirstInclude,
    });
    if (!row) {
      return NextResponse.json({ error: "Compromiso no encontrado." }, { status: 404 });
    }

    const status = row.status as InvoiceFirstStatus;

    if (body.action === "request_oc") {
      if (!canRequestOcForInvoiceFirst(status, role)) {
        return NextResponse.json({ error: "No puedes solicitar OC en este estado." }, { status: 403 });
      }
      const updated = await prisma.invoiceFirstCommitment.update({
        where: { id },
        data: { status: "oc_requested", ocRequestedAt: new Date() },
        include: invoiceFirstInclude,
      });
      const evt = NotificationEvents.invoiceFirstOcRequested(row.invoiceFolio);
      await notifyInvoiceFirstByRoles(id, evt.type, evt.message, evt.roles);
      return NextResponse.json({ commitment: mapInvoiceFirstCommitment(updated) });
    }

    return NextResponse.json({ error: "Acción no reconocida." }, { status: 400 });
  } catch (e) {
    return apiErrorResponse(e);
  }
}
