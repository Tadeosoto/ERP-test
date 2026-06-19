import type { DirectExpenseDto, MaterialRequestDto, PurchaseOrderDto } from "@/lib/domain/types";

export type IngenieroKpiKey = "draftMaterial" | "sentMaterial" | "ocReview" | "directExpense";

export function ingenieroKpiCounts(input: {
  materialRequests: MaterialRequestDto[];
  expenses: DirectExpenseDto[];
  orders: PurchaseOrderDto[];
  engineerUserId: string;
}) {
  const mine = input.materialRequests.filter((r) => r.createdByUserId === input.engineerUserId);
  const myExpenses = input.expenses.filter((e) => e.createdByUserId === input.engineerUserId);
  const ocReview = input.orders.filter(
    (o) =>
      o.status === "awaitingEngineer" &&
      (o.assignedEngineerUserId === input.engineerUserId || !o.assignedEngineerUserId)
  );

  return {
    draftMaterial: mine.filter((r) => r.status === "draft").length,
    sentMaterial: mine.filter((r) => r.status === "sent" || r.status === "in_oc_process").length,
    ocReview: ocReview.length,
    directExpense: myExpenses.filter((e) => e.status !== "completed" && e.status !== "draft").length,
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
