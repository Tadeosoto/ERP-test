"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { OrderActionMenu } from "@/components/obras/order-action-menu";
import { OcLink } from "@/components/ui/oc-link";
import {
  filterPagosQueueOrders,
  PAGOS_PAYMENT_STATUS_LABEL,
  PAGOS_PAYMENT_STATUS_TONE,
  pagosPaymentDisplayStatus,
  pagosPrimaryAction,
  type PagosPaymentDisplayStatus,
} from "@/lib/dashboard/pagos-dashboard";
import type { PurchaseOrderDto } from "@/lib/domain/types";
import { formatDateShort, formatMoney } from "@/lib/format";

const PAGE_SIZES = [5, 10, 15] as const;

function StatusIcon({ status }: { status: PagosPaymentDisplayStatus }) {
  const cls = "h-3.5 w-3.5 shrink-0";
  if (status === "pendiente_pago" || status === "programado") {
    return (
      <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    );
  }
  if (status === "aprobado_ing") {
    return (
      <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    );
  }
  if (status === "pagado") {
    return (
      <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
      </svg>
    );
  }
  return (
    <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
      />
    </svg>
  );
}

function PagosPaymentStatusBadge({ order }: { order: PurchaseOrderDto }) {
  const key = pagosPaymentDisplayStatus(order);
  return (
    <span
      className={`inline-flex max-w-full items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset ${PAGOS_PAYMENT_STATUS_TONE[key]}`}
    >
      <StatusIcon status={key} />
      {PAGOS_PAYMENT_STATUS_LABEL[key]}
    </span>
  );
}

function PagosPaymentMobileCard({
  order,
  onOpen,
}: {
  order: PurchaseOrderDto;
  onOpen: (href: string) => void;
}) {
  const primary = pagosPrimaryAction(order);
  const due = order.paymentDueDate;

  return (
    <div className="px-4 py-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div onClick={(e) => e.stopPropagation()} role="presentation">
            <OcLink order={order} showPdfIcon className="text-sm" />
          </div>
          <p className="mt-1 truncate text-xs font-medium text-sky-800">{order.obraName}</p>
          <p className="truncate text-xs text-zinc-600">{order.supplierName}</p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2" onClick={(e) => e.stopPropagation()}>
          <OrderActionMenu
            order={order}
            primaryLabel={primary.label}
            primaryHref={primary.href}
            appearance="neutral"
            showDropdown={primary.showDropdown}
          />
        </div>
      </div>
      <button
        type="button"
        onClick={() => onOpen(`/ordenes/${order.id}`)}
        className="mt-2 flex w-full flex-wrap items-center justify-between gap-2 rounded-lg text-left"
      >
        <PagosPaymentStatusBadge order={order} />
        <span className="text-xs tabular-nums text-zinc-500">
          {due ? formatDateShort(due) : "Sin fecha"}
        </span>
        <span className="text-sm font-bold tabular-nums text-zinc-900">
          {formatMoney(
            order.status === "awaitingPayment" ? order.amountRemaining : order.totalAmount,
            order.currency
          )}
        </span>
      </button>
    </div>
  );
}

export function PagosPendingPaymentsPanel({
  orders,
  embedded = false,
}: {
  orders: PurchaseOrderDto[];
  embedded?: boolean;
}) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [obraId, setObraId] = useState("all");
  const [supplier, setSupplier] = useState("all");
  const [estado, setEstado] = useState("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<(typeof PAGE_SIZES)[number]>(embedded ? 15 : 10);

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
      filterPagosQueueOrders({
        orders,
        search,
        obraId,
        supplier,
        estado,
      }),
    [orders, search, obraId, supplier, estado]
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageStart = (safePage - 1) * pageSize;
  const pageItems = filtered.slice(pageStart, pageStart + pageSize);

  const th =
    "px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-sky-700/70 whitespace-nowrap";
  const td = "px-4 py-3 align-middle text-sm text-zinc-800";

  const sectionClass = embedded
    ? "card flex w-full flex-col overflow-hidden"
    : "card flex flex-col";

  return (
    <section className={sectionClass}>
      {/* Encabezado + filtros */}
      <div className="shrink-0 space-y-3 border-b border-zinc-100 px-4 py-4 sm:px-5 sm:py-5">
        <div>
          <h2 className="text-lg font-bold text-zinc-900">Pagos por realizar</h2>
          <p className="mt-0.5 text-sm text-zinc-500">
            {filtered.length} pago{filtered.length === 1 ? "" : "s"} en cola
          </p>
        </div>

        <div className="relative">
          <input
            type="search"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Buscar OC, proveedor u obra…"
            className="h-10 w-full rounded-xl border border-zinc-200 bg-white py-2 pl-3 pr-10 text-sm shadow-sm placeholder:text-zinc-400 focus:border-sky-300 focus:outline-none focus:ring-1 focus:ring-sky-200"
          />
          <svg
            className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400"
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
        </div>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <select
            value={obraId}
            onChange={(e) => {
              setObraId(e.target.value);
              setPage(1);
            }}
            className="h-10 rounded-xl border border-zinc-200 bg-white px-3 text-sm font-medium shadow-sm"
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
            className="h-10 rounded-xl border border-zinc-200 bg-white px-3 text-sm font-medium shadow-sm"
          >
            <option value="all">Todos los proveedores</option>
            {supplierOptions.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
          <select
            value={estado}
            onChange={(e) => {
              setEstado(e.target.value);
              setPage(1);
            }}
            className="h-10 rounded-xl border border-zinc-200 bg-white px-3 text-sm font-medium shadow-sm"
          >
            <option value="all">Todos los estados</option>
            <option value="pendiente">Pendiente pago</option>
            <option value="programado">Programado / Aprobado</option>
            <option value="comprobante">Comprobante pendiente</option>
          </select>
        </div>
      </div>

      {/* Tarjetas móvil */}
      <div className="min-h-0 overflow-y-auto divide-y divide-zinc-100 md:hidden">
        {pageItems.length === 0 ? (
          <p className="px-4 py-12 text-center text-sm text-zinc-500">No hay pagos con estos filtros.</p>
        ) : (
          pageItems.map((order) => (
            <PagosPaymentMobileCard
              key={order.id}
              order={order}
              onOpen={(href) => router.push(href)}
            />
          ))
        )}
      </div>

      {/* Tabla desktop */}
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[920px] border-collapse text-left">
          <thead className="sticky top-0 z-10 border-b border-zinc-100 bg-white">
            <tr>
              <th className={th}>OC / Folio</th>
              <th className={th}>Proveedor</th>
              <th className={th}>Obra</th>
              <th className={`${th} text-right`}>Monto</th>
              <th className={th}>Fecha compromiso</th>
              <th className={th}>Estado</th>
              <th className={`${th} text-right`}>Acción</th>
            </tr>
          </thead>
          <tbody>
            {pageItems.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-16 text-center text-sm text-zinc-500">
                  No hay pagos con estos filtros.
                </td>
              </tr>
            ) : (
              pageItems.map((order, i) => {
                const primary = pagosPrimaryAction(order);
                const amount =
                  order.status === "awaitingPayment" ? order.amountRemaining : order.totalAmount;

                return (
                  <tr
                    key={order.id}
                    onClick={() => router.push(`/ordenes/${order.id}`)}
                    className={`cursor-pointer border-b border-zinc-100 transition hover:bg-orange-50/40 ${
                      i % 2 === 1 ? "bg-zinc-50/50" : "bg-white"
                    }`}
                  >
                    <td className={td} onClick={(e) => e.stopPropagation()}>
                      <OcLink order={order} showPdfIcon className="text-sm" />
                    </td>
                    <td className={td}>
                      <p className="max-w-[10rem] truncate" title={order.supplierName}>
                        {order.supplierName}
                      </p>
                    </td>
                    <td className={td} onClick={(e) => e.stopPropagation()}>
                      <Link
                        href={`/obras/${order.obraId}`}
                        className="link-entity block max-w-[10rem] truncate text-sm"
                      >
                        {order.obraName}
                      </Link>
                    </td>
                    <td className={`${td} text-right text-sm font-bold tabular-nums text-zinc-900`}>
                      {formatMoney(amount, order.currency)}
                    </td>
                    <td className={`${td} text-sm tabular-nums text-zinc-600 whitespace-nowrap`}>
                      {order.paymentDueDate ? formatDateShort(order.paymentDueDate) : "—"}
                    </td>
                    <td className={td}>
                      <PagosPaymentStatusBadge order={order} />
                    </td>
                    <td className={`${td} text-right`} onClick={(e) => e.stopPropagation()}>
                      <OrderActionMenu
                        order={order}
                        primaryLabel={primary.label}
                        primaryHref={primary.href}
                        appearance="neutral"
                        showDropdown={primary.showDropdown}
                      />
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pie */}
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-zinc-100 px-4 py-3 sm:px-5">
        <Link
          href="/ordenes"
          className="text-sm font-medium text-orange-700 hover:underline"
        >
          Ver todos los pagos por realizar →
        </Link>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value) as (typeof PAGE_SIZES)[number]);
              setPage(1);
            }}
            className="h-9 rounded-lg border border-zinc-200 bg-white px-2.5 text-sm text-zinc-700"
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
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-200 bg-white text-sm disabled:opacity-40"
            aria-label="Página anterior"
          >
            ‹
          </button>
          <span className="min-w-12 text-center text-sm tabular-nums text-zinc-700">
            {safePage}/{totalPages}
          </span>
          <button
            type="button"
            disabled={safePage >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-200 bg-white text-sm disabled:opacity-40"
            aria-label="Página siguiente"
          >
            ›
          </button>
        </div>
      </div>
    </section>
  );
}
