import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { canManageSuppliers, isAdministration } from "@/lib/domain/transitions";
import { requireSessionUser } from "@/lib/auth/session-server";
import { asRole, mapSupplier } from "@/lib/services/mappers";
import { apiErrorResponse } from "@/lib/api/handle-route-error";

type Ctx = { params: Promise<{ id: string }> };

type SupplierBody = {
  legalName?: string;
  rfc?: string;
  commercialName?: string;
  taxRegime?: string;
  phone?: string;
  email?: string;
  website?: string;
  street?: string;
  neighborhood?: string;
  zipCode?: string;
  city?: string;
  state?: string;
  country?: string;
  primaryContact?: string;
  notes?: string;
  active?: boolean;
};

export async function PATCH(request: Request, ctx: Ctx) {
  try {
    const user = await requireSessionUser();
    const role = asRole(user.role);
    if (!canManageSuppliers(role)) {
      return NextResponse.json({ error: "No tienes permiso para editar proveedores." }, { status: 403 });
    }

    const { id } = await ctx.params;
    const body = (await request.json()) as SupplierBody;

    const existing = await prisma.supplier.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Proveedor no encontrado." }, { status: 404 });
    }

    const data: Record<string, unknown> = {};
    if (body.legalName !== undefined) {
      const trimmed = body.legalName.trim();
      if (!trimmed) {
        return NextResponse.json({ error: "La razón social no puede estar vacía." }, { status: 400 });
      }
      data.legalName = trimmed;
    }
    if (body.rfc !== undefined) {
      const trimmed = body.rfc.trim();
      if (!trimmed) {
        return NextResponse.json({ error: "El RFC no puede estar vacío." }, { status: 400 });
      }
      data.rfc = trimmed.toUpperCase();
    }
    if (body.commercialName !== undefined) data.commercialName = body.commercialName.trim();
    if (body.taxRegime !== undefined) data.taxRegime = body.taxRegime.trim();
    if (body.phone !== undefined) data.phone = body.phone.trim();
    if (body.email !== undefined) data.email = body.email.trim();
    if (body.website !== undefined) data.website = body.website.trim();
    if (body.street !== undefined) data.street = body.street.trim();
    if (body.neighborhood !== undefined) data.neighborhood = body.neighborhood.trim();
    if (body.zipCode !== undefined) data.zipCode = body.zipCode.trim();
    if (body.city !== undefined) data.city = body.city.trim();
    if (body.state !== undefined) data.state = body.state.trim();
    if (body.country !== undefined) data.country = body.country.trim() || "México";
    if (body.primaryContact !== undefined) data.primaryContact = body.primaryContact.trim();
    if (body.notes !== undefined) data.notes = body.notes.trim();
    if (body.active !== undefined) data.active = Boolean(body.active);

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: "Nada que actualizar." }, { status: 400 });
    }

    const supplier = await prisma.supplier.update({ where: { id }, data });
    return NextResponse.json({ supplier: mapSupplier(supplier) });
  } catch (e) {
    return apiErrorResponse(e);
  }
}

export async function DELETE(_request: Request, ctx: Ctx) {
  try {
    const user = await requireSessionUser();
    const role = asRole(user.role);
    if (!canManageSuppliers(role)) {
      return NextResponse.json({ error: "No tienes permiso para eliminar proveedores." }, { status: 403 });
    }

    const { id } = await ctx.params;
    const existing = await prisma.supplier.findUnique({
      where: { id },
      include: { _count: { select: { orders: true } } },
    });
    if (!existing) {
      return NextResponse.json({ error: "Proveedor no encontrado." }, { status: 404 });
    }
    if (existing._count.orders > 0 && !isAdministration(role)) {
      return NextResponse.json(
        { error: "No se puede eliminar un proveedor con órdenes de compra asociadas." },
        { status: 409 }
      );
    }

    await prisma.$transaction(async (tx) => {
      if (existing._count.orders > 0) {
        await tx.purchaseOrder.updateMany({
          where: { supplierId: id },
          data: { supplierId: null },
        });
      }
      await tx.supplier.delete({ where: { id } });
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return apiErrorResponse(e);
  }
}
