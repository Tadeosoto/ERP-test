import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSessionUser } from "@/lib/auth/session-server";
import {
  canDeleteInvoiceFirstCommitment,
  canEditInvoiceFirstCommitment,
  type InvoiceFirstStatus,
} from "@/lib/domain/proceso-c";
import { asRole } from "@/lib/services/mappers";
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

export async function PATCH(request: Request, ctx: Ctx) {
  try {
    const user = await requireSessionUser();
    const role = asRole(user.role);
    if (!canEditInvoiceFirstCommitment(role)) {
      return NextResponse.json(
        { error: "Solo Dirección o Administración pueden editar esta factura." },
        { status: 403 }
      );
    }

    const { id } = await ctx.params;
    const row = await prisma.invoiceFirstCommitment.findUnique({
      where: { id },
      include: { purchaseOrder: true },
    });
    if (!row) {
      return NextResponse.json({ error: "Compromiso no encontrado." }, { status: 404 });
    }

    const body = (await request.json()) as {
      invoiceFolio?: string;
      supplierId?: string | null;
      supplierName?: string;
      obraId?: string | null;
      totalAmount?: number;
      currency?: string;
      invoiceDate?: string;
      comment?: string;
    };

    const data: Record<string, unknown> = {};

    if (body.invoiceFolio !== undefined) {
      const folio = body.invoiceFolio.trim();
      if (!folio) {
        return NextResponse.json({ error: "El folio de factura es requerido." }, { status: 400 });
      }
      const dup = await prisma.invoiceFirstCommitment.findFirst({
        where: { invoiceFolio: folio, NOT: { id } },
      });
      if (dup) {
        return NextResponse.json({ error: "Ya existe una factura con ese número." }, { status: 400 });
      }
      data.invoiceFolio = folio;
    }

    if (body.supplierId !== undefined || body.supplierName !== undefined) {
      if (body.supplierId) {
        const supplier = await prisma.supplier.findUnique({ where: { id: body.supplierId } });
        if (!supplier) {
          return NextResponse.json({ error: "Proveedor no encontrado." }, { status: 400 });
        }
        data.supplierId = supplier.id;
        data.supplierName = supplier.commercialName || supplier.legalName;
      } else {
        const name = body.supplierName?.trim() ?? "";
        if (!name) {
          return NextResponse.json({ error: "El proveedor es requerido." }, { status: 400 });
        }
        data.supplierId = null;
        data.supplierName = name;
      }
    }

    if (body.obraId !== undefined) {
      if (body.obraId) {
        const obra = await prisma.obra.findUnique({ where: { id: body.obraId } });
        if (!obra) {
          return NextResponse.json({ error: "Obra no encontrada." }, { status: 400 });
        }
        data.obraId = body.obraId;
      } else {
        data.obraId = null;
      }
    }

    if (body.totalAmount !== undefined) {
      const totalAmount = Number(body.totalAmount);
      if (!(totalAmount > 0)) {
        return NextResponse.json({ error: "El monto total debe ser mayor a cero." }, { status: 400 });
      }
      if (row.purchaseOrder && row.purchaseOrder.amountPaidSoFar > totalAmount + 0.01) {
        return NextResponse.json(
          { error: "El monto no puede ser menor a lo ya pagado en la OC." },
          { status: 400 }
        );
      }
      data.totalAmount = totalAmount;
    }

    if (body.currency !== undefined) {
      data.currency = body.currency.trim() || "MXN";
    }

    if (body.invoiceDate !== undefined) {
      if (!body.invoiceDate.trim()) {
        return NextResponse.json({ error: "La fecha de factura es requerida." }, { status: 400 });
      }
      data.invoiceDate = new Date(body.invoiceDate);
    }

    if (body.comment !== undefined) {
      data.comment = body.comment.trim();
    }

    const updated = await prisma.invoiceFirstCommitment.update({
      where: { id },
      data,
      include: invoiceFirstInclude,
    });

    return NextResponse.json({ commitment: mapInvoiceFirstCommitment(updated) });
  } catch (e) {
    return apiErrorResponse(e);
  }
}

export async function DELETE(_request: Request, ctx: Ctx) {
  try {
    const user = await requireSessionUser();
    const role = asRole(user.role);
    const { id } = await ctx.params;

    const row = await prisma.invoiceFirstCommitment.findUnique({
      where: { id },
      include: { purchaseOrder: true },
    });
    if (!row) {
      return NextResponse.json({ error: "Compromiso no encontrado." }, { status: 404 });
    }

    const status = row.status as InvoiceFirstStatus;
    const hasPo = Boolean(row.purchaseOrder);
    const amountPaid = row.purchaseOrder?.amountPaidSoFar ?? 0;
    if (!canDeleteInvoiceFirstCommitment(role, status, hasPo, amountPaid)) {
      return NextResponse.json(
        {
          error:
            amountPaid > 0.01
              ? "No se puede borrar: ya hay pagos registrados en la OC vinculada."
              : "No tienes permiso para borrar esta factura.",
        },
        { status: 403 }
      );
    }

    await prisma.$transaction(async (tx) => {
      if (row.purchaseOrder) {
        await tx.purchaseOrder.delete({ where: { id: row.purchaseOrder.id } });
      }
      await tx.invoiceFirstCommitment.delete({ where: { id } });
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return apiErrorResponse(e);
  }
}
