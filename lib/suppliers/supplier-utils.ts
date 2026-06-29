import type { PurchaseOrderDto, SupplierDto, SupplierListItemDto } from "@/lib/domain/types";

function normalizeQuery(q: string): string {
  return q
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "");
}

export function supplierDocumentationComplete(s: SupplierDto): boolean {
  return !!(
    s.rfc.trim() &&
    s.email.trim() &&
    s.phone.trim() &&
    s.taxRegime.trim() &&
    s.street.trim()
  );
}

export function supplierPendingApproval(s: SupplierDto): boolean {
  return s.active && !supplierDocumentationComplete(s);
}

export function buildSupplierListItems(
  suppliers: SupplierDto[],
  orders: PurchaseOrderDto[]
): SupplierListItemDto[] {
  const obraNamesBySupplier = new Map<string, Set<string>>();
  const orderCountBySupplier = new Map<string, number>();

  for (const order of orders) {
    if (!order.supplierId) continue;
    orderCountBySupplier.set(order.supplierId, (orderCountBySupplier.get(order.supplierId) ?? 0) + 1);
    const set = obraNamesBySupplier.get(order.supplierId) ?? new Set<string>();
    if (order.obraName.trim()) set.add(order.obraName.trim());
    obraNamesBySupplier.set(order.supplierId, set);
  }

  return suppliers.map((s) => ({
    ...s,
    relatedObras: [...(obraNamesBySupplier.get(s.id) ?? [])].sort((a, b) => a.localeCompare(b, "es")),
    orderCount: orderCountBySupplier.get(s.id) ?? 0,
    documentationComplete: supplierDocumentationComplete(s),
  }));
}

export function filterSuppliers(items: SupplierListItemDto[], query: string): SupplierListItemDto[] {
  const q = normalizeQuery(query);
  if (!q) return items;
  return items.filter((s) => {
    const obraText = s.relatedObras.join(" ");
    return (
      normalizeQuery(s.displayName).includes(q) ||
      normalizeQuery(s.legalName).includes(q) ||
      normalizeQuery(s.commercialName).includes(q) ||
      normalizeQuery(s.rfc).includes(q) ||
      normalizeQuery(s.email).includes(q) ||
      normalizeQuery(s.phone).includes(q) ||
      normalizeQuery(obraText).includes(q)
    );
  });
}

export type SupplierKpiCounts = {
  activos: number;
  inactivos: number;
  porAprobar: number;
  documentacionCompleta: number;
};

export function supplierKpiCounts(items: SupplierListItemDto[]): SupplierKpiCounts {
  let activos = 0;
  let inactivos = 0;
  let porAprobar = 0;
  let documentacionCompleta = 0;

  for (const s of items) {
    if (s.active) activos += 1;
    else inactivos += 1;
    if (supplierPendingApproval(s)) porAprobar += 1;
    if (s.documentationComplete) documentacionCompleta += 1;
  }

  return { activos, inactivos, porAprobar, documentacionCompleta };
}

export function paginateItems<T>(items: T[], page: number, pageSize: number): T[] {
  const start = (page - 1) * pageSize;
  return items.slice(start, start + pageSize);
}

export function totalPages(count: number, pageSize: number): number {
  return Math.max(1, Math.ceil(count / pageSize));
}
