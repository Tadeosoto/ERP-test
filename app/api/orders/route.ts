import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createDraftOrder } from "@/lib/domain/transitions";
import { requireSessionUser } from "@/lib/auth/session-server";
import { NotificationEvents, notifyByRoles } from "@/lib/services/notifications";
import { mapOrder, orderInclude } from "@/lib/services/mappers";
import { apiErrorResponse } from "@/lib/api/handle-route-error";
import type { PaymentType } from "@/lib/domain/types";

function buildTitle(ocFolio: string, supplierName: string): string {
  if (ocFolio.trim()) return ocFolio.trim();
  return supplierName.trim() || "Orden de compra";
}

export async function GET(request: Request) {
  try {
    await requireSessionUser();
    const { searchParams } = new URL(request.url);
    const obraId = searchParams.get("obraId");
    const orders = await prisma.purchaseOrder.findMany({
      where: obraId ? { obraId } : undefined,
      include: orderInclude,
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ orders: orders.map(mapOrder) });
  } catch (e) {
    return apiErrorResponse(e);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireSessionUser();
    if (user.role !== "compras") {
      return NextResponse.json({ error: "Solo Compras (Paty) puede crear órdenes." }, { status: 403 });
    }

    const body = (await request.json()) as {
      obraId?: string;
      supplierName?: string;
      supplierId?: string | null;
      ocFolio?: string;
      ocDate?: string;
      paymentTerms?: string;
      description?: string;
      internalReference?: string;
      documentDate?: string;
      totalAmount?: number;
      currency?: string;
      paymentType?: PaymentType | null;
      suggestedPaymentType?: PaymentType | null;
      materialRequestId?: string | null;
      assignedEngineerUserId?: string | null;
      asDraft?: boolean;
    };

    if (!body.obraId || !body.supplierName?.trim()) {
      return NextResponse.json({ error: "Obra y proveedor son requeridos." }, { status: 400 });
    }

    const asDraft = body.asDraft !== false;
    const draft = createDraftOrder();
    const totalAmount = asDraft ? (body.totalAmount ?? 0) : Number(body.totalAmount);
    if (!asDraft && totalAmount <= 0) {
      return NextResponse.json({ error: "El monto total debe ser mayor a cero." }, { status: 400 });
    }

    const supplierName = body.supplierName.trim();
    const ocFolio = body.ocFolio?.trim() ?? "";

    let materialRequestId: string | null = body.materialRequestId ?? null;
    let assignedEngineerUserId = body.assignedEngineerUserId ?? null;
    let description = body.description?.trim() ?? "";
    let internalReference = body.internalReference?.trim() ?? "";

    if (materialRequestId) {
      const solicitud = await prisma.materialRequest.findUnique({
        where: { id: materialRequestId },
        include: { purchaseOrder: true },
      });
      if (!solicitud || solicitud.status !== "sent") {
        return NextResponse.json({ error: "Solicitud de material no válida o ya procesada." }, { status: 400 });
      }
      if (solicitud.purchaseOrder) {
        return NextResponse.json({ error: "Esta solicitud ya tiene una OC vinculada." }, { status: 400 });
      }
      assignedEngineerUserId = solicitud.createdByUserId;
      if (!description) {
        description = [
          solicitud.materials,
          solicitud.quantities ? `Cantidades: ${solicitud.quantities}` : "",
          solicitud.justification ? `Justificación: ${solicitud.justification}` : "",
        ]
          .filter(Boolean)
          .join("\n");
      }
      if (!internalReference && solicitud.costCenter) {
        internalReference = `CC: ${solicitud.costCenter}`;
      }
    }

    const paymentType = body.paymentType ?? null;

    const order = await prisma.purchaseOrder.create({
      data: {
        obraId: body.obraId,
        title: buildTitle(ocFolio, supplierName),
        supplierName,
        supplierId: body.supplierId ?? null,
        ocFolio,
        ocDate: body.ocDate ? new Date(body.ocDate) : null,
        paymentTerms: body.paymentTerms?.trim() ?? "",
        description,
        internalReference,
        documentDate: body.documentDate ? new Date(body.documentDate) : null,
        totalAmount: asDraft ? totalAmount : totalAmount,
        amountPaidSoFar: draft.amountPaidSoFar,
        paymentLabel: draft.paymentLabel,
        currency: body.currency?.trim() || "MXN",
        paymentType: paymentType,
        suggestedPaymentType: paymentType === "parcialidades" ? "parcialidades" : null,
        materialRequestId,
        assignedEngineerUserId,
        status: asDraft ? "draft" : "awaitingEngineer",
        createdByUserId: user.id,
      },
      include: orderInclude,
    });

    if (!asDraft) {
      const evt = NotificationEvents.orderCreated(order.title);
      await notifyByRoles(order.id, evt.type, evt.message, evt.roles);
    }

    return NextResponse.json({ order: mapOrder(order) });
  } catch (e) {
    return apiErrorResponse(e);
  }
}
