import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSessionUser } from "@/lib/auth/session-server";
import { saveSolicitudAttachment } from "@/lib/services/solicitud-files";
import { apiErrorResponse } from "@/lib/api/handle-route-error";

export async function POST(request: Request) {
  try {
    const user = await requireSessionUser();
    const form = await request.formData();
    const materialRequestId = form.get("materialRequestId") as string | null;
    const directExpenseId = form.get("directExpenseId") as string | null;
    const file = form.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "file es requerido." }, { status: 400 });
    }
    if (!materialRequestId && !directExpenseId) {
      return NextResponse.json({ error: "Indica materialRequestId o directExpenseId." }, { status: 400 });
    }

    if (materialRequestId) {
      const req = await prisma.materialRequest.findUnique({ where: { id: materialRequestId } });
      if (!req) return NextResponse.json({ error: "Solicitud no encontrada." }, { status: 404 });
      if (req.status !== "draft" || (user.role !== "ingeniero" || req.createdByUserId !== user.id)) {
        return NextResponse.json({ error: "No puedes adjuntar archivos a esta solicitud." }, { status: 403 });
      }
    }

    if (directExpenseId) {
      const req = await prisma.directExpenseRequest.findUnique({ where: { id: directExpenseId } });
      if (!req) return NextResponse.json({ error: "Solicitud no encontrada." }, { status: 404 });
      if (req.status !== "draft" || (user.role !== "ingeniero" || req.createdByUserId !== user.id)) {
        return NextResponse.json({ error: "No puedes adjuntar archivos a esta solicitud." }, { status: 403 });
      }
    }

    const saved = await saveSolicitudAttachment({
      materialRequestId: materialRequestId ?? undefined,
      directExpenseId: directExpenseId ?? undefined,
      file,
      uploadedByUserId: user.id,
    });

    return NextResponse.json({ file: saved });
  } catch (e) {
    return apiErrorResponse(e);
  }
}
