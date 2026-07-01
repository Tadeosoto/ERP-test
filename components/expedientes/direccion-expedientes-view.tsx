"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ExpedienteDetailDrawer } from "@/components/expedientes/expediente-detail-drawer";
import { OrderActionMenu } from "@/components/obras/order-action-menu";
import { OcLink } from "@/components/ui/oc-link";
import { LoadingScreen } from "@/components/ui/loading-screen";
import { useSession } from "@/components/session-provider";
import {
  applyExpedienteFilters,
  EXPEDIENTE_ESTATUS_LABEL,
  EXPEDIENTE_ESTATUS_OPTIONS,
  EXPEDIENTE_ESTATUS_TONE,
  EXPEDIENTE_TABS,
  expedienteEstatus,
  expedienteKpis,
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

const EMPTY_FILTERS: ExpedienteFilters = {
  obraId: "",
  supplier: "",
  estatus: "",
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

function SummaryKpi({
  label,
  value,
  accent,
  iconBg,
  onClick,
}: {
  label: string;
  value: number;
  accent: string;
  iconBg: string;
  onClick?: () => void;
}) {
  const inner = (
    <>
      <div className="flex items-start justify-between gap-2">
        <span className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${iconBg}`}>
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
            />
          </svg>
        </span>
        <span className="text-2xl font-bold tabular-nums text-zinc-900">{value}</span>
      </div>
      <p className="mt-2 text-xs font-semibold text-zinc-800">{label}</p>
      <p className="mt-0.5 text-[11px] font-medium text-violet-700">Ver todos →</p>
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`w-full rounded-2xl border border-zinc-200/80 border-l-4 p-4 text-left shadow-sm transition hover:shadow-md ${accent}`}
      >
        {inner}
      </button>
    );
  }

  return (
    <div className={`rounded-2xl border border-zinc-200/80 border-l-4 p-4 shadow-sm ${accent}`}>{inner}</div>
  );
}

export function DireccionExpedientesView({ onRegisterRefresh }: { onRegisterRefresh?: (fn: () => void) => void }) {
  const { user } = useSession();
  const [orders, setOrders] = useState<PurchaseOrderDto[]>([]);
  const [obras, setObras] = useState<ObraDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<ExpedienteTab>("todos");
  const [filters, setFilters] = useState<ExpedienteFilters>(EMPTY_FILTERS);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<(typeof PAGE_SIZE_OPTIONS)[number]>(15);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [oRes, ordRes] = await Promise.all([
      fetch("/api/obras", { credentials: "include" }),
      fetch("/api/orders", { credentials: "include" }),
    ]);
    if (oRes.ok) {
      const d = (await oRes.json()) as { obras: ObraDto[] };
      setObras(d.obras);
    }
    if (ordRes.ok) {
      const d = (await ordRes.json()) as { orders: PurchaseOrderDto[] };
      setOrders(d.orders);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
    onRegisterRefresh?.(() => void load());
  }, [load, onRegisterRefresh]);

  const showAdminActions = user?.role === "pagos";

  const handleOrderDeleted = useCallback(() => {
    setSelectedId(null);
    void load();
  }, [load]);

  const kpis = useMemo(() => expedienteKpis(orders), [orders]);
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
  const selectedOrder = useMemo(
    () => (selectedId ? orders.find((o) => o.id === selectedId) ?? null : null),
    [orders, selectedId]
  );

  const tabCounts = useMemo(
    () => ({
      todos: kpis.total,
      completos: kpis.completos,
      en_proceso: kpis.enProceso,
      atencion: kpis.atencion,
    }),
    [kpis]
  );

  useEffect(() => {
    setPage(1);
  }, [tab, filters, pageSize]);

  useEffect(() => {
    if (page > pages) setPage(pages);
  }, [page, pages]);

  function setFilter<K extends keyof ExpedienteFilters>(key: K, value: ExpedienteFilters[K]) {
    setFilters((f) => ({ ...f, [key]: value }));
  }

  if (loading) return <LoadingScreen message="Cargando expedientes" />;

  const rangeStart = sorted.length === 0 ? 0 : (page - 1) * pageSize + 1;
  const rangeEnd = Math.min(page * pageSize, sorted.length);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 sm:text-3xl">Expedientes</h1>
        <p className="mt-1 text-sm text-zinc-600">
          Consulta el estatus documental y el historial de cada orden de compra.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <SummaryKpi
          label="Total expedientes"
          value={kpis.total}
          accent="border-l-violet-400 bg-violet-50/35"
          iconBg="bg-violet-100 text-violet-800"
          onClick={() => setTab("todos")}
        />
        <SummaryKpi
          label="Expedientes completos"
          value={kpis.completos}
          accent="border-l-emerald-400 bg-emerald-50/35"
          iconBg="bg-emerald-100 text-emerald-800"
          onClick={() => setTab("completos")}
        />
        <SummaryKpi
          label="En proceso / Parciales"
          value={kpis.enProceso}
          accent="border-l-orange-400 bg-orange-50/40"
          iconBg="bg-orange-100 text-orange-700"
          onClick={() => setTab("en_proceso")}
        />
        <SummaryKpi
          label="Requieren atención"
          value={kpis.atencion}
          accent="border-l-red-400 bg-red-50/40"
          iconBg="bg-red-100 text-red-800"
          onClick={() => setTab("atencion")}
        />
      </div>

      <div className="flex flex-col gap-4 xl:flex-row xl:items-start">
        <div className="min-w-0 flex-1">
          <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
            <div className="flex flex-wrap gap-1 border-b border-zinc-100 px-3 pt-3">
              {EXPEDIENTE_TABS.map((t) => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setTab(t.key)}
                  className={`rounded-t-lg px-3 py-2 text-xs font-semibold sm:text-sm ${
                    tab === t.key
                      ? "bg-violet-100 text-violet-900"
                      : "text-zinc-600 hover:bg-zinc-50"
                  }`}
                >
                  {t.label} ({tabCounts[t.key]})
                </button>
              ))}
            </div>

            <div className="space-y-3 border-b border-zinc-100 bg-zinc-50/50 px-4 py-3">
              <div className="flex flex-wrap items-end gap-3">
                <label className="block min-w-[7rem] flex-1 text-xs">
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
                <label className="block min-w-[7rem] flex-1 text-xs">
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
                <label className="block min-w-[7rem] flex-1 text-xs">
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
                <label className="block text-xs">
                  <span className="font-medium text-zinc-600">Fecha — Desde</span>
                  <input
                    type="date"
                    value={filters.dateFrom}
                    onChange={(e) => setFilter("dateFrom", e.target.value)}
                    className="mt-1 block rounded-lg border border-zinc-200 bg-white px-2 py-2 text-sm"
                  />
                </label>
                <label className="block text-xs">
                  <span className="font-medium text-zinc-600">Hasta</span>
                  <input
                    type="date"
                    value={filters.dateTo}
                    onChange={(e) => setFilter("dateTo", e.target.value)}
                    className="mt-1 block rounded-lg border border-zinc-200 bg-white px-2 py-2 text-sm"
                  />
                </label>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative min-w-[12rem] flex-1">
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
                    className="block w-full rounded-xl border border-zinc-200 bg-white py-2.5 pl-9 pr-3 text-sm"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setFilters(EMPTY_FILTERS)}
                  className="btn-ghost text-sm"
                >
                  Limpiar filtros
                </button>
                <button
                  type="button"
                  onClick={() => exportExpedientesCsv(sorted)}
                  className="btn-secondary text-sm"
                >
                  Exportar
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-zinc-50/80 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                  <tr>
                    <th className="px-4 py-2.5">Folio OC</th>
                    <th className="px-4 py-2.5">Proveedor</th>
                    <th className="px-4 py-2.5">Obra</th>
                    <th className="px-4 py-2.5 text-right">Monto total</th>
                    <th className="px-4 py-2.5 text-right">Pagado</th>
                    <th className="px-4 py-2.5 text-right">Saldo pendiente</th>
                    <th className="px-4 py-2.5">Estatus</th>
                    <th className="px-4 py-2.5">Última actividad</th>
                    {showAdminActions && <th className="px-4 py-2.5 text-right">Acción</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {pageItems.length === 0 ? (
                    <tr>
                      <td colSpan={showAdminActions ? 9 : 8} className="px-4 py-12 text-center text-zinc-500">
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
                          onClick={() => setSelectedId(order.id)}
                          className={`cursor-pointer transition hover:bg-violet-50/40 ${
                            selected ? "bg-violet-50/70 ring-1 ring-inset ring-violet-200" : ""
                          }`}
                        >
                          <td className="px-4 py-2.5" onClick={(e) => e.stopPropagation()}>
                            <OcLink order={order} showPdfIcon className="text-sm" />
                          </td>
                          <td className="max-w-[9rem] truncate px-4 py-2.5 text-zinc-700">
                            {order.supplierName}
                          </td>
                          <td className="max-w-[8rem] truncate px-4 py-2.5 font-medium text-sky-800">
                            {order.obraName}
                          </td>
                          <td className="px-4 py-2.5 text-right tabular-nums text-zinc-700">
                            {formatMoney(order.totalAmount, order.currency)}
                          </td>
                          <td className="px-4 py-2.5 text-right tabular-nums text-emerald-700">
                            {formatMoney(order.amountPaidSoFar, order.currency)}
                          </td>
                          <td className="px-4 py-2.5 text-right tabular-nums text-orange-700">
                            {formatMoney(order.amountRemaining, order.currency)}
                          </td>
                          <td className="px-4 py-2.5">
                            <ExpedienteStatusBadge order={order} />
                          </td>
                          <td className="px-4 py-2.5">
                            <span className="block text-xs font-medium tabular-nums text-zinc-700">
                              {formatDateShort(act.at)}
                            </span>
                            <span className="block max-w-[10rem] truncate text-[11px] text-zinc-500">
                              {act.message}
                            </span>
                          </td>
                          {showAdminActions && (
                            <td className="px-4 py-2.5 text-right" onClick={(e) => e.stopPropagation()}>
                              <OrderActionMenu
                                order={order}
                                onOrderMutated={handleOrderDeleted}
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

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-zinc-100 px-4 py-3 text-sm text-zinc-600">
              <p>
                Mostrando {rangeStart} a {rangeEnd} de {sorted.length} expediente
                {sorted.length === 1 ? "" : "s"}
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <label className="flex items-center gap-2 text-xs">
                  Filas
                  <select
                    value={pageSize}
                    onChange={(e) =>
                      setPageSize(Number(e.target.value) as (typeof PAGE_SIZE_OPTIONS)[number])
                    }
                    className="rounded-lg border border-zinc-200 px-2 py-1.5 text-sm"
                  >
                    {PAGE_SIZE_OPTIONS.map((n) => (
                      <option key={n} value={n}>
                        {n} por página
                      </option>
                    ))}
                  </select>
                </label>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => p - 1)}
                    className="rounded-lg border border-zinc-200 px-3 py-1.5 text-sm disabled:opacity-40"
                  >
                    Anterior
                  </button>
                  <span className="px-2 tabular-nums">
                    {page} / {pages}
                  </span>
                  <button
                    type="button"
                    disabled={page >= pages}
                    onClick={() => setPage((p) => p + 1)}
                    className="rounded-lg border border-zinc-200 px-3 py-1.5 text-sm disabled:opacity-40"
                  >
                    Siguiente
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {selectedOrder && (
          <ExpedienteDetailDrawer order={selectedOrder} onClose={() => setSelectedId(null)} />
        )}
      </div>
    </div>
  );
}
