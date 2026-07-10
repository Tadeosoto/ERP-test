import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { EXPEDIENTE_CLOSE_ROLES } from "@/lib/domain/flow";
import {
  canResolveDirectExpenseDifference,
  canSendDirectExpense,
  canValidateDirectExpense,
  type DirectExpenseStatus,
} from "@/lib/domain/solicitudes";
import { computePaymentLabel } from "@/lib/domain/transitions";
import { requireSessionUser } from "@/lib/auth/session-server";
import { asRole } from "@/lib/services/mappers";
import { notifyDirectExpenseByRoles } from "@/lib/services/notifications";
import { saveDirectExpenseFile } from "@/lib/services/solicitud-files";
import {
  directExpenseInclude,
  mapDirectExpense,
} from "@/lib/services/solicitud-mappers";
import { apiErrorResponse } from "@/lib/api/handle-route-error";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(request: Request, ctx: Ctx) {
  try {
    const user = await requireSessionUser();
    const { id } = await ctx.params;
    const row = await prisma.directExpenseRequest.findUnique({
      where: { id },
      include: { obra: true },
    });
    if (!row) return NextResponse.json({ error: "Solicitud no encontrada." }, { status: 404 });

    const status = row.status as DirectExpenseStatus;
    const role = asRole(user.role);
    const body = (await request.json()) as {
      action?: string;
      amount?: number;
      reference?: string;
      notes?: string;
      comment?: string;
      expectInvoice?: boolean;
    };

    if (body.action === "send") {
      if (!canSendDirectExpense(status, role, row.createdByUserId, user.id)) {
        return NextResponse.json({ error: "No puedes enviar esta solicitud." }, { status: 403 });
      }
      if (!row.justification.trim()) {
        return NextResponse.json({ error: "Completa la justificación antes de enviar." }, { status: 400 });
      }

      const updated = await prisma.directExpenseRequest.update({
        where: { id },
        data: { status: "sent", sentAt: new Date() },
        include: directExpenseInclude,
      });

      await notifyDirectExpenseByRoles(
        id,
        "direct_expense_sent",
        `Solicitud de gasto directo para «${row.obra.name}». Administración: registra el pago.`,
        ["pagos"]
      );

      return NextResponse.json({ expense: mapDirectExpense(updated) });
    }

    if (body.action === "register_payment") {
      if (role !== "pagos" || status !== "sent") {
        return NextResponse.json({ error: "No puedes registrar el pago ahora." }, { status: 403 });
      }
      const amount = Number(body.amount);
      if (!Number.isFinite(amount) || amount <= 0) {
        return NextResponse.json({ error: "Monto de pago inválido." }, { status: 400 });
      }
      const total = row.estimatedAmount > 0 ? row.estimatedAmount : amount;
      const newPaid = row.amountPaidSoFar + amount;
      if (newPaid > total + 0.01) {
        return NextResponse.json({ error: "El pago supera el monto estimado." }, { status: 400 });
      }
      const fullyPaid = newPaid >= total - 0.01;
      const paymentLabel = computePaymentLabel(total, fullyPaid ? total : newPaid);
      const expectInvoice = Boolean(body.expectInvoice);
      const nextStatus = fullyPaid
        ? expectInvoice
          ? "awaiting_invoice"
          : "paid"
        : "sent";

      const updated = await prisma.$transaction(async (tx) => {
        await tx.directExpensePayment.create({
          data: {
            expenseId: id,
            amount,
            reference: body.reference?.trim() ?? "",
            notes: body.notes?.trim() ?? "",
            recordedByUserId: user.id,
          },
        });
        return tx.directExpenseRequest.update({
          where: { id },
          data: {
            estimatedAmount: total,
            amountPaidSoFar: fullyPaid ? total : newPaid,
            paymentLabel,
            status: nextStatus,
          },
          include: directExpenseInclude,
        });
      });

      if (fullyPaid && expectInvoice) {
        await notifyDirectExpenseByRoles(
          id,
          "direct_expense_awaiting_invoice",
          `Gasto directo «${row.obra.name}» pagado y espera factura.`,
          ["recepcion", "pagos"]
        );
      } else if (fullyPaid) {
        await notifyDirectExpenseByRoles(
          id,
          "direct_expense_paid",
          `Gasto directo «${row.obra.name}» pagado. Sube comprobante y factura.`,
          ["pagos", "recepcion"]
        );
      }

      return NextResponse.json({ expense: mapDirectExpense(updated) });
    }

    if (body.action === "mark_awaiting_invoice") {
      if (role !== "pagos" || status !== "paid") {
        return NextResponse.json({ error: "No puedes marcar esperando factura ahora." }, { status: 403 });
      }
      const updated = await prisma.directExpenseRequest.update({
        where: { id },
        data: { status: "awaiting_invoice" },
        include: directExpenseInclude,
      });
      await notifyDirectExpenseByRoles(
        id,
        "direct_expense_awaiting_invoice",
        `Gasto directo «${row.obra.name}» espera factura.`,
        ["recepcion", "pagos"]
      );
      return NextResponse.json({ expense: mapDirectExpense(updated) });
    }

    if (body.action === "accounting_complete") {
      if (!canValidateDirectExpense(status, role)) {
        return NextResponse.json({ error: "No puedes cerrar el expediente ahora." }, { status: 403 });
      }
      const updated = await prisma.directExpenseRequest.update({
        where: { id },
        data: { status: "completed" },
        include: directExpenseInclude,
      });
      return NextResponse.json({ expense: mapDirectExpense(updated) });
    }

    if (body.action === "accounting_flag_difference") {
      if (!canValidateDirectExpense(status, role)) {
        return NextResponse.json({ error: "No puedes marcar diferencia ahora." }, { status: 403 });
      }
      if (!body.comment?.trim()) {
        return NextResponse.json({ error: "Indique la observación." }, { status: 400 });
      }
      const updated = await prisma.directExpenseRequest.update({
        where: { id },
        data: { status: "difference" },
        include: directExpenseInclude,
      });
      return NextResponse.json({ expense: mapDirectExpense(updated) });
    }

    if (body.action === "accounting_resolve") {
      if (!canResolveDirectExpenseDifference(status, role)) {
        return NextResponse.json({ error: "No puedes resolver la diferencia ahora." }, { status: 403 });
      }
      const updated = await prisma.directExpenseRequest.update({
        where: { id },
        data: { status: "completed" },
        include: directExpenseInclude,
      });
      return NextResponse.json({ expense: mapDirectExpense(updated) });
    }

    return NextResponse.json({ error: "Acción no reconocida." }, { status: 400 });
  } catch (e) {
    return apiErrorResponse(e);
  }
}

export async function PUT(request: Request, ctx: Ctx) {
  try {
    const user = await requireSessionUser();
    const { id } = await ctx.params;
    const form = await request.formData();
    const kind = form.get("kind") as string | null;
    const file = form.get("file");

    if (!kind || !(file instanceof File)) {
      return NextResponse.json({ error: "kind y file son requeridos." }, { status: 400 });
    }

    const row = await prisma.directExpenseRequest.findUnique({
      where: { id },
      include: { obra: true },
    });
    if (!row) return NextResponse.json({ error: "Solicitud no encontrada." }, { status: 404 });

    const status = row.status as DirectExpenseStatus;
    const role = asRole(user.role);

    if (kind === "comprobante_pago") {
      if (role !== "pagos" || !["sent", "paid", "awaiting_invoice"].includes(status)) {
        return NextResponse.json({ error: "No puedes subir comprobante ahora." }, { status: 403 });
      }
    } else if (kind === "factura") {
      if (!["pagos", "recepcion", "contabilidad"].includes(role) || !["paid", "awaiting_invoice"].includes(status)) {
        return NextResponse.json({ error: "No puedes subir factura ahora." }, { status: 403 });
      }
    } else {
      return NextResponse.json({ error: "Tipo de archivo inválido." }, { status: 400 });
    }

    await saveDirectExpenseFile({
      expenseId: id,
      kind: kind as "comprobante_pago" | "factura",
      file,
      uploadedByUserId: user.id,
    });

    let newStatus = status;
    if (kind === "factura" && (status === "paid" || status === "awaiting_invoice")) {
      newStatus = "invoice_received";
      await notifyDirectExpenseByRoles(
        id,
        "direct_expense_invoice",
        `Factura recibida en gasto directo «${row.obra.name}». Valida y cierra el expediente.`,
        EXPEDIENTE_CLOSE_ROLES
      );
    }

    const updated = await prisma.directExpenseRequest.update({
      where: { id },
      data: { status: newStatus },
      include: directExpenseInclude,
    });

    return NextResponse.json({ expense: mapDirectExpense(updated) });
  } catch (e) {
    return apiErrorResponse(e);
  }
}
