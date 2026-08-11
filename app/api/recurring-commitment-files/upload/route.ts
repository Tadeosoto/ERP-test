import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { canManageRecurringCommitments } from "@/lib/domain/transitions";
import { requireSessionUser } from "@/lib/auth/session-server";
import { asRole } from "@/lib/services/mappers";
import {
  mapRecurringCommitment,
  recurringCommitmentInclude,
} from "@/lib/services/recurring-commitment-mappers";
import { saveRecurringCommitmentFile } from "@/lib/services/recurring-commitment-files";
import { apiErrorResponse } from "@/lib/api/handle-route-error";

export async function POST(request: Request) {
  try {
    const user = await requireSessionUser();
    const role = asRole(user.role);
    if (!canManageRecurringCommitments(role)) {
      return NextResponse.json({ error: "No tienes permiso para subir archivos." }, { status: 403 });
    }

    const form = await request.formData();
    const commitmentId = form.get("commitmentId") as string | null;
    const kindRaw = form.get("kind") as string | null;
    const file = form.get("file");

    if (!commitmentId || !kindRaw || !(file instanceof File)) {
      return NextResponse.json({ error: "commitmentId, kind y file son requeridos." }, { status: 400 });
    }
    if (kindRaw !== "factura" && kindRaw !== "comprobante_pago") {
      return NextResponse.json(
        { error: "Tipo de archivo inválido (factura o comprobante_pago)." },
        { status: 400 }
      );
    }

    const existing = await prisma.recurringCommitment.findUnique({ where: { id: commitmentId } });
    if (!existing || !existing.active) {
      return NextResponse.json({ error: "Compromiso no encontrado." }, { status: 404 });
    }

    await saveRecurringCommitmentFile({
      commitmentId,
      kind: kindRaw,
      file,
      uploadedByUserId: user.id,
    });

    const row = await prisma.recurringCommitment.findUnique({
      where: { id: commitmentId },
      include: recurringCommitmentInclude,
    });

    return NextResponse.json({ commitment: row ? mapRecurringCommitment(row) : null });
  } catch (e) {
    return apiErrorResponse(e);
  }
}
