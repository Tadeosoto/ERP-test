import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSessionUser } from "@/lib/auth/session-server";
import { apiErrorResponse } from "@/lib/api/handle-route-error";
import { asRole } from "@/lib/services/mappers";
import { canAccessViaticos } from "@/lib/viaticos/access";
import { mapViaticoDetail, viaticoDetailInclude } from "@/lib/viaticos/mappers";
import { asReceiptKind, parsePositiveMoney } from "@/lib/viaticos/summary";
import { saveViaticoExpenseFiles } from "@/lib/services/viatico-files";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(request: Request, ctx: Ctx) {
  try {
    const user = await requireSessionUser();
    if (!canAccessViaticos(asRole(user.role))) {
      return NextResponse.json({ error: "No tienes acceso a viáticos." }, { status: 403 });
    }
    const { id } = await ctx.params;
    const viatico = await prisma.viatico.findUnique({ where: { id } });
    if (!viatico) return NextResponse.json({ error: "Viático no encontrado." }, { status: 404 });

    const form = await request.formData();
    const concept = String(form.get("concept") ?? "").replace(/\s+/g, " ").trim().slice(0, 120);
    const amount = parsePositiveMoney(form.get("amount"));
    const receiptKind = asReceiptKind(String(form.get("receiptKind") ?? ""));
    const missingReceiptReason = String(form.get("missingReceiptReason") ?? "").trim().slice(0, 500);
    if (!concept || amount == null || !receiptKind) {
      return NextResponse.json({ error: "Indica concepto, monto y tipo de comprobante." }, { status: 400 });
    }
    if (receiptKind === "sin_comprobante" && !missingReceiptReason) {
      return NextResponse.json({ error: "Sin comprobante hay que indicar el motivo." }, { status: 400 });
    }

    const uploads = form.getAll("files").filter((item): item is File => item instanceof File && item.size > 0);
    if (receiptKind !== "sin_comprobante" && uploads.length === 0) {
      return NextResponse.json({ error: "Adjunta el comprobante de este gasto." }, { status: 400 });
    }

    const expense = await prisma.viaticoExpense.create({
      data: {
        viaticoId: id,
        concept,
        amount,
        receiptKind,
        missingReceiptReason: receiptKind === "sin_comprobante" ? missingReceiptReason : "",
        createdByUserId: user.id,
      },
    });

    if (receiptKind !== "sin_comprobante") {
      try {
        await saveViaticoExpenseFiles({
          expenseId: expense.id,
          receiptKind,
          files: uploads,
          uploadedByUserId: user.id,
        });
      } catch (error) {
        await prisma.viaticoExpense.delete({ where: { id: expense.id } });
        const message = error instanceof Error ? error.message : "No se pudo guardar el comprobante.";
        return NextResponse.json({ error: message }, { status: 400 });
      }
    }

    const row = await prisma.viatico.findUnique({ where: { id }, include: viaticoDetailInclude });
    return NextResponse.json({ viatico: row ? mapViaticoDetail(row) : null });
  } catch (e) {
    return apiErrorResponse(e);
  }
}
