"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, type ReactNode } from "react";
import { SystemStatusBadge } from "@/components/ui/system-status-badge";
import {
  COMPRAS_ESTADO_OPTIONS,
  daysInStage,
  filterComprasOrders,
  hasOcPdf,
  orderDisplayCode,
  type ComprasOrderTab,
} from "@/lib/dashboard/compras-dashboard";
import { formatPendingRoles } from "@/lib/domain/flow";
import { PAYMENT_LABEL_TEXT, PAYMENT_TYPE_SHORT } from "@/lib/domain/labels";
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
    <div className="min-w-0">
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
      <div className="shrink-0 border-b border-orange-50 px-4 py-4 sm:px-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-bold text-zinc-900">Mis órdenes de compra</h2>
          <p className="text-xs text-zinc-500">{filtered.length} orden{filtered.length === 1 ? "" : "es"}</p>
        </div>

        <div className="mt-4 grid grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.25fr)_auto] items-end gap-2.5">
          <div className="relative min-w-0">
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
            className="inline-flex h-11 items-center justify-center gap-2 self-end whitespace-nowrap rounded-xl border border-zinc-200 bg-white px-4 text-sm font-medium text-zinc-700 shadow-sm transition hover:bg-zinc-50"
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

      <div className="min-h-0 flex-1 overflow-auto">
        <table className="w-full min-w-[1040px] border-collapse text-left">
          <thead className="sticky top-0 z-10 bg-orange-50/95 backdrop-blur-sm">
            <tr className="border-b border-orange-100">
              <th className={th}>OC / Título</th>
              <th className={th}>Obra</th>
              <th className={th}>Proveedor</th>
              <th className={`${th} text-right`}>Total</th>
              <th className={`${th} text-right`}>Pagado</th>
              <th className={th}>Modalidad</th>
              <th className={th}>Saldo</th>
              <th className={th}>Fecha</th>
              <th className={th}>Estado</th>
              <th className={th}>A cargo</th>
              <th className={`${th} text-center`}>Días</th>
              <th className={`${th} text-center`} title="OC · Pago · Factura">
                Docs
              </th>
              <th className={`${th} w-8`} aria-label="Abrir" />
            </tr>
          </thead>
          <tbody>
            {pageItems.length === 0 ? (
              <tr>
                <td colSpan={13} className="px-4 py-10 text-center text-sm text-zinc-500">
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
                    <td className={td}>
                      <span
                        className={
                          order.paymentLabel === "saldada"
                            ? "font-medium text-emerald-700"
                            : "font-medium text-amber-700"
                        }
                      >
                        {PAYMENT_LABEL_TEXT[order.paymentLabel]}
                      </span>
                    </td>
                    <td className={`${td} whitespace-nowrap tabular-nums text-zinc-600`}>
                      {formatDateShort(order.createdAt)}
                    </td>
                    <td className={td}>
                      <SystemStatusBadge status={order.status} size="xs" />
                    </td>
                    <td className={`${td} max-w-[6.5rem] truncate text-[11px] text-zinc-600`}>
                      {formatPendingRoles(order.status)}
                    </td>
                    <td className={`${td} text-center tabular-nums text-zinc-600`}>
                      {daysInStage(order.updatedAt)}
                    </td>
                    <td className={`${td} text-center`}>
                      <div className="inline-flex items-center gap-1" title="OC · Pago · Factura">
                        <DocDot ok={docs.oc} label="OC" />
                        <DocDot ok={docs.pago} label="Comprobante" />
                        <DocDot ok={docs.factura} label="Factura" />
                      </div>
                    </td>
                    <td className={`${td} text-zinc-400`}>
                      <Link
                        href={href}
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg hover:bg-orange-100 hover:text-orange-700"
                        aria-label="Ver expediente"
                      >
                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
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

      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-t border-orange-50 px-3 py-2 sm:px-4">
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
            className="h-8 rounded-lg border border-orange-100 bg-white px-2 text-xs"
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
            className="h-8 rounded-lg border border-orange-100 px-2 text-xs disabled:opacity-40"
          >
            ‹
          </button>
          <span className="min-w-[3rem] text-center text-xs tabular-nums text-zinc-600">
            {safePage}/{totalPages}
          </span>
          <button
            type="button"
            disabled={safePage >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            className="h-8 rounded-lg border border-orange-100 px-2 text-xs disabled:opacity-40"
          >
            ›
          </button>
        </div>
      </div>
    </section>
  );
}
