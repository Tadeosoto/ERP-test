import { NextResponse } from "next/server";
import { requireSessionUser } from "@/lib/auth/session-server";
import {
  readDirectExpenseFileBuffer,
  readSolicitudAttachmentBuffer,
} from "@/lib/services/solicitud-files";
import { apiErrorResponse } from "@/lib/api/handle-route-error";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(request: Request, ctx: Ctx) {
  try {
    await requireSessionUser();
    const { id } = await ctx.params;
    const { searchParams } = new URL(request.url);
    const kind = searchParams.get("kind") ?? "attachment";

    const meta =
      kind === "expense"
        ? await readDirectExpenseFileBuffer(id)
        : await readSolicitudAttachmentBuffer(id);

    if (!meta) return NextResponse.json({ error: "Archivo no encontrado." }, { status: 404 });

    const download = searchParams.get("download") === "1";
    const disposition = download
      ? `attachment; filename="${meta.originalFileName}"`
      : `inline; filename="${meta.originalFileName}"`;

    return new NextResponse(new Uint8Array(meta.buffer), {
      headers: {
        "Content-Type": meta.mimeType,
        "Content-Disposition": disposition,
      },
    });
  } catch (e) {
    return apiErrorResponse(e);
  }
}
