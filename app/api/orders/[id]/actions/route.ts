import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  afterAccountingComplete,
  afterAccountingDifference,
  afterAuthorizeOrder,
  afterEngineerReject,
  afterInvoiceUploaded,
  afterMarkAwaitingInvoice,
  afterPatySetsDeadline,
  afterSendToEngineer,
  canAccountingResolveDifference,
  canAccountingValidate,
  canAuthorizeOrder,
  canDeletePayment,
  canEngineerAct,
  canMarkAwaitingInvoice,
  canRegisterPayment,
  canSendToAdministration,
  canSendToEngineer,
  canSetPaymentDeadline,
  computePaymentLabel,
  engineerApproveNextStatus,
  registerPaymentAmount,
} from "@/lib/domain/transitions";
import { requireSessionUser } from "@/lib/auth/session-server";
import { NotificationEvents, notifyByRoles, notifyUsers } from "@/lib/services/notifications";
import {
  asOrderStatus,
  asPaymentType,
  asRole,
  mapOrder,
  orderInclude,
} from "@/lib/services/mappers";
import { apiErrorResponse } from "@/lib/api/handle-route-error";
import type { PaymentType, OrderStatus } from "@/lib/domain/types";
import { paymentBasisTotal } from "@/lib/domain/order-fx";
import { isPdf, saveOrderFile } from "@/lib/services/files";

type Ctx = { params: Promise<{ id: string }> };

function statusAfterPaymentRemoval(currentStatus: OrderStatus, totalAmount: number, amountPaidSoFar: number): OrderStatus {
  if (amountPaidSoFar <= 0.01) {
    if (["paid", "awaitingInvoice", "invoiceReceived"].includes(currentStatus)) {
      return "awaitingPayment";
    }
    return currentStatus;
  }
  if (amountPaidSoFar >= totalAmount - 0.01) {
    if (["awaitingPayment", "awaitingPatyDeadline"].includes(currentStatus)) {
      return "paid";
    }
    return currentStatus;
  }
  if (["paid", "awaitingInvoice", "invoiceReceived"].includes(currentStatus)) {
    return "awaitingPayment";
  }
  return currentStatus;
}

export async function POST(request: Request, ctx: Ctx) {
  try {
    const user = await requireSessionUser();
    const { id } = await ctx.params;

    const contentType = request.headers.get("content-type") ?? "";
    let body: {
      action?: string;
      comment?: string;
      amount?: number;
      reference?: string;
      notes?: string;
      paymentType?: PaymentType;
      paymentDueDate?: string;
      assignedEngineerUserId?: string;
      paymentId?: string;
    };
    let receiptFile: File | null = null;

    if (contentType.includes("multipart/form-data")) {
      const form = await request.formData();
      const fileRaw = form.get("file");
      receiptFile = fileRaw instanceof File && fileRaw.size > 0 ? fileRaw : null;
      body = {
        action: String(form.get("action") ?? ""),
        comment: String(form.get("comment") ?? ""),
        amount: Number(form.get("amount")),
        reference: String(form.get("reference") ?? ""),
        notes: String(form.get("notes") ?? ""),
        paymentDueDate: String(form.get("paymentDueDate") ?? ""),
        paymentId: String(form.get("paymentId") ?? ""),
        assignedEngineerUserId: String(form.get("assignedEngineerUserId") ?? ""),
      };
    } else {
      body = (await request.json()) as typeof body;
    }

    const order = await prisma.purchaseOrder.findUnique({ where: { id } });
    if (!order) return NextResponse.json({ error: "Orden no encontrada." }, { status: 404 });
    const status = asOrderStatus(order.status);
    const role = asRole(user.role);

    if (body.action === "engineer_approve") {
      if (!canEngineerAct(status, role)) {
        return NextResponse.json({ error: "No puedes aprobar en este estado." }, { status: 403 });
      }
      const paymentType = asPaymentType(order.paymentType) ?? asPaymentType(order.suggestedPaymentType);
      if (!paymentType) {
        return NextResponse.json(
          { error: "Compras debe indicar la modalidad de pago (inmediato, 30 días o parcialidades) en la OC." },
          { status: 400 }
        );
      }

      const signedPdf = await prisma.storedFile.findFirst({
        where: { orderId: id, kind: "oc_signed_pdf" },
      });
      if (!signedPdf) {
        return NextResponse.json(
          { error: "Sube el PDF firmado de la OC antes de aprobar." },
          { status: 400 }
        );
      }

      const hasDueDate = Boolean(order.paymentDueDate);
      const { status: nextStatus, paymentType: resolvedType } = engineerApproveNextStatus(
        paymentType,
        hasDueDate
      );

      const updated = await prisma.$transaction(async (tx) => {
        await tx.orderComment.create({
          data: {
            orderId: id,
            authorId: user.id,
            body: body.comment?.trim() || `Aprobado con PDF firmado · ${resolvedType}`,
            kind: "approval",
          },
        });
        return tx.purchaseOrder.update({
          where: { id },
          data: { status: nextStatus, paymentType: resolvedType },
          include: orderInclude,
        });
      });

      if (nextStatus === "awaitingPatyDeadline") {
        const evt = NotificationEvents.engineerApprovedProgramado(updated.title);
        await notifyByRoles(id, evt.type, evt.message, evt.roles);
      } else {
        const evt = NotificationEvents.engineerApproved(updated.title);
        await notifyByRoles(id, evt.type, evt.message, evt.roles);
      }
      return NextResponse.json({ order: mapOrder(updated) });
    }

    if (body.action === "authorize_order") {
      if (!canAuthorizeOrder(status, role)) {
        return NextResponse.json({ error: "No puedes autorizar en este estado." }, { status: 403 });
      }
      const updated = await prisma.$transaction(async (tx) => {
        await tx.orderComment.create({
          data: {
            orderId: id,
            authorId: user.id,
            body: body.comment?.trim() || `Autorizada por ${user.name}`,
            kind: "approval",
          },
        });
        return tx.purchaseOrder.update({
          where: { id },
          data: { status: afterAuthorizeOrder() },
          include: orderInclude,
        });
      });
      const evt = NotificationEvents.orderAuthorized(updated.title, user.name);
      await notifyByRoles(id, evt.type, evt.message, evt.roles);
      return NextResponse.json({ order: mapOrder(updated) });
    }

    if (body.action === "engineer_reject") {
      if (!canEngineerAct(status, role)) {
        return NextResponse.json({ error: "No puedes rechazar en este estado." }, { status: 403 });
      }
      if (!body.comment?.trim()) {
        return NextResponse.json({ error: "Indique el comentario de corrección." }, { status: 400 });
      }
      const updated = await prisma.$transaction(async (tx) => {
        await tx.orderComment.create({
          data: {
            orderId: id,
            authorId: user.id,
            body: body.comment!.trim(),
            kind: "rejection",
          },
        });
        return tx.purchaseOrder.update({
          where: { id },
          data: { status: afterEngineerReject() },
          include: orderInclude,
        });
      });
      const evt = NotificationEvents.engineerRejected(updated.title);
      await notifyByRoles(id, evt.type, evt.message, evt.roles);
      return NextResponse.json({ order: mapOrder(updated) });
    }

    if (body.action === "set_payment_deadline") {
      if (!canSetPaymentDeadline(status, role)) {
        return NextResponse.json({ error: "No puedes fijar la fecha en este estado." }, { status: 403 });
      }
      if (!body.paymentDueDate) {
        return NextResponse.json({ error: "Indique la fecha límite de pago." }, { status: 400 });
      }
      const due = new Date(body.paymentDueDate);
      if (Number.isNaN(due.getTime())) {
        return NextResponse.json({ error: "Fecha inválida." }, { status: 400 });
      }
      const updated = await prisma.purchaseOrder.update({
        where: { id },
        data: {
          paymentDueDate: due,
          status: afterPatySetsDeadline(),
        },
        include: orderInclude,
      });
      const dateStr = due.toLocaleDateString("es-MX");
      const evt = NotificationEvents.deadlineSet(updated.title, dateStr);
      await notifyByRoles(id, evt.type, evt.message, evt.roles);
      return NextResponse.json({ order: mapOrder(updated) });
    }

    if (body.action === "register_payment") {
      if (!canRegisterPayment(status, role)) {
        return NextResponse.json({ error: "No puedes registrar pagos en este estado." }, { status: 403 });
      }
      if (!receiptFile) {
        return NextResponse.json(
          { error: "Debes adjuntar el comprobante de pago (PDF) junto con el abono." },
          { status: 400 }
        );
      }
      if (!isPdf(receiptFile)) {
        return NextResponse.json({ error: "El comprobante debe ser un archivo PDF." }, { status: 400 });
      }

      const paymentType = asPaymentType(order.paymentType);
      if (!paymentType) {
        return NextResponse.json({ error: "Modalidad de pago no definida." }, { status: 400 });
      }
      const amount = Number(body.amount);
      const basisTotal = paymentBasisTotal({
        currency: order.currency,
        totalAmount: order.totalAmount,
        fxRate: order.fxRate,
        totalAmountMxn: order.totalAmountMxn,
      });
      const result = registerPaymentAmount({
        totalAmount: basisTotal,
        currentPaid: order.amountPaidSoFar,
        paymentAmount: amount,
        paymentType,
      });

      const fxHint =
        order.currency.toUpperCase() === "USD" && order.fxRate
          ? `\n(Abono en MXN · OC USD · TC ${order.fxRate})`
          : "";
      const notes = `${body.notes?.trim() ?? ""}${fxHint}`.trim();

      const payment = await prisma.paymentRecord.create({
        data: {
          orderId: id,
          amount,
          reference: body.reference?.trim() ?? "",
          notes,
          recordedByUserId: user.id,
        },
      });

      try {
        await saveOrderFile({
          orderId: id,
          kind: "comprobante_pago",
          file: receiptFile,
          uploadedByUserId: user.id,
        });
      } catch (fileErr) {
        await prisma.paymentRecord.delete({ where: { id: payment.id } });
        const msg =
          fileErr instanceof Error ? fileErr.message : "No se pudo guardar el comprobante.";
        return NextResponse.json(
          { error: `No se registró el abono: ${msg}` },
          { status: 400 }
        );
      }

      const existingInvoice = result.fullyPaid
        ? await prisma.storedFile.findFirst({
            where: { orderId: id, kind: "factura" },
            select: { id: true },
          })
        : null;
      const nextStatus =
        result.fullyPaid && existingInvoice ? afterInvoiceUploaded() : result.status;

      const updated = await prisma.purchaseOrder.update({
        where: { id },
        data: {
          amountPaidSoFar: result.amountPaidSoFar,
          paymentLabel: result.paymentLabel,
          status: nextStatus,
        },
        include: orderInclude,
      });

      const evt = NotificationEvents.paymentRegistered(updated.title, result.fullyPaid);
      await notifyByRoles(id, evt.type, evt.message, evt.roles);
      if (nextStatus === "invoiceReceived") {
        const invoiceEvt = NotificationEvents.invoiceUploaded(updated.title);
        await notifyByRoles(id, invoiceEvt.type, invoiceEvt.message, invoiceEvt.roles);
      }
      return NextResponse.json({ order: mapOrder(updated) });
    }

    if (body.action === "delete_payment") {
      if (!canDeletePayment(role)) {
        return NextResponse.json({ error: "No tienes permiso para eliminar pagos." }, { status: 403 });
      }
      if (!body.paymentId) {
        return NextResponse.json({ error: "Indique el pago a eliminar." }, { status: 400 });
      }

      const payment = await prisma.paymentRecord.findFirst({
        where: { id: body.paymentId, orderId: id },
      });
      if (!payment) {
        return NextResponse.json({ error: "Pago no encontrado." }, { status: 404 });
      }

      const updated = await prisma.$transaction(async (tx) => {
        await tx.paymentRecord.delete({ where: { id: payment.id } });
        const remaining = await tx.paymentRecord.findMany({
          where: { orderId: id },
          orderBy: { createdAt: "asc" },
        });
        const amountPaidSoFar = remaining.reduce((sum, row) => sum + row.amount, 0);
        const basisTotal = paymentBasisTotal({
          currency: order.currency,
          totalAmount: order.totalAmount,
          fxRate: order.fxRate,
          totalAmountMxn: order.totalAmountMxn,
        });
        const paymentLabel = computePaymentLabel(basisTotal, amountPaidSoFar);
        const nextStatus = statusAfterPaymentRemoval(status, basisTotal, amountPaidSoFar);

        return tx.purchaseOrder.update({
          where: { id },
          data: {
            amountPaidSoFar: amountPaidSoFar >= basisTotal - 0.01 ? basisTotal : amountPaidSoFar,
            paymentLabel,
            status: nextStatus,
          },
          include: orderInclude,
        });
      });

      return NextResponse.json({ order: mapOrder(updated) });
    }

    if (body.action === "mark_awaiting_invoice") {
      if (!canMarkAwaitingInvoice(status, role)) {
        return NextResponse.json({ error: "No puedes marcar esperando factura ahora." }, { status: 403 });
      }
      const updated = await prisma.purchaseOrder.update({
        where: { id },
        data: { status: afterMarkAwaitingInvoice() },
        include: orderInclude,
      });
      const evt = NotificationEvents.awaitingInvoice(updated.title);
      await notifyByRoles(id, evt.type, evt.message, evt.roles);
      return NextResponse.json({ order: mapOrder(updated) });
    }

    if (body.action === "accounting_complete") {
      if (!canAccountingValidate(status, role)) {
        return NextResponse.json({ error: "No puedes cerrar el expediente ahora." }, { status: 403 });
      }
      const updated = await prisma.$transaction(async (tx) => {
        const o = await tx.purchaseOrder.update({
          where: { id },
          data: { status: afterAccountingComplete() },
          include: orderInclude,
        });
        if (order.invoiceFirstCommitmentId) {
          await tx.invoiceFirstCommitment.update({
            where: { id: order.invoiceFirstCommitmentId },
            data: { status: "completed" },
          });
        }
        return o;
      });
      const evt = NotificationEvents.orderCompleted(updated.title);
      await notifyByRoles(id, evt.type, evt.message, evt.roles);
      return NextResponse.json({ order: mapOrder(updated) });
    }

    if (body.action === "accounting_flag_difference") {
      if (!canAccountingValidate(status, role)) {
        return NextResponse.json({ error: "No puedes marcar diferencia ahora." }, { status: 403 });
      }
      if (!body.comment?.trim()) {
        return NextResponse.json({ error: "Indique la observación de la diferencia." }, { status: 400 });
      }
      const updated = await prisma.$transaction(async (tx) => {
        await tx.orderComment.create({
          data: {
            orderId: id,
            authorId: user.id,
            body: body.comment!.trim(),
            kind: "rejection",
          },
        });
        return tx.purchaseOrder.update({
          where: { id },
          data: { status: afterAccountingDifference() },
          include: orderInclude,
        });
      });
      const evt = NotificationEvents.orderDifference(updated.title);
      await notifyByRoles(id, evt.type, evt.message, evt.roles);
      return NextResponse.json({ order: mapOrder(updated) });
    }

    if (body.action === "accounting_resolve") {
      if (!canAccountingResolveDifference(status, role)) {
        return NextResponse.json({ error: "No puedes resolver la diferencia ahora." }, { status: 403 });
      }
      const updated = await prisma.purchaseOrder.update({
        where: { id },
        data: { status: afterAccountingComplete() },
        include: orderInclude,
      });
      const evt = NotificationEvents.orderCompleted(updated.title);
      await notifyByRoles(id, evt.type, evt.message, evt.roles);
      return NextResponse.json({ order: mapOrder(updated) });
    }

    if (body.action === "send_to_engineer") {
      if (!canSendToEngineer(status, role)) {
        return NextResponse.json({ error: "No puedes enviar esta orden en el estado actual." }, { status: 403 });
      }

      const engineerId = body.assignedEngineerUserId ?? order.assignedEngineerUserId;
      if (!engineerId) {
        return NextResponse.json({ error: "Selecciona un ingeniero responsable." }, { status: 400 });
      }

      const hasPdf = await prisma.storedFile.findFirst({
        where: { orderId: id, kind: "oc_pdf" },
      });
      if (!hasPdf) {
        return NextResponse.json({ error: "Debes adjuntar el PDF de la OC antes de enviar." }, { status: 400 });
      }

      if (order.totalAmount <= 0) {
        return NextResponse.json({ error: "El monto total de la OC debe ser mayor a cero." }, { status: 400 });
      }

      const paymentType = asPaymentType(order.paymentType) ?? asPaymentType(order.suggestedPaymentType);
      if (!paymentType) {
        return NextResponse.json(
          { error: "Indica la modalidad de pago (inmediato, 30 días o parcialidades) antes de enviar a Ingeniería." },
          { status: 400 }
        );
      }

      const engineer = await prisma.user.findUnique({ where: { id: engineerId } });
      if (!engineer || engineer.role !== "ingeniero") {
        return NextResponse.json({ error: "Ingeniero no válido." }, { status: 400 });
      }

      const updated = await prisma.$transaction(async (tx) => {
        const po = await tx.purchaseOrder.update({
          where: { id },
          data: {
            status: afterSendToEngineer(),
            assignedEngineerUserId: engineerId,
            sentToEngineerAt: new Date(),
            paymentType: paymentType,
            processKind: "a",
          },
          include: orderInclude,
        });

        if (order.materialRequestId) {
          await tx.materialRequest.update({
            where: { id: order.materialRequestId },
            data: { status: "in_oc_process" },
          });
        }

        if (order.invoiceFirstCommitmentId) {
          await tx.invoiceFirstCommitment.update({
            where: { id: order.invoiceFirstCommitmentId },
            data: { status: "in_payment" },
          });
        }

        return po;
      });

      const evt = NotificationEvents.orderCreated(updated.title);
      await notifyUsers({
        orderId: id,
        type: evt.type,
        message: `Paty envió «${updated.title}» a ${engineer.name} para aprobación.`,
        userIds: [engineerId],
      });
      await notifyByRoles(id, "order_sent_engineer", `OC «${updated.title}» pendiente de aprobación.`, ["ingeniero"]);

      return NextResponse.json({ order: mapOrder(updated) });
    }

    if (body.action === "send_to_administration") {
      if (!canSendToAdministration(status, role)) {
        return NextResponse.json(
          { error: "No puedes enviar esta orden a Administración en el estado actual." },
          { status: 403 }
        );
      }

      const hasPdf = await prisma.storedFile.findFirst({
        where: { orderId: id, kind: "oc_pdf" },
      });
      if (!hasPdf) {
        return NextResponse.json({ error: "Debes adjuntar el PDF de la OC antes de enviar." }, { status: 400 });
      }

      if (order.totalAmount <= 0) {
        return NextResponse.json({ error: "El monto total de la OC debe ser mayor a cero." }, { status: 400 });
      }

      const paymentType = asPaymentType(order.paymentType) ?? asPaymentType(order.suggestedPaymentType);
      if (!paymentType) {
        return NextResponse.json(
          { error: "Indica la modalidad de pago (inmediato, 30 días o parcialidades) antes de enviar." },
          { status: 400 }
        );
      }

      const { status: nextStatus } = engineerApproveNextStatus(paymentType);

      const updated = await prisma.$transaction(async (tx) => {
        await tx.orderComment.create({
          data: {
            orderId: id,
            authorId: user.id,
            body: `OC enviada por Proceso C a Administración / Carolina (sin aprobación de Ingeniería) · ${paymentType}`,
            kind: "approval",
          },
        });

        const po = await tx.purchaseOrder.update({
          where: { id },
          data: {
            status: nextStatus,
            paymentType,
            assignedEngineerUserId: null,
            sentToEngineerAt: null,
            processKind: "c",
          },
          include: orderInclude,
        });

        if (order.materialRequestId) {
          await tx.materialRequest.update({
            where: { id: order.materialRequestId },
            data: { status: "in_oc_process" },
          });
        }

        if (order.invoiceFirstCommitmentId) {
          await tx.invoiceFirstCommitment.update({
            where: { id: order.invoiceFirstCommitmentId },
            data: { status: "in_payment" },
          });
        }

        return po;
      });

      const evt = NotificationEvents.sentProcesoC(updated.title);
      await notifyByRoles(id, evt.type, evt.message, evt.roles);
      if (nextStatus === "awaitingPatyDeadline") {
        await notifyByRoles(
          id,
          "engineer_approved_programado",
          `«${updated.title}» (Proceso C) requiere fecha límite de pago.`,
          ["compras", "pagos"]
        );
      }

      return NextResponse.json({ order: mapOrder(updated) });
    }

    return NextResponse.json({ error: "Acción no reconocida." }, { status: 400 });
  } catch (e) {
    return apiErrorResponse(e);
  }
}
