"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, type ReactNode } from "react";
import { SystemStatusBadge } from "@/components/ui/system-status-badge";
import {
  COMPRAS_ESTADO_OPTIONS,
  filterComprasOrders,
  hasOcPdf,
  orderDisplayCode,
  type ComprasOrderTab,
} from "@/lib/dashboard/compras-dashboard";
import { PAYMENT_TYPE_SHORT } from "@/lib/domain/labels";
import type { ObraDto, PurchaseOrderDto } from "@/lib/domain/types";
import { formatDateShort, formatMoney } from "@/lib/format";

const PAGE_SIZES = [15, 25, 50] as const;
const FILTER_ICON = "h-5 w-5";

function paymentTypeShort(order: PurchaseOrderDto): string {
  if (order.paymentType) return PAYMENT_TYPE_SHORT[order.paymentType];
  if (order.suggestedPaymentType === "parcialidades") return "Parcial. prop.";
  return "—";
}

function docFlags(order: PurchaseOrderDto) {
  const kinds = new Set(order.files.map((f) => f.kind));
  return {
    oc: kinds.has("oc_pdf"),
    pago: kinds.has("comprobante_pago"),
    factura: kinds.has("factura"),
  };
}

function DocDot({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span
      title={label}
      className={`inline-block h-2.5 w-2.5 rounded-full ${ok ? "bg-teal-500" : "bg-zinc-200"}`}
      aria-label={`${label}: ${ok ? "sí" : "no"}`}
    />
  );
}

function FilterLabel({ htmlFor, children }: { htmlFor?: string; children: ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="mb-1 block text-xs font-medium text-teal-800">
      {children}
    </label>
  );
}

function ChevronDownIcon() {
  return (
    <svg className={FILTER_ICON} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  );
}

function FilterSelect({
  id,
  label,
  value,
  onChange,
  children,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
}) {
  return (
    <div className="min-w-0">
      <FilterLabel htmlFor={id}>{label}</FilterLabel>
      <div className="relative">
        <select
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-11 w-full appearance-none rounded-xl border border-zinc-200 bg-white pl-3 pr-10 text-sm font-semibold text-zinc-900 shadow-sm focus:border-orange-300 focus:outline-none focus:ring-1 focus:ring-orange-200"
        >
          {children}
        </select>
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400">
          <ChevronDownIcon />
        </span>
      </div>
    </div>
  );
}

function DateRangeFilter({
  dateFrom,
  dateTo,
  onFromChange,
  onToChange,
}: {
  dateFrom: string;
  dateTo: string;
  onFromChange: (v: string) => void;
  onToChange: (v: string) => void;
}) {
  return (
    <div className="min-w-0 sm:col-span-2 xl:col-span-1">
      <FilterLabel>Fecha</FilterLabel>
      <div className="flex h-11 min-w-0 items-center gap-1 rounded-xl border border-zinc-200 bg-white px-2 shadow-sm focus-within:border-orange-300 focus-within:ring-1 focus-within:ring-orange-200">
        <input
          type="date"
          value={dateFrom}
          onChange={(e) => onFromChange(e.target.value)}
          aria-label="Fecha desde"
          className="min-w-0 flex-1 border-0 bg-transparent px-0.5 text-sm font-semibold text-zinc-900 focus:outline-none"
        />
        <span className="shrink-0 text-sm font-medium text-zinc-400">-</span>
        <input
          type="date"
          value={dateTo}
          onChange={(e) => onToChange(e.target.value)}
          aria-label="Fecha hasta"
          className="min-w-0 flex-1 border-0 bg-transparent px-0.5 text-sm font-semibold text-zinc-900 focus:outline-none"
        />
        <svg className={`${FILTER_ICON} shrink-0 text-zinc-400`} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
      </div>
    </div>
  );
}

function ComprasOrderMobileCard({
  order,
  onOpen,
}: {
  order: PurchaseOrderDto;
  onOpen: (href: string) => void;
}) {
  const docs = docFlags(order);
  const href = `/ordenes/${order.id}`;

  return (
    <button
      type="button"
      onClick={() => onOpen(href)}
      className="w-full px-4 py-3.5 text-left transition hover:bg-orange-50/60 active:bg-orange-50"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            {hasOcPdf(order) && (
              <span className="shrink-0 text-red-500" title="PDF adjunto">
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
                  <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zm-1 2l5 5h-5V4z" />
                </svg>
              </span>
            )}
            <p className="truncate font-semibold text-zinc-900">{orderDisplayCode(order)}</p>
          </div>
          <p className="mt-0.5 line-clamp-2 text-sm text-zinc-600">{order.title}</p>
          <p className="mt-1 truncate text-xs font-medium text-teal-800">{order.obraName}</p>
          <p className="truncate text-xs text-zinc-500">{order.supplierName}</p>
        </div>
        <svg className="mt-1 h-5 w-5 shrink-0 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <SystemStatusBadge status={order.status} size="xs" />
        <span className="text-xs tabular-nums text-zinc-500">{formatDateShort(order.createdAt)}</span>
      </div>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold tabular-nums text-orange-700">
          {formatMoney(order.totalAmount, order.currency)}
        </p>
        <div className="inline-flex items-center gap-1.5" title="OC · Pago · Factura">
          <DocDot ok={docs.oc} label="OC" />
          <DocDot ok={docs.pago} label="Comprobante" />
          <DocDot ok={docs.factura} label="Factura" />
        </div>
      </div>
    </button>
  );
}

export function ComprasOrdersPanel({
  orders,
  obras,
  activeTab,
  onTabChange,
}: {
  orders: PurchaseOrderDto[];
  obras: ObraDto[];
  activeTab: ComprasOrderTab;
  onTabChange: (tab: ComprasOrderTab) => void;
}) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [obraId, setObraId] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<(typeof PAGE_SIZES)[number]>(15);

  const filtered = useMemo(
    () =>
      filterComprasOrders({
        orders,
        tab: activeTab,
        search,
        obraId,
        dateFrom,
        dateTo,
      }),
    [orders, activeTab, search, obraId, dateFrom, dateTo]
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageStart = (safePage - 1) * pageSize;
  const pageItems = filtered.slice(pageStart, pageStart + pageSize);

  function clearFilters() {
    setSearch("");
    setObraId("all");
    setDateFrom("");
    setDateTo("");
    onTabChange("all");
    setPage(1);
  }

  function handleEstadoChange(tab: string) {
    onTabChange(tab as ComprasOrderTab);
    setPage(1);
  }

  const th = "px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-500";
  const td = "px-2 py-1.5 align-middle text-xs leading-snug";

  return (
    <section className="card flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="shrink-0 border-b border-orange-50 px-3 py-3 sm:px-4 sm:py-4 lg:px-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base font-bold text-zinc-900 sm:text-lg">Mis órdenes de compra</h2>
          <p className="text-xs text-zinc-500">{filtered.length} orden{filtered.length === 1 ? "" : "es"}</p>
        </div>

        <div className="mt-3 grid grid-cols-1 items-end gap-3 sm:grid-cols-2 xl:mt-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.25fr)_auto] xl:gap-2.5">
          <div className="relative min-w-0 sm:col-span-2 xl:col-span-1">
            <input
              id="compras-oc-search"
              type="search"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Buscar por OC, proveedor u obra…"
              className="h-11 w-full rounded-xl border border-zinc-200 bg-white py-2 pl-4 pr-11 text-sm shadow-sm placeholder:font-normal placeholder:text-zinc-400 focus:border-orange-300 focus:outline-none focus:ring-1 focus:ring-orange-200"
            />
            <svg
              className={`pointer-events-none absolute right-3 top-1/2 ${FILTER_ICON} -translate-y-1/2 text-zinc-400`}
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

          <FilterSelect
            id="compras-estado-filter"
            label="Estado"
            value={activeTab}
            onChange={handleEstadoChange}
          >
            {COMPRAS_ESTADO_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </FilterSelect>

          <FilterSelect
            id="compras-obra-filter"
            label="Obra"
            value={obraId}
            onChange={(v) => {
              setObraId(v);
              setPage(1);
            }}
          >
            <option value="all">Todas las obras</option>
            {obras.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </FilterSelect>

          <DateRangeFilter
            dateFrom={dateFrom}
            dateTo={dateTo}
            onFromChange={(v) => {
              setDateFrom(v);
              setPage(1);
            }}
            onToChange={(v) => {
              setDateTo(v);
              setPage(1);
            }}
          />

          <button
            type="button"
            onClick={clearFilters}
            className="inline-flex h-11 w-full items-center justify-center gap-2 self-end whitespace-nowrap rounded-xl border border-zinc-200 bg-white px-4 text-sm font-medium text-zinc-700 shadow-sm transition hover:bg-zinc-50 sm:col-span-2 xl:col-span-1 xl:w-auto"
          >
            <svg className={`${FILTER_ICON} text-zinc-500`} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
              />
            </svg>
            Limpiar filtros
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto lg:hidden">
        {pageItems.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-zinc-500">No hay órdenes con estos filtros.</p>
        ) : (
          <div className="divide-y divide-orange-50">
            {pageItems.map((order) => (
              <ComprasOrderMobileCard key={order.id} order={order} onOpen={(href) => router.push(href)} />
            ))}
          </div>
        )}
      </div>

      <div className="hidden min-h-0 flex-1 overflow-auto lg:block">
        <table className="w-full min-w-[1040px] border-collapse text-left">
          <thead className="sticky top-0 z-10 bg-orange-50/95 backdrop-blur-sm">
            <tr className="border-b border-orange-100">
              <th className={th}>OC / Título</th>
              <th className={th}>Obra</th>
              <th className={th}>Proveedor</th>
              <th className={`${th} text-right`}>Total</th>
              <th className={`${th} text-right`}>Pagado</th>
              <th className={th}>Modalidad</th>
              <th className={`${th} text-right`}>Saldo pendiente</th>
              <th className={th}>Fecha</th>
              <th className={th}>Estado</th>
              <th className={`${th} w-10`} aria-label="Acciones" />
            </tr>
          </thead>
          <tbody>
            {pageItems.length === 0 ? (
              <tr>
                <td colSpan={11} className="px-4 py-10 text-center text-sm text-zinc-500">
                  No hay órdenes con estos filtros.
                </td>
              </tr>
            ) : (
              pageItems.map((order, i) => {
                const docs = docFlags(order);
                const href = `/ordenes/${order.id}`;
                return (
                  <tr
                    key={order.id}
                    onClick={() => router.push(href)}
                    className={`cursor-pointer border-b border-orange-50/80 transition hover:bg-orange-50/60 ${
                      i % 2 === 1 ? "bg-zinc-50/50" : "bg-white"
                    }`}
                  >
                    <td className={td}>
                      <div className="flex min-w-[9rem] items-center gap-1.5">
                        {hasOcPdf(order) && (
                          <span className="shrink-0 text-red-500" title="PDF adjunto">
                            <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
                              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zm-1 2l5 5h-5V4z" />
                            </svg>
                          </span>
                        )}
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-zinc-900">{orderDisplayCode(order)}</p>
                          <p className="truncate text-[11px] text-zinc-500">{order.title}</p>
                        </div>
                      </div>
                    </td>
                    <td className={`${td} max-w-[7rem] truncate font-medium text-teal-800`}>
                      {order.obraName}
                    </td>
                    <td className={`${td} max-w-[8rem] truncate text-zinc-700`}>{order.supplierName}</td>
                    <td className={`${td} text-right font-semibold tabular-nums text-zinc-900`}>
                      {formatMoney(order.totalAmount, order.currency)}
                    </td>
                    <td className={`${td} text-right tabular-nums text-zinc-700`}>
                      {formatMoney(order.amountPaidSoFar, order.currency)}
                    </td>
                    <td className={`${td} whitespace-nowrap text-zinc-600`}>{paymentTypeShort(order)}</td>
                    <td className={`${td} text-right`}>
                      <span
                        className={
                          order.amountRemaining <= 0.01
                            ? "font-semibold tabular-nums text-emerald-700"
                            : "font-bold tabular-nums text-orange-600"
                        }
                      >
                        {formatMoney(order.amountRemaining, order.currency)}
                      </span>
                      {order.amountRemaining > 0.01 && (
                        <p className="text-[10px] font-medium text-orange-500">pendiente</p>
                      )}
                    </td>
                    <td className={`${td} whitespace-nowrap tabular-nums text-zinc-600`}>
                      {formatDateShort(order.createdAt)}
                    </td>
                    <td className={td}>
                      <SystemStatusBadge status={order.status} size="xs" />
                    </td>
                    <td className={`${td} text-zinc-400`}>
                      <Link
                        href={href}
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg hover:bg-orange-100 hover:text-orange-700"
                        aria-label="Ver expediente"
                      >
                        <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                          <circle cx="12" cy="5" r="2" />
                          <circle cx="12" cy="12" r="2" />
                          <circle cx="12" cy="19" r="2" />
                        </svg>
                      </Link>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-t border-orange-50 px-3 py-2.5 sm:px-4">
        <p className="text-xs text-zinc-500">
          {filtered.length === 0
            ? "0 órdenes"
            : `${pageStart + 1}–${Math.min(pageStart + pageSize, filtered.length)} de ${filtered.length}`}
        </p>
        <div className="flex items-center gap-1.5">
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value) as (typeof PAGE_SIZES)[number]);
              setPage(1);
            }}
            className="h-10 rounded-lg border border-orange-100 bg-white px-2 text-xs sm:h-8"
            aria-label="Órdenes por página"
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
            className="flex h-10 min-w-10 items-center justify-center rounded-lg border border-orange-100 px-2 text-sm disabled:opacity-40 sm:h-8 sm:text-xs"
            aria-label="Página anterior"
          >
            ‹
          </button>
          <span className="min-w-12 text-center text-xs tabular-nums text-zinc-600">
            {safePage}/{totalPages}
          </span>
          <button
            type="button"
            disabled={safePage >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            className="flex h-10 min-w-10 items-center justify-center rounded-lg border border-orange-100 px-2 text-sm disabled:opacity-40 sm:h-8 sm:text-xs"
            aria-label="Página siguiente"
          >
            ›
          </button>
        </div>
      </div>
    </section>
  );
}
