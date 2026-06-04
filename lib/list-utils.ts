import { STATUS_LABEL } from "@/lib/domain/labels";
import type { ObraDto, PurchaseOrderDto } from "@/lib/domain/types";

function normalizeQuery(q: string): string {
  return q
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "");
}

export function sortByCreatedAtDesc<T extends { createdAt: string }>(items: T[]): T[] {
  return [...items].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export function filterObras(obras: ObraDto[], query: string): ObraDto[] {
  const q = normalizeQuery(query);
  if (!q) return obras;
  return obras.filter((o) => normalizeQuery(o.name).includes(q));
}

export function filterOrders(orders: PurchaseOrderDto[], query: string): PurchaseOrderDto[] {
  const q = normalizeQuery(query);
  if (!q) return orders;
  return orders.filter((o) => {
    const statusLabel = STATUS_LABEL[o.status] ?? o.status;
    return (
      normalizeQuery(o.title).includes(q) ||
      normalizeQuery(o.supplierName).includes(q) ||
      normalizeQuery(o.obraName).includes(q) ||
      normalizeQuery(o.createdByName).includes(q) ||
      normalizeQuery(statusLabel).includes(q)
    );
  });
}
