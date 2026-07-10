"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { OrderActionMenu } from "@/components/obras/order-action-menu";
import { OcLink } from "@/components/ui/oc-link";
import {
  applyExpedienteFilters,
  EXPEDIENTE_AREA_OPTIONS,
  EXPEDIENTE_ESTATUS_LABEL,
  EXPEDIENTE_ESTATUS_OPTIONS,
  EXPEDIENTE_ESTATUS_TONE,
  EXPEDIENTE_TABS,
  expedienteAttentionAreaLabel,
  expedienteEstatus,
  exportExpedientesCsv,
  filterByExpedienteTab,
  lastActivity,
  paginateItems,
  totalPages,
  uniqueExpedienteSuppliers,
  type ExpedienteFilters,
  type ExpedienteTab,
} from "@/lib/dashboard/direccion-expedientes";
import type { ObraDto, PurchaseOrderDto } from "@/lib/domain/types";
import { formatDateShort, formatMoney } from "@/lib/format";

const PAGE_SIZE_OPTIONS = [8, 15, 25, 50] as const;

export const EMPTY_EXPEDIENTE_FILTERS: ExpedienteFilters = {
  obraId: "",
  supplier: "",
  estatus: "",
  area: "",
  dateFrom: "",
  dateTo: "",
  search: "",
};

function ExpedienteStatusBadge({ order }: { order: PurchaseOrderDto }) {
  const key = expedienteEstatus(order);
  return (
    <span
      className={`inline-flex max-w-full items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset ${EXPEDIENTE_ESTATUS_TONE[key]}`}
    >
      {EXPEDIENTE_ESTATUS_LABEL[key]}
    </span>
  );
}

export function DireccionExpedientesPanel({
  orders,
  obras,
  defaultTab = "todos",
  compact = false,
  showExport = true,
  showAdminActions = false,
  onOrderMutated,
  selectedId,
  onSelectOrder,
  tabCounts,
}: {
  orders: PurchaseOrderDto[];
  obras: ObraDto[];
  defaultTab?: ExpedienteTab;
  compact?: boolean;
  showExport?: boolean;
  showAdminActions?: boolean;
  onOrderMutated?: () => void;
  selectedId?: string | null;
  onSelectOrder?: (id: string) => void;
  tabCounts?: Record<ExpedienteTab, number>;
}) {
  const [tab, setTab] = useState<ExpedienteTab>(defaultTab);
  const [filters, setFilters] = useState<ExpedienteFilters>(EMPTY_EXPEDIENTE_FILTERS);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<(typeof PAGE_SIZE_OPTIONS)[number]>(compact ? 8 : 15);

  const suppliers = useMemo(() => uniqueExpedienteSuppliers(orders), [orders]);
  const tabbed = useMemo(() => filterByExpedienteTab(orders, tab), [orders, tab]);
  const filtered = useMemo(() => applyExpedienteFilters(tabbed, filters), [tabbed, filters]);
  const sorted = useMemo(
    () =>
      [...filtered].sort(
        (a, b) => new Date(lastActivity(b).at).getTime() - new Date(lastActivity(a).at).getTime()
      ),
    [filtered]
  );

  const pages = useMemo(() => totalPages(sorted.length, pageSize), [sorted.length, pageSize]);
  const pageItems = useMemo(() => paginateItems(sorted, page, pageSize), [sorted, page, pageSize]);

  const counts = tabCounts ?? {
    todos: filterByExpedienteTab(orders, "todos").length,
    completos: filterByExpedienteTab(orders, "completos").length,
    en_proceso: filterByExpedienteTab(orders, "en_proceso").length,
    atencion: filterByExpedienteTab(orders, "atencion").length,
  };

  useEffect(() => {
    setPage(1);
  }, [tab, filters, pageSize]);

  useEffect(() => {
    if (page > pages) setPage(pages);
  }, [page, pages]);

  function setFilter<K extends keyof ExpedienteFilters>(key: K, value: ExpedienteFilters[K]) {
    setFilters((f) => ({ ...f, [key]: value }));
  }

  const showAreaColumn = tab === "atencion" || Boolean(filters.area);
  const rangeStart = sorted.length === 0 ? 0 : (page - 1) * pageSize + 1;
  const rangeEnd = Math.min(page * pageSize, sorted.length);

  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-100 px-3 py-2.5 sm:px-4">
        <h2 className="text-sm font-bold text-zinc-900 sm:text-base">Expedientes</h2>
        {compact && (
          <Link href="/expedientes" className="text-xs font-semibold text-violet-700 hover:underline">
            Ver módulo completo →
          </Link>
        )}
      </div>

      <div className="flex flex-wrap gap-1 border-b border-zinc-100 px-3 pt-2">
        {EXPEDIENTE_TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`rounded-t-lg px-3 py-2 text-xs font-semibold sm:text-sm ${
              tab === t.key ? "bg-violet-100 text-violet-900" : "text-zinc-600 hover:bg-zinc-50"
            }`}
          >
            {t.label} ({counts[t.key]})
          </button>
        ))}
      </div>

      <div className="space-y-3 border-b border-zinc-100 bg-zinc-50/50 px-3 py-3 sm:px-4">
        <div className="flex flex-wrap items-end gap-2 sm:gap-3">
          <label className="block min-w-[6.5rem] flex-1 text-xs">
            <span className="font-medium text-zinc-600">Obra</span>
            <select
              value={filters.obraId}
              onChange={(e) => setFilter("obraId", e.target.value)}
              className="mt-1 block w-full rounded-lg border border-zinc-200 bg-white px-2 py-2 text-sm"
            >
              <option value="">Todas</option>
              {obras.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block min-w-[6.5rem] flex-1 text-xs">
            <span className="font-medium text-zinc-600">Proveedor</span>
            <select
              value={filters.supplier}
              onChange={(e) => setFilter("supplier", e.target.value)}
              className="mt-1 block w-full rounded-lg border border-zinc-200 bg-white px-2 py-2 text-sm"
            >
              <option value="">Todos</option>
              {suppliers.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
          <label className="block min-w-[6.5rem] flex-1 text-xs">
            <span className="font-medium text-zinc-600">Estatus</span>
            <select
              value={filters.estatus}
              onChange={(e) => setFilter("estatus", e.target.value)}
              className="mt-1 block w-full rounded-lg border border-zinc-200 bg-white px-2 py-2 text-sm"
            >
              {EXPEDIENTE_ESTATUS_OPTIONS.map((o) => (
                <option key={o.value || "all"} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          {(tab === "atencion" || filters.area) && (
            <label className="block min-w-[6.5rem] flex-1 text-xs">
              <span className="font-medium text-zinc-600">Área pendiente</span>
              <select
                value={filters.area}
                onChange={(e) => setFilter("area", e.target.value)}
                className="mt-1 block w-full rounded-lg border border-zinc-200 bg-white px-2 py-2 text-sm"
              >
                {EXPEDIENTE_AREA_OPTIONS.map((o) => (
                  <option key={o.value || "all"} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[10rem] flex-1">
            <svg
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              type="search"
              value={filters.search}
              onChange={(e) => setFilter("search", e.target.value)}
              placeholder="Buscar expediente, OC o proveedor..."
              className="block w-full rounded-xl border border-zinc-200 bg-white py-2 pl-9 pr-3 text-sm"
            />
          </div>
          <button type="button" onClick={() => setFilters(EMPTY_EXPEDIENTE_FILTERS)} className="btn-ghost text-sm">
            Limpiar
          </button>
          {showExport && (
            <button type="button" onClick={() => exportExpedientesCsv(sorted)} className="btn-secondary text-sm">
              Exportar
            </button>
          )}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-zinc-50/80 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
            <tr>
              <th className="px-3 py-2.5 sm:px-4">Folio OC</th>
              <th className="px-3 py-2.5 sm:px-4">Proveedor</th>
              <th className="px-3 py-2.5 sm:px-4">Obra</th>
              {showAreaColumn && <th className="px-3 py-2.5 sm:px-4">Área pendiente</th>}
              <th className="px-3 py-2.5 text-right sm:px-4">Total</th>
              <th className="px-3 py-2.5 text-right sm:px-4">Pagado</th>
              <th className="px-3 py-2.5 text-right sm:px-4">Saldo</th>
              <th className="px-3 py-2.5 sm:px-4">Estatus</th>
              <th className="px-3 py-2.5 sm:px-4">Última actividad</th>
              {showAdminActions && <th className="px-3 py-2.5 text-right sm:px-4">Acción</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {pageItems.length === 0 ? (
              <tr>
                <td
                  colSpan={(showAdminActions ? 9 : 8) + (showAreaColumn ? 1 : 0)}
                  className="px-4 py-10 text-center text-zinc-500"
                >
                  No hay expedientes que coincidan con los filtros.
                </td>
              </tr>
            ) : (
              pageItems.map((order) => {
                const act = lastActivity(order);
                const selected = selectedId === order.id;
                return (
                  <tr
                    key={order.id}
                    onClick={() => onSelectOrder?.(order.id)}
                    className={`${onSelectOrder ? "cursor-pointer" : ""} transition hover:bg-violet-50/40 ${
                      selected ? "bg-violet-50/70 ring-1 ring-inset ring-violet-200" : ""
                    }`}
                  >
                    <td className="px-3 py-2.5 sm:px-4" onClick={(e) => e.stopPropagation()}>
                      <OcLink order={order} showPdfIcon className="text-sm" />
                    </td>
                    <td className="max-w-[8rem] truncate px-3 py-2.5 text-zinc-700 sm:px-4">{order.supplierName}</td>
                    <td className="max-w-[7rem] truncate px-3 py-2.5 font-medium text-sky-800 sm:px-4">
                      {order.obraName}
                    </td>
                    {showAreaColumn && (
                      <td className="px-3 py-2.5 text-xs font-semibold text-violet-900 sm:px-4">
                        {expedienteAttentionAreaLabel(order)}
                      </td>
                    )}
                    <td className="px-3 py-2.5 text-right tabular-nums sm:px-4">
                      {formatMoney(order.totalAmount, order.currency)}
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-emerald-700 sm:px-4">
                      {formatMoney(order.amountPaidSoFar, order.currency)}
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-orange-700 sm:px-4">
                      {formatMoney(order.amountRemaining, order.currency)}
                    </td>
                    <td className="px-3 py-2.5 sm:px-4">
                      <ExpedienteStatusBadge order={order} />
                    </td>
                    <td className="px-3 py-2.5 sm:px-4">
                      <span className="block text-xs font-medium tabular-nums text-zinc-700">
                        {formatDateShort(act.at)}
                      </span>
                      <span className="block max-w-[9rem] truncate text-[11px] text-zinc-500">{act.message}</span>
                    </td>
                    {showAdminActions && (
                      <td className="px-3 py-2.5 text-right sm:px-4" onClick={(e) => e.stopPropagation()}>
                        <OrderActionMenu
                          order={order}
                          onOrderMutated={onOrderMutated}
                          primaryLabel="Ver"
                          appearance="neutral"
                        />
                      </td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-zinc-100 px-3 py-2.5 text-xs text-zinc-600 sm:px-4 sm:text-sm">
        <p>
          {rangeStart}–{rangeEnd} de {sorted.length}
        </p>
        <div className="flex items-center gap-2">
          {!compact && (
            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value) as (typeof PAGE_SIZE_OPTIONS)[number])}
              className="rounded-lg border border-zinc-200 px-2 py-1 text-sm"
            >
              {PAGE_SIZE_OPTIONS.map((n) => (
                <option key={n} value={n}>
                  {n} / pág.
                </option>
              ))}
            </select>
          )}
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            className="rounded-lg border border-zinc-200 px-2.5 py-1 disabled:opacity-40"
          >
            ←
          </button>
          <span className="tabular-nums">
            {page}/{pages}
          </span>
          <button
            type="button"
            disabled={page >= pages}
            onClick={() => setPage((p) => p + 1)}
            className="rounded-lg border border-zinc-200 px-2.5 py-1 disabled:opacity-40"
          >
            →
          </button>
        </div>
      </div>
    </div>
  );
}
