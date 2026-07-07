import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSessionUser } from "@/lib/auth/session-server";
import { canCreateInvoiceFirstCommitment } from "@/lib/domain/proceso-c";
import { asRole } from "@/lib/services/mappers";
import { saveInvoiceFirstFile } from "@/lib/services/invoice-first-files";
import { apiErrorResponse } from "@/lib/api/handle-route-error";

export async function POST(request: Request) {
  try {
    const user = await requireSessionUser();
    const role = asRole(user.role);
    if (!canCreateInvoiceFirstCommitment(role)) {
      return NextResponse.json({ error: "No autorizado." }, { status: 403 });
    }

    const form = await request.formData();
    const commitmentId = form.get("commitmentId") as string | null;
    const file = form.get("file") as File | null;

    if (!commitmentId) {
      return NextResponse.json({ error: "Indica commitmentId." }, { status: 400 });
    }
    if (!file || file.size === 0) {
      return NextResponse.json({ error: "Archivo requerido." }, { status: 400 });
    }

    const commitment = await prisma.invoiceFirstCommitment.findUnique({ where: { id: commitmentId } });
    if (!commitment) {
      return NextResponse.json({ error: "Compromiso no encontrado." }, { status: 404 });
    }

    const saved = await saveInvoiceFirstFile({
      commitmentId,
      file,
      uploadedByUserId: user.id,
    });

    return NextResponse.json({ file: saved });
  } catch (e) {
    return apiErrorResponse(e);
  }
}
