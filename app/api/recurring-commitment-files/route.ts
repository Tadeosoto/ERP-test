import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { canConsultPaymentDocuments } from "@/lib/domain/transitions";
import { requireSessionUser } from "@/lib/auth/session-server";
import { asRole } from "@/lib/services/mappers";
import { apiErrorResponse } from "@/lib/api/handle-route-error";

/** Listado de factura/pago de compromisos (Contabilidad, Recepción, Administración). */
export async function GET() {
  try {
    const user = await requireSessionUser();
    const role = asRole(user.role);
    if (!canConsultPaymentDocuments(role)) {
      return NextResponse.json({ error: "No tienes permiso para consultar estos documentos." }, { status: 403 });
    }

    const files = await prisma.recurringCommitmentFile.findMany({
      where: {
        kind: { in: ["factura", "comprobante_pago"] },
        commitment: { active: true },
      },
      orderBy: { createdAt: "desc" },
      take: 40,
      include: {
        commitment: { select: { id: true, concept: true, supplierName: true } },
      },
    });

    return NextResponse.json({
      files: files.map((f) => ({
        id: f.id,
        kind: f.kind,
        originalFileName: f.originalFileName,
        createdAt: f.createdAt.toISOString(),
        commitmentId: f.commitmentId,
        concept: f.commitment.concept,
        supplierName: f.commitment.supplierName,
      })),
    });
  } catch (e) {
    return apiErrorResponse(e);
  }
}
