import { NextResponse } from "next/server";
import { requireSessionUser } from "@/lib/auth/session-server";
import { apiErrorResponse } from "@/lib/api/handle-route-error";
import { asRole } from "@/lib/services/mappers";
import { canAccessViaticos } from "@/lib/viaticos/access";
import { readViaticoExpenseFile } from "@/lib/services/viatico-files";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(request: Request, ctx: Ctx) {
  try {
    const user = await requireSessionUser();
    if (!canAccessViaticos(asRole(user.role))) {
      return NextResponse.json({ error: "No tienes acceso a viáticos." }, { status: 403 });
    }
    const { id } = await ctx.params;
    const download = new URL(request.url).searchParams.get("download") === "1";
    const meta = await readViaticoExpenseFile(id);
    if (!meta) return NextResponse.json({ error: "Archivo no encontrado." }, { status: 404 });
    const disposition = download ? "attachment" : "inline";
    return new NextResponse(new Uint8Array(meta.buffer), {
      headers: {
        "Content-Type": meta.mimeType,
        "Content-Disposition": `${disposition}; filename="${meta.originalFileName}"`,
        "Cache-Control": "private, no-cache",
      },
    });
  } catch (e) {
    return apiErrorResponse(e);
  }
}
