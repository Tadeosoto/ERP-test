import { NextResponse } from "next/server";
import { requireSessionUser } from "@/lib/auth/session-server";
import { readInvoiceFirstFileBuffer } from "@/lib/services/invoice-first-files";
import { apiErrorResponse } from "@/lib/api/handle-route-error";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(request: Request, ctx: Ctx) {
  try {
    await requireSessionUser();
    const { id } = await ctx.params;
    const { searchParams } = new URL(request.url);
    const download = searchParams.get("download") === "1";

    const meta = await readInvoiceFirstFileBuffer(id);
    if (!meta) return NextResponse.json({ error: "Archivo no encontrado." }, { status: 404 });

    const disposition = download ? "attachment" : "inline";
    return new NextResponse(new Uint8Array(meta.buffer), {
      headers: {
        "Content-Type": meta.mimeType,
        "Content-Disposition": `${disposition}; filename="${encodeURIComponent(meta.originalFileName)}"`,
        "Cache-Control": "private, no-cache",
      },
    });
  } catch (e) {
    return apiErrorResponse(e);
  }
}
