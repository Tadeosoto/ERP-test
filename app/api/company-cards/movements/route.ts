import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSessionUser } from "@/lib/auth/session-server";
import { apiErrorResponse } from "@/lib/api/handle-route-error";
import { asRole } from "@/lib/services/mappers";
import { canAccessCompanyCards } from "@/lib/tarjetas/access";
import { mapMovement, movementInclude } from "@/lib/tarjetas/mappers";
import { parseMovementForm } from "@/lib/tarjetas/parse-movement";
import { asCardKind } from "@/lib/tarjetas/summary";
import { saveCompanyCardFiles } from "@/lib/services/company-card-files";

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
      select: { id: true },
    });
    if (!employee) return "El empleado no existe.";
  }
  return null;
}

export async function GET(request: Request) {
  try {
    const user = await requireSessionUser();
    if (!canAccessCompanyCards({ role: asRole(user.role), email: user.email })) {
      return NextResponse.json({ error: "No tienes acceso a tarjetas empresariales." }, { status: 403 });
    }
    const cardId = new URL(request.url).searchParams.get("cardId");
    const rows = await prisma.companyCardMovement.findMany({
      where: cardId ? { cardId } : undefined,
      include: movementInclude,
      orderBy: [{ occurredOn: "desc" }, { createdAt: "desc" }],
    });
    return NextResponse.json({ movements: rows.map(mapMovement) });
  } catch (e) {
    return apiErrorResponse(e);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireSessionUser();
    if (!canAccessCompanyCards({ role: asRole(user.role), email: user.email })) {
      return NextResponse.json({ error: "No tienes acceso a tarjetas empresariales." }, { status: 403 });
    }
    const form = await request.formData();
    const cardId = String(form.get("cardId") ?? "").trim();
    const card = cardId ? await prisma.companyCard.findUnique({ where: { id: cardId } }) : null;
    if (!card) return NextResponse.json({ error: "Elige la tarjeta." }, { status: 400 });
    const cardKind = asCardKind(card.kind);
    if (!cardKind) return NextResponse.json({ error: "Tarjeta inválida." }, { status: 400 });

    const parsed = parseMovementForm(form, cardKind);
    if ("error" in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });
    const linkError = await assertLinks(parsed.data);
    if (linkError) return NextResponse.json({ error: linkError }, { status: 400 });

    const files = uploadsOf(form);
    if ((parsed.data.receiptKind === "factura" || parsed.data.receiptKind === "ticket") && files.length === 0) {
      return NextResponse.json({ error: "Adjunta el comprobante de este movimiento." }, { status: 400 });
    }

    const created = await prisma.companyCardMovement.create({
      data: { cardId: card.id, createdByUserId: user.id, ...parsed.data },
    });

    if (parsed.data.receiptKind === "factura" || parsed.data.receiptKind === "ticket") {
      try {
        await saveCompanyCardFiles({
          movementId: created.id,
          receiptKind: parsed.data.receiptKind,
          files,
          uploadedByUserId: user.id,
        });
      } catch (error) {
        await prisma.companyCardMovement.delete({ where: { id: created.id } });
        const message = error instanceof Error ? error.message : "No se pudo guardar el comprobante.";
        return NextResponse.json({ error: message }, { status: 400 });
      }
    }

    const row = await prisma.companyCardMovement.findUnique({ where: { id: created.id }, include: movementInclude });
    return NextResponse.json({ movement: row ? mapMovement(row) : null });
  } catch (e) {
    return apiErrorResponse(e);
  }
}
