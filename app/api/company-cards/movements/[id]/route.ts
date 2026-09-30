import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSessionUser } from "@/lib/auth/session-server";
import { apiErrorResponse } from "@/lib/api/handle-route-error";
import { asRole } from "@/lib/services/mappers";
import { canAccessCompanyCards } from "@/lib/tarjetas/access";
import { mapMovement, movementInclude } from "@/lib/tarjetas/mappers";
import { parseMovementForm } from "@/lib/tarjetas/parse-movement";
import { asCardKind } from "@/lib/tarjetas/summary";
import { clearCompanyCardFiles, saveCompanyCardFiles } from "@/lib/services/company-card-files";

type Ctx = { params: Promise<{ id: string }> };

function uploadsOf(form: FormData): File[] {
  return form.getAll("files").filter((item): item is File => item instanceof File && item.size > 0);
}

async function assertLinks(data: {
  obraId: string | null;
  responsibleUserId: string | null;
  responsibleEmployeeId: string | null;
}): Promise<string | null> {
  if (data.obraId) {
    const obra = await prisma.obra.findUnique({ where: { id: data.obraId }, select: { id: true } });
    if (!obra) return "La obra no existe.";
  }
  if (data.responsibleUserId) {
    const responsible = await prisma.user.findUnique({ where: { id: data.responsibleUserId }, select: { id: true } });
    if (!responsible) return "El responsable no existe.";
  }
  if (data.responsibleEmployeeId) {
    const employee = await prisma.employee.findUnique({
      where: { id: data.responsibleEmployeeId },
      select: { active: true },
    });
    if (!employee) return "El empleado no existe.";
  }
  return null;
}

export async function GET(_request: Request, ctx: Ctx) {
  try {
    const user = await requireSessionUser();
    if (!canAccessCompanyCards({ role: asRole(user.role), email: user.email })) {
      return NextResponse.json({ error: "No tienes acceso a tarjetas empresariales." }, { status: 403 });
    }
    const { id } = await ctx.params;
    const row = await prisma.companyCardMovement.findUnique({ where: { id }, include: movementInclude });
    if (!row) return NextResponse.json({ error: "Movimiento no encontrado." }, { status: 404 });
    return NextResponse.json({ movement: mapMovement(row) });
  } catch (e) {
    return apiErrorResponse(e);
  }
}

export async function PATCH(request: Request, ctx: Ctx) {
  try {
    const user = await requireSessionUser();
    if (!canAccessCompanyCards({ role: asRole(user.role), email: user.email })) {
      return NextResponse.json({ error: "No tienes acceso a tarjetas empresariales." }, { status: 403 });
    }
    const { id } = await ctx.params;
    const existing = await prisma.companyCardMovement.findUnique({
      where: { id },
      include: { files: { select: { id: true } }, card: { select: { id: true } } },
    });
    if (!existing) return NextResponse.json({ error: "Movimiento no encontrado." }, { status: 404 });

    const form = await request.formData();
    const cardId = String(form.get("cardId") ?? existing.card.id).trim();
    const card = await prisma.companyCard.findUnique({ where: { id: cardId } });
    if (!card) return NextResponse.json({ error: "Elige la tarjeta." }, { status: 400 });
    const cardKind = asCardKind(card.kind);
    if (!cardKind) return NextResponse.json({ error: "Tarjeta inválida." }, { status: 400 });

    const parsed = parseMovementForm(form, cardKind);
    if ("error" in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });
    const linkError = await assertLinks(parsed.data);
    if (linkError) return NextResponse.json({ error: linkError }, { status: 400 });

    const files = uploadsOf(form);
    const needsFile = parsed.data.receiptKind === "factura" || parsed.data.receiptKind === "ticket";
    if (needsFile && files.length === 0 && existing.files.length === 0) {
      return NextResponse.json({ error: "Adjunta el comprobante de este movimiento." }, { status: 400 });
    }
    if (needsFile && files.length === 0 && existing.receiptKind !== parsed.data.receiptKind) {
      return NextResponse.json({ error: "Al cambiar el tipo de comprobante hay que adjuntar los archivos nuevos." }, { status: 400 });
    }

    await prisma.companyCardMovement.update({ where: { id }, data: { cardId: card.id, ...parsed.data } });

    if (!needsFile) {
      await clearCompanyCardFiles(id);
    } else if (files.length > 0) {
      await clearCompanyCardFiles(id);
      try {
        await saveCompanyCardFiles({
          movementId: id,
          receiptKind: parsed.data.receiptKind as "factura" | "ticket",
          files,
          uploadedByUserId: user.id,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : "No se pudo guardar el comprobante.";
        return NextResponse.json({ error: message }, { status: 400 });
      }
    }

    const row = await prisma.companyCardMovement.findUnique({ where: { id }, include: movementInclude });
    return NextResponse.json({ movement: row ? mapMovement(row) : null });
  } catch (e) {
    return apiErrorResponse(e);
  }
}

export async function DELETE(_request: Request, ctx: Ctx) {
  try {
    const user = await requireSessionUser();
    if (!canAccessCompanyCards({ role: asRole(user.role), email: user.email })) {
      return NextResponse.json({ error: "No tienes acceso a tarjetas empresariales." }, { status: 403 });
    }
    const { id } = await ctx.params;
    const existing = await prisma.companyCardMovement.findUnique({ where: { id }, select: { id: true } });
    if (!existing) return NextResponse.json({ error: "Movimiento no encontrado." }, { status: 404 });
    await clearCompanyCardFiles(id);
    await prisma.companyCardMovement.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return apiErrorResponse(e);
  }
}
