import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  afterEngineerReject,
  afterPatySetsDeadline,
  canEngineerAct,
  canRegisterPayment,
  canSetPaymentDeadline,
  engineerApproveNextStatus,
  registerPaymentAmount,
} from "@/lib/domain/transitions";
import { requireSessionUser } from "@/lib/auth/session-server";
import { NotificationEvents, notifyByRoles } from "@/lib/services/notifications";
import {
  asOrderStatus,
  asPaymentType,
  asRole,
  mapOrder,
  orderInclude,
} from "@/lib/services/mappers";
import { apiErrorResponse } from "@/lib/api/handle-route-error";
import type { PaymentType } from "@/lib/domain/types";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(request: Request, ctx: Ctx) {
  try {
    const user = await requireSessionUser();
    const { id } = await ctx.params;
    const body = (await request.json()) as {
      action?: string;
      comment?: string;
      amount?: number;
      reference?: string;
      notes?: string;
      paymentType?: PaymentType;
      paymentDueDate?: string;
    };

    const order = await prisma.purchaseOrder.findUnique({ where: { id } });
    if (!order) return NextResponse.json({ error: "Orden no encontrada." }, { status: 404 });
    const status = asOrderStatus(order.status);
    const role = asRole(user.role);

    if (body.action === "engineer_approve") {
      if (!canEngineerAct(status, role)) {
        return NextResponse.json({ error: "No puedes aprobar en este estado." }, { status: 403 });
      }
      const suggested = asPaymentType(order.suggestedPaymentType);
      let engineerChoice = body.paymentType ?? "inmediato";
      if (suggested === "parcialidades") {
        engineerChoice = "parcialidades";
      } else if (!body.paymentType || !["inmediato", "programado"].includes(body.paymentType)) {
        return NextResponse.json(
          { error: "Indique modalidad de pago: inmediato o programado." },
          { status: 400 }
        );
      }

      const { status: nextStatus, paymentType } = engineerApproveNextStatus(
        engineerChoice,
        suggested
      );

      const updated = await prisma.$transaction(async (tx) => {
        await tx.orderComment.create({
          data: {
            orderId: id,
            authorId: user.id,
            body: body.comment?.trim() || `Aprobado · ${paymentType}`,
            kind: "approval",
          },
        });
        return tx.purchaseOrder.update({
          where: { id },
          data: { status: nextStatus, paymentType },
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
      const paymentType = asPaymentType(order.paymentType);
      if (!paymentType) {
        return NextResponse.json({ error: "Modalidad de pago no definida." }, { status: 400 });
      }
      const amount = Number(body.amount);
      const result = registerPaymentAmount({
        totalAmount: order.totalAmount,
        currentPaid: order.amountPaidSoFar,
        paymentAmount: amount,
        paymentType,
      });

      const updated = await prisma.$transaction(async (tx) => {
        await tx.paymentRecord.create({
          data: {
            orderId: id,
            amount,
            reference: body.reference?.trim() ?? "",
            notes: body.notes?.trim() ?? "",
            recordedByUserId: user.id,
          },
        });
        return tx.purchaseOrder.update({
          where: { id },
          data: {
            amountPaidSoFar: result.amountPaidSoFar,
            paymentLabel: result.paymentLabel,
            status: result.status,
          },
          include: orderInclude,
        });
      });

      const evt = NotificationEvents.paymentRegistered(updated.title, result.fullyPaid);
      await notifyByRoles(id, evt.type, evt.message, evt.roles);
      return NextResponse.json({ order: mapOrder(updated) });
    }

    return NextResponse.json({ error: "Acción no reconocida." }, { status: 400 });
  } catch (e) {
    return apiErrorResponse(e);
  }
}
