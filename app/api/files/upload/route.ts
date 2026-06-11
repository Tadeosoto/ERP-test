import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  afterInvoiceUploaded,
  afterOcPdfReuploaded,
  canUploadInvoice,
  canUploadOcPdf,
  canUploadPaymentReceipt,
} from "@/lib/domain/transitions";
import { requireSessionUser } from "@/lib/auth/session-server";
import { saveOrderFile } from "@/lib/services/files";
import { NotificationEvents, notifyByRoles } from "@/lib/services/notifications";
import { asFileKind, asOrderStatus, asRole, mapOrder, orderInclude } from "@/lib/services/mappers";
import { apiErrorResponse } from "@/lib/api/handle-route-error";
import type { FileKind } from "@/lib/domain/types";

export async function POST(request: Request) {
  try {
    const user = await requireSessionUser();
    const form = await request.formData();
    const orderId = form.get("orderId") as string | null;
    const kindRaw = form.get("kind") as string | null;
    const file = form.get("file");

    if (!orderId || !kindRaw || !(file instanceof File)) {
      return NextResponse.json({ error: "orderId, kind y file son requeridos." }, { status: 400 });
    }

    const kind = asFileKind(kindRaw);
    const order = await prisma.purchaseOrder.findUnique({ where: { id: orderId } });
    if (!order) return NextResponse.json({ error: "Orden no encontrada." }, { status: 404 });
    const status = asOrderStatus(order.status);
    const role = asRole(user.role);

    if (kind === "oc_pdf") {
      if (!canUploadOcPdf(status, role)) {
        return NextResponse.json({ error: "No puedes subir PDF de OC ahora." }, { status: 403 });
      }
    } else if (kind === "comprobante_pago") {
      if (!canUploadPaymentReceipt(status, role)) {
        return NextResponse.json({ error: "No puedes subir comprobante de pago ahora." }, { status: 403 });
      }
    } else if (kind === "factura") {
      if (!canUploadInvoice(status, role)) {
        return NextResponse.json({ error: "No puedes subir la factura ahora." }, { status: 403 });
      }
    } else if (kind === "complemento_pago") {
      if (!canUploadInvoice(status, role)) {
        return NextResponse.json({ error: "No puedes subir complemento ahora." }, { status: 403 });
      }
    } else {
      return NextResponse.json({ error: "Tipo de archivo inválido." }, { status: 400 });
    }

    await saveOrderFile({
      orderId,
      kind: kind as FileKind,
      file,
      uploadedByUserId: user.id,
    });

    if (kind === "oc_pdf" && status === "engineerRejected") {
      await prisma.purchaseOrder.update({
        where: { id: orderId },
        data: { status: afterOcPdfReuploaded() },
      });
      const evt = NotificationEvents.ocPdfUpdated(order.title);
      await notifyByRoles(orderId, evt.type, evt.message, evt.roles);
    }

    if (kind === "factura" && (status === "paid" || status === "awaitingInvoice")) {
      await prisma.purchaseOrder.update({
        where: { id: orderId },
        data: { status: afterInvoiceUploaded() },
      });
      const evt = NotificationEvents.invoiceUploaded(order.title);
      await notifyByRoles(orderId, evt.type, evt.message, evt.roles);
    }

    const full = await prisma.purchaseOrder.findUnique({
      where: { id: orderId },
      include: orderInclude,
    });

    return NextResponse.json({ order: full ? mapOrder(full) : null });
  } catch (e) {
    return apiErrorResponse(e);
  }
}
