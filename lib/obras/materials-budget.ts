import type { DirectExpenseDto, PurchaseOrderDto } from "@/lib/domain/types";
import { paymentBasisTotal } from "@/lib/domain/order-fx";

export type MaterialsBudgetStats = {
  budget: number;
  spent: number;
  remaining: number;
  overAmount: number;
  pct: number;
  isOver: boolean;
  hasBudget: boolean;
};

export type SupplierSpendSlice = {
  key: string;
  supplierName: string;
  amount: number;
  pct: number;
  color: string;
};

const SUPPLIER_COLORS = [
  "#2563eb",
  "#f59e0b",
  "#10b981",
  "#8b5cf6",
  "#ef4444",
  "#06b6d4",
  "#f97316",
  "#64748b",
];

/** Compra de material por proveedor en una obra (OC no borrador, montos en MXN). */
export function computeSupplierSpendByObra(
  orders: PurchaseOrderDto[],
  obraId: string,
  maxSlices = 6
): { slices: SupplierSpendSlice[]; total: number } {
  const totals = new Map<string, number>();
  for (const order of orders) {
    if (order.obraId !== obraId || order.status === "draft") continue;
    const amount = paymentBasisTotal(order);
    if (amount <= 0) continue;
    const name = order.supplierName.trim() || "Sin proveedor";
    totals.set(name, (totals.get(name) ?? 0) + amount);
  }

  const ranked = [...totals.entries()]
    .map(([supplierName, amount]) => ({ supplierName, amount }))
    .sort((a, b) => b.amount - a.amount);

  const total = ranked.reduce((sum, row) => sum + row.amount, 0);
  if (total <= 0) return { slices: [], total: 0 };

  const head = ranked.slice(0, Math.max(1, maxSlices - 1));
  const tail = ranked.slice(Math.max(1, maxSlices - 1));
  const rows =
    tail.length > 1
      ? [
          ...head,
          {
            supplierName: "Otros",
            amount: tail.reduce((sum, row) => sum + row.amount, 0),
          },
        ]
      : ranked.slice(0, maxSlices);

  const slices = rows.map((row, index) => ({
    key: `${row.supplierName}-${index}`,
    supplierName: row.supplierName,
    amount: row.amount,
    pct: (row.amount / total) * 100,
    color: SUPPLIER_COLORS[index % SUPPLIER_COLORS.length],
  }));

  return { slices, total };
}

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

/** Segmentos del anillo: pagado, margen restante o pérdida por excedente. */
export function materialsBudgetDonutSegments(stats: MaterialsBudgetStats): DonutSegment[] {
  if (!stats.hasBudget) return [];

  const pct = stats.pct;
  if (pct <= 0) {
    return [
      {
        key: "margen",
        label: "Margen",
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
        key: "margen",
        label: "Margen",
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
      label: "Dentro del límite",
      pctOfCircle: within,
      color: "#2563eb",
      textColor: "#1d4ed8",
    },
    {
      key: "excedente",
      label: "Pérdida",
      pctOfCircle: over,
      color: "#ef4444",
      textColor: "#dc2626",
    },
  ];
}
