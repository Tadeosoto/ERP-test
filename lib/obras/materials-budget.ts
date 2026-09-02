import type { DirectExpenseDto, PurchaseOrderDto } from "@/lib/domain/types";

export type MaterialsBudgetStats = {
  budget: number;
  spent: number;
  remaining: number;
  overAmount: number;
  pct: number;
  isOver: boolean;
  hasBudget: boolean;
};

export function computeMaterialsSpent(
  orders: PurchaseOrderDto[],
  expenses: DirectExpenseDto[],
  obraId: string
): number {
  const orderPaid = orders
    .filter((o) => o.obraId === obraId && o.status !== "draft")
    .reduce((s, o) => s + o.amountPaidSoFar, 0);
  const expensePaid = expenses
    .filter((e) => e.obraId === obraId && e.status !== "draft")
    .reduce((s, e) => s + e.amountPaidSoFar, 0);
  return orderPaid + expensePaid;
}

export function computeMaterialsBudgetStats(budget: number, spent: number): MaterialsBudgetStats {
  const hasBudget = budget > 0;
  const pct = hasBudget ? (spent / budget) * 100 : 0;
  const remaining = hasBudget ? Math.max(0, budget - spent) : 0;
  const overAmount = hasBudget ? Math.max(0, spent - budget) : 0;
  return {
    budget,
    spent,
    remaining,
    overAmount,
    pct,
    isOver: hasBudget && spent > budget,
    hasBudget,
  };
}

export type DonutSegment = {
  key: string;
  label: string;
  pctOfCircle: number;
  color: string;
  textColor: string;
};

/** Segmentos del anillo: pagado, disponible o excedente. */
export function materialsBudgetDonutSegments(stats: MaterialsBudgetStats): DonutSegment[] {
  if (!stats.hasBudget) return [];

  const pct = stats.pct;
  if (pct <= 0) {
    return [
      {
        key: "disponible",
        label: "Disponible",
        pctOfCircle: 100,
        color: "#e4e4e7",
        textColor: "#71717a",
      },
    ];
  }

  if (pct <= 100) {
    return [
      {
        key: "pagado",
        label: "Pagado",
        pctOfCircle: pct,
        color: "#2563eb",
        textColor: "#1d4ed8",
      },
      {
        key: "disponible",
        label: "Disponible",
        pctOfCircle: 100 - pct,
        color: "#e4e4e7",
        textColor: "#71717a",
      },
    ];
  }

  const within = (100 / pct) * 100;
  const over = 100 - within;
  return [
    {
      key: "pagado",
      label: "Dentro del presupuesto",
      pctOfCircle: within,
      color: "#2563eb",
      textColor: "#1d4ed8",
    },
    {
      key: "excedente",
      label: "Excedente",
      pctOfCircle: over,
      color: "#ef4444",
      textColor: "#dc2626",
    },
  ];
}
