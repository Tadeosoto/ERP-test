import type { DirectExpenseDto, MaterialRequestDto, PurchaseOrderDto } from "@/lib/domain/types";

export type IngenieroKpiKey = "draftMaterial" | "sentMaterial" | "ocReview" | "directExpense";

export type IngenieroHomeKpiKey =
  | "pendingApproval"
  | "correctionsRequested"
  | "approvedThisMonth"
  | "pendingOver3Days";

function isAssignedToEngineer(order: PurchaseOrderDto, engineerUserId: string): boolean {
  return order.assignedEngineerUserId === engineerUserId || !order.assignedEngineerUserId;
}

function daysSince(iso: string): number {
  const ms = Date.now() - new Date(iso).getTime();
  return Math.max(0, Math.floor(ms / 86_400_000));
}

function isThisMonth(iso: string): boolean {
  const d = new Date(iso);
  const now = new Date();
  return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
}

export function ingenieroKpiCounts(input: {
  materialRequests: MaterialRequestDto[];
  expenses: DirectExpenseDto[];
  orders: PurchaseOrderDto[];
  engineerUserId: string;
}) {
  const mine = input.materialRequests.filter((r) => r.createdByUserId === input.engineerUserId);
  const myExpenses = input.expenses.filter((e) => e.createdByUserId === input.engineerUserId);
  const ocReview = input.orders.filter(
    (o) => o.status === "awaitingEngineer" && isAssignedToEngineer(o, input.engineerUserId)
  );

  return {
    draftMaterial: mine.filter((r) => r.status === "draft").length,
    sentMaterial: mine.filter((r) => r.status === "sent" || r.status === "in_oc_process").length,
    ocReview: ocReview.length,
    directExpense: myExpenses.filter((e) => e.status !== "completed" && e.status !== "draft").length,
  };
}

export function ingenieroHomeKpiCounts(input: {
  orders: PurchaseOrderDto[];
  engineerUserId: string;
}) {
  const assigned = (o: PurchaseOrderDto) => isAssignedToEngineer(o, input.engineerUserId);

  const pendingApproval = input.orders.filter(
    (o) => o.status === "awaitingEngineer" && assigned(o)
  );

  const correctionsRequested = input.orders.filter(
    (o) => o.status === "engineerRejected" && assigned(o)
  );

  const approvedThisMonth = input.orders.filter((o) => {
    if (!assigned(o)) return false;
    const approval = o.comments.find((c) => c.kind === "approval");
    return approval ? isThisMonth(approval.createdAt) : false;
  });

  const pendingOver3Days = pendingApproval.filter((o) => {
    const ref = o.sentToEngineerAt ?? o.createdAt;
    return daysSince(ref) > 3;
  });

  return {
    pendingApproval: pendingApproval.length,
    correctionsRequested: correctionsRequested.length,
    approvedThisMonth: approvedThisMonth.length,
    pendingOver3Days: pendingOver3Days.length,
  };
}

export const INGENIERO_KPI_CONFIG: {
  key: IngenieroKpiKey;
  label: string;
  sublabel: string;
  accent: string;
  iconBg: string;
}[] = [
  {
    key: "draftMaterial",
    label: "Borradores",
    sublabel: "Solicitudes de material sin enviar",
    accent: "bg-white border-l-orange-400",
    iconBg: "bg-orange-100 text-orange-700",
  },
  {
    key: "sentMaterial",
    label: "En Compras",
    sublabel: "Solicitudes enviadas a Paty",
    accent: "bg-white border-l-amber-400",
    iconBg: "bg-amber-100 text-amber-800",
  },
  {
    key: "ocReview",
    label: "OC por revisar",
    sublabel: "PDF pendiente de tu aprobación",
    accent: "bg-white border-l-violet-400",
    iconBg: "bg-violet-100 text-violet-800",
  },
  {
    key: "directExpense",
    label: "Gastos directos",
    sublabel: "Proceso B en curso",
    accent: "bg-white border-l-teal-400",
    iconBg: "bg-teal-100 text-teal-800",
  },
];

export const INGENIERO_HOME_KPI_CONFIG: {
  key: IngenieroHomeKpiKey;
  label: string;
  sublabel: string;
  accent: string;
  iconBg: string;
  icon: "clock" | "x" | "check" | "alert";
}[] = [
  {
    key: "pendingApproval",
    label: "Pendientes de aprobación",
    sublabel: "OC esperando tu revisión",
    accent: "border-l-orange-400 bg-orange-50/35",
    iconBg: "bg-orange-100 text-orange-700",
    icon: "clock",
  },
  {
    key: "correctionsRequested",
    label: "Correcciones solicitadas",
    sublabel: "Devueltas a Compras",
    accent: "border-l-red-400 bg-red-50/30",
    iconBg: "bg-red-100 text-red-700",
    icon: "x",
  },
  {
    key: "approvedThisMonth",
    label: "Aprobadas este mes",
    sublabel: "OC que ya liberaste",
    accent: "border-l-violet-400 bg-violet-50/35",
    iconBg: "bg-violet-100 text-violet-800",
    icon: "check",
  },
  {
    key: "pendingOver3Days",
    label: "Pendientes más de 3 días",
    sublabel: "Requieren atención urgente",
    accent: "border-l-amber-400 bg-amber-50/40",
    iconBg: "bg-amber-100 text-amber-800",
    icon: "alert",
  },
];

export function filterIngenieroPendingOrders(input: {
  orders: PurchaseOrderDto[];
  engineerUserId: string;
  search: string;
  obraId: string;
  supplier: string;
  dateFrom: string;
  dateTo: string;
  estado: string;
}) {
  const assigned = (o: PurchaseOrderDto) => isAssignedToEngineer(o, input.engineerUserId);
  const q = input.search.trim().toLowerCase();

  return input.orders
    .filter((o) => assigned(o))
    .filter((o) => {
      if (input.estado === "awaitingEngineer") return o.status === "awaitingEngineer";
      if (input.estado === "engineerRejected") return o.status === "engineerRejected";
      if (input.estado === "all") return o.status === "awaitingEngineer" || o.status === "engineerRejected";
      return true;
    })
    .filter((o) => (input.obraId === "all" ? true : o.obraId === input.obraId))
    .filter((o) =>
      input.supplier === "all" ? true : o.supplierName.toLowerCase() === input.supplier.toLowerCase()
    )
    .filter((o) => {
      if (!input.dateFrom && !input.dateTo) return true;
      const ref = o.sentToEngineerAt ?? o.createdAt;
      const d = ref.slice(0, 10);
      if (input.dateFrom && d < input.dateFrom) return false;
      if (input.dateTo && d > input.dateTo) return false;
      return true;
    })
    .filter((o) => {
      if (!q) return true;
      const hay = `${o.title} ${o.supplierName} ${o.obraName} ${o.ocFolio} ${o.id}`.toLowerCase();
      return hay.includes(q);
    })
    .sort(
      (a, b) =>
        new Date(b.sentToEngineerAt ?? b.createdAt).getTime() -
        new Date(a.sentToEngineerAt ?? a.createdAt).getTime()
    );
}

export function materialRequestDisplayLabel(request: MaterialRequestDto): string {
  const text = request.materials.trim();
  if (text.length <= 48) return text;
  return `${text.slice(0, 48)}…`;
}

export function materialRequestCode(request: MaterialRequestDto): string {
  const suffix = request.id.replace(/-/g, "").slice(-5).toUpperCase();
  return `SOL-${suffix}`;
}
