import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSessionUser } from "@/lib/auth/session-server";
import { asOrderStatus, asRole, mapOrder, orderInclude } from "@/lib/services/mappers";
import { apiErrorResponse } from "@/lib/api/handle-route-error";
import { amountRemaining } from "@/lib/domain/transitions";
import { paymentBasisTotal } from "@/lib/domain/order-fx";

export async function POST(request: Request) {
  try {
    const user = await requireSessionUser();
    const role = asRole(user.role);
    if (role !== "pagos" && role !== "direccion") {
      return NextResponse.json({ error: "No tienes permiso para programar pagos." }, { status: 403 });
    }

    const body = (await request.json()) as {
      orderId?: string;
      amount?: number;
      plannedDate?: string;
      reference?: string;
    };

    const orderId = body.orderId?.trim();
    if (!orderId) {
      return NextResponse.json({ error: "Falta la orden." }, { status: 400 });
    }
    const amount = Number(body.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ error: "Monto inválido." }, { status: 400 });
    }
    if (!body.plannedDate?.match(/^\d{4}-\d{2}-\d{2}$/)) {
      return NextResponse.json({ error: "Fecha de pago inválida." }, { status: 400 });
    }

    const order = await prisma.purchaseOrder.findUnique({
      where: { id: orderId },
      include: orderInclude,
    });
    if (!order) {
      return NextResponse.json({ error: "Orden no encontrada." }, { status: 404 });
    }

    const status = asOrderStatus(order.status);
    if (status !== "awaitingPayment" && status !== "awaitingInvoice") {
      return NextResponse.json(
        { error: "Esta orden no está en un estado que permita programar pago." },
        { status: 400 }
      );
    }

    const basis = paymentBasisTotal({
      currency: order.currency,
      totalAmount: order.totalAmount,
      fxRate: order.fxRate,
      totalAmountMxn: order.totalAmountMxn,
    });
    const balance = amountRemaining(basis, order.amountPaidSoFar);
    if (amount > balance + 0.01) {
      return NextResponse.json(
        { error: `El monto supera el saldo pendiente (${balance.toFixed(2)}).` },
        { status: 400 }
      );
    }

    const plannedDate = new Date(`${body.plannedDate}T12:00:00.000Z`);

    await prisma.$transaction(async (tx) => {
      await tx.scheduledPayment.updateMany({
        where: { orderId, status: "scheduled" },
        data: { status: "cancelled" },
      });
      await tx.scheduledPayment.create({
        data: {
          orderId,
          amount,
          plannedDate,
          reference: body.reference?.trim() ?? "",
          status: "scheduled",
          createdByUserId: user.id,
        },
      });
    });

    const updated = await prisma.purchaseOrder.findUniqueOrThrow({
      where: { id: orderId },
      include: orderInclude,
    });

    return NextResponse.json({ ok: true, order: mapOrder(updated) });
  } catch (e) {
    return apiErrorResponse(e);
  }
}
