import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { canManageSuppliers } from "@/lib/domain/transitions";
import { requireSessionUser } from "@/lib/auth/session-server";
import { asRole, mapSupplier } from "@/lib/services/mappers";
import { apiErrorResponse } from "@/lib/api/handle-route-error";

export async function GET() {
  try {
    await requireSessionUser();
    const suppliers = await prisma.supplier.findMany({ orderBy: { legalName: "asc" } });
    return NextResponse.json({ suppliers: suppliers.map(mapSupplier) });
  } catch (e) {
    return apiErrorResponse(e);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireSessionUser();
    const role = asRole(user.role);
    if (!canManageSuppliers(role)) {
      return NextResponse.json({ error: "No tienes permiso para registrar proveedores." }, { status: 403 });
    }

    const body = (await request.json()) as {
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
    };

    if (!body.legalName?.trim() || !body.rfc?.trim()) {
      return NextResponse.json({ error: "Nombre o razón social y RFC son requeridos." }, { status: 400 });
    }

    const supplier = await prisma.supplier.create({
      data: {
        legalName: body.legalName.trim(),
        rfc: body.rfc.trim().toUpperCase(),
        commercialName: body.commercialName?.trim() ?? "",
        taxRegime: body.taxRegime?.trim() ?? "",
        phone: body.phone?.trim() ?? "",
        email: body.email?.trim() ?? "",
        website: body.website?.trim() ?? "",
        street: body.street?.trim() ?? "",
        neighborhood: body.neighborhood?.trim() ?? "",
        zipCode: body.zipCode?.trim() ?? "",
        city: body.city?.trim() ?? "",
        state: body.state?.trim() ?? "",
        country: body.country?.trim() || "México",
        primaryContact: body.primaryContact?.trim() ?? "",
        notes: body.notes?.trim() ?? "",
      },
    });

    return NextResponse.json({ supplier: mapSupplier(supplier) });
  } catch (e) {
    return apiErrorResponse(e);
  }
}
