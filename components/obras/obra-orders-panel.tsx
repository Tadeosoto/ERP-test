"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CompactProcessTimeline, ProcessTimelineLegend } from "@/components/obras/compact-process-timeline";
import { OrderActionMenu } from "@/components/obras/order-action-menu";
import { OcLink } from "@/components/ui/oc-link";
import { SystemStatusBadge } from "@/components/ui/system-status-badge";
import {
  COMPRAS_ESTADO_OPTIONS,
} from "@/lib/dashboard/compras-dashboard";
import {
  filterObraOrders,
  orderAwaitingActionLabel,
  orderPaymentInvoiceCounts,
  RESPONSABLE_FILTER_OPTIONS,
  type ComprasOrderTab,
} from "@/lib/dashboard/obra-order-table";
import type { PurchaseOrderDto } from "@/lib/domain/types";
import { formatDateShort, formatMoney } from "@/lib/format";

const PAGE_SIZES = [15, 25, 50] as const;

export function ObraOrdersPanel({
  orders,
  onOrderMutated,
}: {
  orders: PurchaseOrderDto[];
  onOrderMutated?: () => void;
}) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [estadoTab, setEstadoTab] = useState<ComprasOrderTab>("all");
  const [responsableRole, setResponsableRole] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<(typeof PAGE_SIZES)[number]>(15);

  const filtered = useMemo(
    () =>
      filterObraOrders({
        orders,
        search,
        estadoTab,
        responsableRole,
        dateFrom,
        dateTo,
      }),
    [orders, search, estadoTab, responsableRole, dateFrom, dateTo]
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageStart = (safePage - 1) * pageSize;
  const pageItems = filtered.slice(pageStart, pageStart + pageSize);

  function clearFilters() {
    setSearch("");
    setEstadoTab("all");
    setResponsableRole("all");
    setDateFrom("");
    setDateTo("");
    setPage(1);
  }

  const th =
    "px-2 py-2 text-[9px] font-semibold uppercase leading-tight tracking-wide text-zinc-500 whitespace-nowrap";

  return (
    <section className="card">
      <div className="border-b border-orange-50 px-4 py-4 sm:px-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-bold text-zinc-900">Órdenes de compra de esta obra</h2>
          <p className="text-xs text-zinc-500">{filtered.length} orden{filtered.length === 1 ? "" : "es"}</p>
        </div>

        <div className="mt-3 space-y-2">
          <div className="relative">
            <input
              type="search"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Buscar por folio, proveedor o estado…"
              className="h-9 w-full rounded-lg border border-zinc-200 bg-white py-2 pl-3 pr-10 text-xs shadow-sm placeholder:text-zinc-400 focus:border-orange-300 focus:outline-none focus:ring-1 focus:ring-orange-200"
            />
            <svg
              className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>

          <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
            <select
              value={estadoTab}
              onChange={(e) => {
                setEstadoTab(e.target.value as ComprasOrderTab);
                setPage(1);
              }}
              className="h-9 rounded-lg border border-zinc-200 bg-white px-2 text-xs font-medium shadow-sm"
            >
              {COMPRAS_ESTADO_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <select
              value={responsableRole}
              onChange={(e) => {
                setResponsableRole(e.target.value);
                setPage(1);
              }}
              className="h-9 rounded-lg border border-zinc-200 bg-white px-2 text-xs font-medium shadow-sm"
            >
              {RESPONSABLE_FILTER_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <div className="col-span-2 flex h-9 items-center gap-1 rounded-lg border border-zinc-200 bg-white px-2 shadow-sm lg:col-span-1">
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => {
                  setDateFrom(e.target.value);
                  setPage(1);
                }}
                className="min-w-0 flex-1 border-0 bg-transparent text-[11px] focus:outline-none"
                aria-label="Desde"
              />
              <span className="text-zinc-400">–</span>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => {
                  setDateTo(e.target.value);
                  setPage(1);
                }}
                className="min-w-0 flex-1 border-0 bg-transparent text-[11px] focus:outline-none"
                aria-label="Hasta"
              />
            </div>
            <button
              type="button"
              onClick={clearFilters}
              className="h-9 rounded-lg border border-zinc-200 bg-white text-xs font-medium text-zinc-700 shadow-sm hover:bg-zinc-50"
            >
              Limpiar filtros
            </button>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[1100px] border-collapse text-left">
          <thead className="bg-orange-50/90">
            <tr className="border-b border-orange-100">
              <th className={th}>Folio OC</th>
              <th className={th}>Proveedor</th>
              <th className={`${th} text-right`}>Monto</th>
              <th className={th}>Estado actual</th>
              <th className={th}>Esperando acción de</th>
              <th className={th}>Progreso del proceso</th>
              <th className={`${th} text-center`}>Pagos &amp; facturas</th>
              <th className={th}>Creada</th>
              <th className={`${th} text-right`}>Acción</th>
            </tr>
          </thead>
          <tbody>
            {pageItems.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-12 text-center text-sm text-zinc-500">
                  No hay órdenes con estos filtros.
                </td>
              </tr>
            ) : (
              pageItems.map((order, i) => {
                const counts = orderPaymentInvoiceCounts(order);
                return (
                  <tr
                    key={order.id}
                    onClick={() => router.push(`/ordenes/${order.id}`)}
                    className={`cursor-pointer border-b border-orange-50/80 transition hover:bg-orange-50/50 ${
                      i % 2 === 1 ? "bg-zinc-50/40" : "bg-white"
                    }`}
                  >
                    <td className="px-2 py-2.5 align-middle" onClick={(e) => e.stopPropagation()}>
                      <OcLink order={order} showPdfIcon />
                      <p className="text-[10px] text-zinc-400">{formatDateShort(order.createdAt)}</p>
                    </td>
                    <td className="max-w-[8rem] px-2 py-2.5 align-middle">
                      <p className="truncate text-xs font-medium text-zinc-800" title={order.supplierName}>
                        {order.supplierName.split(" ")[0]}
                      </p>
                      <p className="truncate text-[10px] text-zinc-500" title={order.supplierName}>
                        {order.supplierName}
                      </p>
                    </td>
                    <td className="px-2 py-2.5 text-right align-middle text-xs font-semibold tabular-nums text-zinc-900">
                      {formatMoney(order.totalAmount, order.currency)}
                    </td>
                    <td className="px-2 py-2.5 align-middle">
                      <SystemStatusBadge status={order.status} size="xs" />
                    </td>
                    <td className="max-w-[9rem] px-2 py-2.5 align-middle text-[11px] leading-snug text-zinc-700">
                      {orderAwaitingActionLabel(order)}
                    </td>
                    <td className="px-2 py-2.5 align-middle" onClick={(e) => e.stopPropagation()}>
                      <CompactProcessTimeline status={order.status} />
                    </td>
                    <td className="px-2 py-2.5 align-middle text-center text-[11px]">
                      <p>
                        <span className={counts.paymentsDone >= 1 ? "font-bold text-emerald-700" : "font-bold text-red-600"}>
                          {counts.paymentsDone}/{counts.paymentsTotal}
                        </span>{" "}
                        <span className="text-zinc-500">Pagos</span>
                      </p>
                      <p className="mt-0.5">
                        <span className={counts.invoicesDone >= 1 ? "font-bold text-violet-700" : "font-bold text-red-600"}>
                          {counts.invoicesDone}/{counts.invoicesTotal}
                        </span>{" "}
                        <span className="text-zinc-500">Facturas</span>
                      </p>
                    </td>
                    <td className="px-2 py-2.5 align-middle text-[11px] tabular-nums text-zinc-600 whitespace-nowrap">
                      {formatDateShort(order.createdAt)}
                    </td>
                    <td className="px-2 py-2.5 align-middle text-right" onClick={(e) => e.stopPropagation()}>
                      <OrderActionMenu order={order} onOrderMutated={onOrderMutated} />
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-orange-50 px-4 py-3">
        <ProcessTimelineLegend />
        <div className="flex items-center gap-2">
          <p className="text-xs text-zinc-500">
            {filtered.length === 0
              ? "0 órdenes"
              : `${pageStart + 1}–${Math.min(pageStart + pageSize, filtered.length)} de ${filtered.length}`}
          </p>
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value) as (typeof PAGE_SIZES)[number]);
              setPage(1);
            }}
            className="h-8 rounded-lg border border-orange-100 bg-white px-2 text-xs"
          >
            {PAGE_SIZES.map((n) => (
              <option key={n} value={n}>
                {n} / pág.
              </option>
            ))}
          </select>
          <button
            type="button"
            disabled={safePage <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="h-8 min-w-8 rounded-lg border border-orange-100 px-2 text-xs disabled:opacity-40"
          >
            ‹
          </button>
          <span className="min-w-10 text-center text-xs tabular-nums">{safePage}/{totalPages}</span>
          <button
            type="button"
            disabled={safePage >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            className="h-8 min-w-8 rounded-lg border border-orange-100 px-2 text-xs disabled:opacity-40"
          >
            ›
          </button>
        </div>
      </div>
    </section>
  );
}
