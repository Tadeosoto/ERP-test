import { canRoleAdvance, describeGate, formatPendingRoles, getPendingRoles } from "@/lib/domain/flow";
import { FILE_KIND_LABEL } from "@/lib/domain/labels";
import type { MovementDto, PendingMovementDto, Role } from "@/lib/domain/types";
import { formatMoney } from "@/lib/format";
import { prisma } from "@/lib/db";
import { asOrderStatus, asPaymentType, asRole } from "@/lib/services/mappers";

export type MovementFilters = {
  q?: string;
  role?: Role;
  obraId?: string;
  orderId?: string;
  limit?: number;
};

function matchesQuery(
  item: {
    description: string;
    context: string;
    orderTitle: string;
    obraName: string;
    actorName: string;
  },
  q: string
): boolean {
  const hay =
    `${item.description} ${item.context} ${item.orderTitle} ${item.obraName} ${item.actorName}`.toLowerCase();
  return hay.includes(q.toLowerCase());
}

export async function fetchRecentMovements(filters: MovementFilters = {}): Promise<MovementDto[]> {
  const sourceTake = 100;

  const [orders, comments, payments, files] = await Promise.all([
    prisma.purchaseOrder.findMany({
      include: { createdBy: true, obra: true },
      orderBy: { createdAt: "desc" },
      take: sourceTake,
    }),
    prisma.orderComment.findMany({
      include: { author: true, order: { include: { obra: true } } },
      orderBy: { createdAt: "desc" },
      take: sourceTake,
    }),
    prisma.paymentRecord.findMany({
      include: { recordedBy: true, order: { include: { obra: true } } },
      orderBy: { createdAt: "desc" },
      take: sourceTake,
    }),
    prisma.storedFile.findMany({
      include: { uploadedBy: true, order: { include: { obra: true } } },
      orderBy: { createdAt: "desc" },
      take: sourceTake,
    }),
  ]);

  const items: MovementDto[] = [];

  for (const o of orders) {
    const role = asRole(o.createdBy.role);
    items.push({
      id: `order-${o.id}`,
      kind: "order_created",
      role,
      actorName: o.createdBy.name,
      description: `Creó ${o.title}`,
      context: `${o.obra.name} · ${o.supplierName}`,
      orderId: o.id,
      orderTitle: o.title,
      obraId: o.obraId,
      obraName: o.obra.name,
      createdAt: o.createdAt.toISOString(),
    });
  }

  for (const c of comments) {
    const role = asRole(c.author.role);
    const kind = c.kind === "approval" ? "approval" : "rejection";
    items.push({
      id: `comment-${c.id}`,
      kind,
      role,
      actorName: c.author.name,
      description:
        kind === "approval"
          ? `Aprobó ${c.order.title}`
          : `Solicitó correcciones en ${c.order.title}`,
      context: c.order.obra.name,
      orderId: c.orderId,
      orderTitle: c.order.title,
      obraId: c.order.obraId,
      obraName: c.order.obra.name,
      createdAt: c.createdAt.toISOString(),
    });
  }

  for (const p of payments) {
    const role = asRole(p.recordedBy.role);
    items.push({
      id: `payment-${p.id}`,
      kind: "payment",
      role,
      actorName: p.recordedBy.name,
      description: `Registró pago por ${formatMoney(p.amount, p.order.currency)}`,
      context: `${p.order.obra.name} · ${p.order.title}`,
      orderId: p.orderId,
      orderTitle: p.order.title,
      obraId: p.order.obraId,
      obraName: p.order.obra.name,
      createdAt: p.createdAt.toISOString(),
    });
  }

  for (const f of files) {
    const role = asRole(f.uploadedBy.role);
    const fileLabel = FILE_KIND_LABEL[f.kind] ?? "Documento";
    items.push({
      id: `file-${f.id}`,
      kind: "file_upload",
      role,
      actorName: f.uploadedBy.name,
      description: `Subió ${fileLabel.toLowerCase()} · ${f.order.title}`,
      context: f.order.obra.name,
      orderId: f.orderId,
      orderTitle: f.order.title,
      obraId: f.order.obraId,
      obraName: f.order.obra.name,
      createdAt: f.createdAt.toISOString(),
    });
  }

  let result = items.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  if (filters.role) {
    result = result.filter((m) => m.role === filters.role);
  }
  if (filters.obraId) {
    result = result.filter((m) => m.obraId === filters.obraId);
  }
  if (filters.orderId) {
    result = result.filter((m) => m.orderId === filters.orderId);
  }
  if (filters.q?.trim()) {
    result = result.filter((m) => matchesQuery(m, filters.q!.trim()));
  }

  if (filters.limit) {
    result = result.slice(0, filters.limit);
  }

  return result;
}

export async function fetchPendingMovements(
  filters: MovementFilters = {}
): Promise<PendingMovementDto[]> {
  const orders = await prisma.purchaseOrder.findMany({
    where: { status: { not: "completed" } },
    include: { obra: true },
    orderBy: { updatedAt: "desc" },
    take: 200,
  });

  let result: PendingMovementDto[] = orders
    .map((o) => {
      const status = asOrderStatus(o.status);
      const roles = getPendingRoles(status);
      if (roles.length === 0) return null;
      return {
        id: `pending-${o.id}`,
        role: roles[0],
        description: describeGate(
          status,
          o.paymentType ? asPaymentType(o.paymentType) : null
        ),
        orderId: o.id,
        orderTitle: o.title,
        obraId: o.obraId,
        obraName: o.obra.name,
        status,
        updatedAt: o.updatedAt.toISOString(),
      };
    })
    .filter((x): x is PendingMovementDto => x !== null);

  if (filters.role) {
    result = result.filter((m) => canRoleAdvance(filters.role!, m.status));
  }
  if (filters.obraId) {
    result = result.filter((m) => m.obraId === filters.obraId);
  }
  if (filters.orderId) {
    result = result.filter((m) => m.orderId === filters.orderId);
  }
  if (filters.q?.trim()) {
    const q = filters.q.trim().toLowerCase();
    result = result.filter((m) => {
      const hay =
        `${m.description} ${m.orderTitle} ${m.obraName} ${formatPendingRoles(m.status)}`.toLowerCase();
      return hay.includes(q);
    });
  }

  if (filters.limit) {
    result = result.slice(0, filters.limit);
  }

  return result;
}
