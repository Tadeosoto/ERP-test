"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { OrderActionMenu } from "@/components/obras/order-action-menu";
import { OcLink } from "@/components/ui/oc-link";
import { SystemStatusBadge } from "@/components/ui/system-status-badge";
import {
  filterIngenieroPendingOrders,
  materialRequestDisplayLabel,
} from "@/lib/dashboard/ingeniero-dashboard";
import type { MaterialRequestDto, PurchaseOrderDto } from "@/lib/domain/types";
import { formatDateShort, formatMoney } from "@/lib/format";

const PAGE_SIZES = [5, 10, 15] as const;

function IngenieroOrderMobileCard({
  order,
  request,
  onOpen,
}: {
  order: PurchaseOrderDto;
  request?: MaterialRequestDto;
  onOpen: (href: string) => void;
}) {
  const href = `/ordenes/${order.id}`;
  const received = order.sentToEngineerAt ?? order.createdAt;

  return (
    <div className="px-3 py-3 sm:px-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div onClick={(e) => e.stopPropagation()} role="presentation">
            <OcLink order={order} showPdfIcon className="text-sm" />
          </div>
          <p className="mt-1 truncate text-xs font-medium text-sky-800">{order.obraName}</p>
          <p className="truncate text-xs text-zinc-600">{order.supplierName}</p>
          {request && (
            <Link
              href={`/solicitudes/material/${request.id}`}
              className="link-entity mt-1 line-clamp-2 text-[11px] leading-snug"
              onClick={(e) => e.stopPropagation()}
            >
              {materialRequestDisplayLabel(request)}
            </Link>
          )}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2" onClick={(e) => e.stopPropagation()}>
          <OrderActionMenu order={order} primaryLabel="Revisar" />
        </div>
      </div>
      <button
        type="button"
        onClick={() => onOpen(href)}
        className="mt-2 flex w-full flex-wrap items-center justify-between gap-2 rounded-lg text-left"
      >
        <SystemStatusBadge status={order.status} size="xs" />
        <span className="text-xs tabular-nums text-zinc-500">{formatDateShort(received)}</span>
        <span className="text-sm font-semibold tabular-nums text-zinc-900">
          {formatMoney(order.totalAmount, order.currency)}
        </span>
      </button>
    </div>
  );
}

export function IngenieroPendingOrdersPanel({
  orders,
  engineerUserId,
  materialRequests,
  embedded = false,
}: {
  orders: PurchaseOrderDto[];
  engineerUserId: string;
  materialRequests: MaterialRequestDto[];
  embedded?: boolean;
}) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [obraId, setObraId] = useState("all");
  const [supplier, setSupplier] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [estado, setEstado] = useState("awaitingEngineer");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<(typeof PAGE_SIZES)[number]>(embedded ? 5 : 10);

  const requestById = useMemo(
    () => new Map(materialRequests.map((r) => [r.id, r])),
    [materialRequests]
  );

  const obraOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const o of orders) map.set(o.obraId, o.obraName);
    return [...map.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [orders]);

  const supplierOptions = useMemo(() => {
    const set = new Set(orders.map((o) => o.supplierName));
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [orders]);

  const filtered = useMemo(
    () =>
      filterIngenieroPendingOrders({
        orders,
        engineerUserId,
        search,
        obraId,
        supplier,
        dateFrom,
        dateTo,
        estado,
      }),
    [orders, engineerUserId, search, obraId, supplier, dateFrom, dateTo, estado]
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageStart = (safePage - 1) * pageSize;
  const pageItems = filtered.slice(pageStart, pageStart + pageSize);

  function clearFilters() {
    setSearch("");
    setObraId("all");
    setSupplier("all");
    setDateFrom("");
    setDateTo("");
    setEstado("awaitingEngineer");
    setPage(1);
  }

  const th =
    "px-2 py-2 text-[10px] font-semibold uppercase tracking-wide text-zinc-500 whitespace-nowrap";
  const td = embedded ? "px-2 py-1.5 align-middle max-w-0" : "px-2 py-2.5 align-middle max-w-0";
  const tdTruncate = `${td} truncate text-xs`;

  return (
    <section
      className={`card flex flex-col ${embedded ? "lg:min-h-0 lg:flex-1 lg:overflow-hidden" : ""}`}
    >
      <div
        className={`shrink-0 border-b border-orange-50 px-3 py-3 sm:px-4 sm:py-3.5 ${
          embedded ? "lg:px-3 lg:py-2.5" : "sm:px-5"
        }`}
      >
        <h2 className={`font-bold text-zinc-900 ${embedded ? "text-base" : "text-lg"}`}>
          Órdenes pendientes de mi aprobación
        </h2>
        <p className="mt-0.5 text-[11px] text-zinc-500">{filtered.length} orden{filtered.length === 1 ? "" : "es"}</p>

        <div className={`space-y-1.5 ${embedded ? "mt-2" : "mt-3 space-y-2"}`}>
          <div className="relative">
            <input
              type="search"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Buscar OC, proveedor u obra…"
              className={`w-full rounded-lg border border-zinc-200 bg-white py-2 pl-3 pr-10 text-xs shadow-sm placeholder:text-zinc-400 focus:border-sky-300 focus:outline-none focus:ring-1 focus:ring-sky-200 ${
                embedded ? "h-8" : "h-9"
              }`}
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

          <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2 lg:grid-cols-5">
            <select
              value={obraId}
              onChange={(e) => {
                setObraId(e.target.value);
                setPage(1);
              }}
              className={`rounded-lg border border-zinc-200 bg-white px-2 text-xs font-medium shadow-sm ${embedded ? "h-8" : "h-9"}`}
            >
              <option value="all">Todas las obras</option>
              {obraOptions.map(([id, name]) => (
                <option key={id} value={id}>
                  {name}
                </option>
              ))}
            </select>
            <select
              value={supplier}
              onChange={(e) => {
                setSupplier(e.target.value);
                setPage(1);
              }}
              className={`rounded-lg border border-zinc-200 bg-white px-2 text-xs font-medium shadow-sm ${embedded ? "h-8" : "h-9"}`}
            >
              <option value="all">Todos los proveedores</option>
              {supplierOptions.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => {
                setDateFrom(e.target.value);
                setPage(1);
              }}
              className={`rounded-lg border border-zinc-200 bg-white px-2 text-xs shadow-sm ${embedded ? "h-8" : "h-9"}`}
              aria-label="Recibida desde"
            />
            <select
              value={estado}
              onChange={(e) => {
                setEstado(e.target.value);
                setPage(1);
              }}
              className={`rounded-lg border border-zinc-200 bg-white px-2 text-xs font-medium shadow-sm ${embedded ? "h-8" : "h-9"}`}
            >
              <option value="awaitingEngineer">Pendiente</option>
              <option value="engineerRejected">Corrección solicitada</option>
              <option value="all">Todos</option>
            </select>
            <button
              type="button"
              onClick={clearFilters}
              className={`col-span-1 rounded-lg border border-zinc-200 bg-white text-xs font-medium text-zinc-700 shadow-sm hover:bg-zinc-50 sm:col-span-2 lg:col-span-1 ${
                embedded ? "h-9 sm:h-8" : "h-9"
              }`}
            >
              Limpiar filtros
            </button>
          </div>
        </div>
      </div>

      <div className="divide-y divide-orange-50 lg:hidden">
        {pageItems.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-zinc-500">No hay órdenes con estos filtros.</p>
        ) : (
          pageItems.map((order) => (
            <IngenieroOrderMobileCard
              key={order.id}
              order={order}
              request={order.materialRequestId ? requestById.get(order.materialRequestId) : undefined}
              onOpen={(href) => router.push(href)}
            />
          ))
        )}
      </div>

      <div className="hidden min-h-0 min-w-0 flex-1 overflow-hidden lg:block">
        <table className="w-full table-fixed border-collapse text-left">
          <colgroup>
            <col className="w-[9%]" />
            <col className="w-[17%]" />
            <col className="w-[14%]" />
            <col className="w-[10%]" />
            <col className="w-[8%]" />
            <col className="w-[20%]" />
            <col className="w-[12%]" />
            <col className="w-[10%]" />
          </colgroup>
          <thead className="sticky top-0 z-10 bg-orange-50/95 backdrop-blur-sm">
            <tr className="border-b border-orange-100">
              <th className={th}>OC</th>
              <th className={th}>Obra</th>
              <th className={th}>Proveedor</th>
              <th className={`${th} text-right`}>Monto</th>
              <th className={th}>Recibida</th>
              <th className={th}>Solicitud original</th>
              <th className={th}>Estado</th>
              <th className={`${th} text-right`}>Acción</th>
            </tr>
          </thead>
          <tbody>
            {pageItems.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center text-sm text-zinc-500">
                  No hay órdenes con estos filtros.
                </td>
              </tr>
            ) : (
              pageItems.map((order, i) => {
                const request = order.materialRequestId
                  ? requestById.get(order.materialRequestId)
                  : undefined;
                const received = order.sentToEngineerAt ?? order.createdAt;

                return (
                  <tr
                    key={order.id}
                    onClick={() => router.push(`/ordenes/${order.id}`)}
                    className={`cursor-pointer border-b border-orange-50/80 transition hover:bg-orange-50/50 ${
                      i % 2 === 1 ? "bg-zinc-50/40" : "bg-white"
                    }`}
                  >
                    <td className={td} onClick={(e) => e.stopPropagation()}>
                      <div className="min-w-0 overflow-hidden">
                        <OcLink order={order} showPdfIcon className="block truncate text-xs" />
                      </div>
                    </td>
                    <td className={td} onClick={(e) => e.stopPropagation()}>
                      <Link
                        href={`/obras/${order.obraId}`}
                        className="link-entity block truncate text-xs"
                        title={order.obraName}
                      >
                        {order.obraName}
                      </Link>
                    </td>
                    <td className={tdTruncate} title={order.supplierName}>
                      {order.supplierName}
                    </td>
                    <td className={`${td} text-right text-xs font-semibold tabular-nums text-zinc-900 whitespace-nowrap`}>
                      {formatMoney(order.totalAmount, order.currency)}
                    </td>
                    <td className={`${td} text-[11px] tabular-nums text-zinc-600 whitespace-nowrap`}>
                      {formatDateShort(received)}
                    </td>
                    <td className={td} onClick={(e) => e.stopPropagation()}>
                      {request ? (
                        <Link
                          href={`/solicitudes/material/${request.id}`}
                          className="link-entity block min-w-0 overflow-hidden text-[11px] leading-snug line-clamp-2"
                          title={materialRequestDisplayLabel(request)}
                        >
                          {materialRequestDisplayLabel(request)}
                        </Link>
                      ) : (
                        <span className="text-[11px] text-zinc-400">—</span>
                      )}
                    </td>
                    <td className={td}>
                      <div className="min-w-0 overflow-hidden">
                        <SystemStatusBadge status={order.status} size="xs" />
                      </div>
                    </td>
                    <td className={`${td} text-right whitespace-nowrap`} onClick={(e) => e.stopPropagation()}>
                      <OrderActionMenu order={order} primaryLabel="Revisar" />
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className={`flex shrink-0 flex-wrap items-center justify-end gap-2 border-t border-orange-50 ${embedded ? "px-3 py-2" : "px-4 py-3"}`}>
        <p className="mr-auto text-xs text-zinc-500">
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
        <span className="min-w-10 text-center text-xs tabular-nums">
          {safePage}/{totalPages}
        </span>
        <button
          type="button"
          disabled={safePage >= totalPages}
          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          className="h-8 min-w-8 rounded-lg border border-orange-100 px-2 text-xs disabled:opacity-40"
        >
          ›
        </button>
      </div>
    </section>
  );
}
