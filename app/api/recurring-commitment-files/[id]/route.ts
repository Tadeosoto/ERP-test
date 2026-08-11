import { NextResponse } from "next/server";
import {
  canConsultPaymentDocuments,
  canManageRecurringCommitments,
} from "@/lib/domain/transitions";
import { requireSessionUser } from "@/lib/auth/session-server";
import { asRole } from "@/lib/services/mappers";
import {
  deleteRecurringCommitmentFile,
  readRecurringCommitmentFile,
} from "@/lib/services/recurring-commitment-files";
import { apiErrorResponse } from "@/lib/api/handle-route-error";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(request: Request, ctx: Ctx) {
  try {
    const user = await requireSessionUser();
    const role = asRole(user.role);
    if (!canConsultPaymentDocuments(role)) {
      return NextResponse.json(
        { error: "Solo Contabilidad, Recepción y Administración pueden consultar estos documentos." },
        { status: 403 }
      );
    }

    const { id } = await ctx.params;
    const { searchParams } = new URL(request.url);
    const download = searchParams.get("download") === "1";

    const data = await readRecurringCommitmentFile(id);
    if (!data) return NextResponse.json({ error: "Archivo no encontrado." }, { status: 404 });

    const disposition = download ? "attachment" : "inline";
    return new NextResponse(new Uint8Array(data.buffer), {
      headers: {
        "Content-Type": data.mimeType,
        "Content-Disposition": `${disposition}; filename="${encodeURIComponent(data.originalFileName)}"`,
        "Cache-Control": "private, no-cache",
      },
    });
  } catch (e) {
    return apiErrorResponse(e);
  }
}

export async function DELETE(_request: Request, ctx: Ctx) {
  try {
    const user = await requireSessionUser();
    const role = asRole(user.role);
    if (!canManageRecurringCommitments(role)) {
      return NextResponse.json({ error: "No tienes permiso para eliminar archivos." }, { status: 403 });
    }

    const { id } = await ctx.params;
    const deleted = await deleteRecurringCommitmentFile(id);
    if (!deleted) {
      return NextResponse.json({ error: "Archivo no encontrado." }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    return apiErrorResponse(e);
  }
}
