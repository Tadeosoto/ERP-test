import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSessionUser } from "@/lib/auth/session-server";
import { canCreateInvoiceFirstCommitment } from "@/lib/domain/proceso-c";
import { asRole } from "@/lib/services/mappers";
import {
  invoiceFirstInclude,
  mapInvoiceFirstCommitment,
} from "@/lib/services/invoice-first-mappers";
import { nextInvoiceFolio } from "@/lib/services/invoice-first-folio";
import { NotificationEvents, notifyInvoiceFirstByRoles } from "@/lib/services/notifications";
import { apiErrorResponse } from "@/lib/api/handle-route-error";

export async function GET(request: Request) {
  try {
    const user = await requireSessionUser();
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");

    const includeAll = searchParams.get("includeAll") === "1";
    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (!status && !includeAll) {
      if (user.role === "pagos") {
        // Administración: colas propias + cola de Compras (OC por generar).
        where.status = { in: ["awaiting_oc", "oc_requested", "in_payment", "completed"] };
      } else if (user.role === "compras") {
        where.status = { in: ["oc_requested", "in_payment", "completed"] };
      }
    }

    const rows = await prisma.invoiceFirstCommitment.findMany({
      where,
      include: invoiceFirstInclude,
      orderBy: { updatedAt: "desc" },
    });
    return NextResponse.json({ commitments: rows.map(mapInvoiceFirstCommitment) });
  } catch (e) {
    return apiErrorResponse(e);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireSessionUser();
    const role = asRole(user.role);
    if (!canCreateInvoiceFirstCommitment(role)) {
      return NextResponse.json({ error: "Solo Dirección puede registrar facturas (Proceso C)." }, { status: 403 });
    }

    const body = (await request.json()) as {
      supplierId?: string | null;
      supplierName?: string;
      obraId?: string | null;
      invoiceFolio?: string;
      totalAmount?: number;
      currency?: string;
      invoiceDate?: string;
      comment?: string;
      expedienteId?: string | null;
    };

    if (!body.supplierId && !body.supplierName?.trim()) {
      return NextResponse.json({ error: "El proveedor es requerido." }, { status: 400 });
    }
    if (!body.invoiceDate?.trim()) {
      return NextResponse.json({ error: "La fecha de factura es requerida." }, { status: 400 });
    }
    const totalAmount = Number(body.totalAmount ?? 0);
    if (!(totalAmount > 0)) {
      return NextResponse.json({ error: "El monto total debe ser mayor a cero." }, { status: 400 });
    }

    const folioInput = body.invoiceFolio?.trim() ?? "";
    let invoiceFolio = folioInput || (await nextInvoiceFolio());
    if (folioInput) {
      const dup = await prisma.invoiceFirstCommitment.findFirst({
        where: { invoiceFolio: folioInput },
      });
      if (dup) {
        return NextResponse.json({ error: "Ya existe una factura con ese número." }, { status: 400 });
      }
    }

    let supplierName = body.supplierName?.trim() ?? "";
    if (body.supplierId) {
      const supplier = await prisma.supplier.findUnique({ where: { id: body.supplierId } });
      if (!supplier) {
        return NextResponse.json({ error: "Proveedor no encontrado." }, { status: 400 });
      }
      supplierName = supplier.commercialName || supplier.legalName;
    }

    if (body.obraId) {
      const obra = await prisma.obra.findUnique({ where: { id: body.obraId } });
      if (!obra) {
        return NextResponse.json({ error: "Obra no encontrada." }, { status: 400 });
      }
    }

    const row = await prisma.invoiceFirstCommitment.create({
      data: {
        invoiceFolio,
        supplierId: body.supplierId ?? null,
        supplierName,
        obraId: body.obraId ?? null,
        totalAmount,
        currency: body.currency?.trim() || "MXN",
        invoiceDate: new Date(body.invoiceDate),
        comment: body.comment?.trim() ?? "",
        status: "awaiting_oc",
        expedienteId: body.expedienteId || null,
        createdByUserId: user.id,
      },
      include: invoiceFirstInclude,
    });

    const evt = NotificationEvents.invoiceFirstRegistered(invoiceFolio, supplierName);
    await notifyInvoiceFirstByRoles(row.id, evt.type, evt.message, evt.roles);

    return NextResponse.json({ commitment: mapInvoiceFirstCommitment(row) });
  } catch (e) {
    return apiErrorResponse(e);
  }
}
