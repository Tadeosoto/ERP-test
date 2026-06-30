"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { OrderActionMenu } from "@/components/obras/order-action-menu";
import { OcLink } from "@/components/ui/oc-link";
import { LoadingScreen } from "@/components/ui/loading-screen";
import {
  amountToPay,
  applyPagosFilters,
  DIRECCION_PAGO_ESTATUS_LABEL,
  DIRECCION_PAGO_ESTATUS_OPTIONS,
  DIRECCION_PAGO_ESTATUS_TONE,
  DIRECCION_PAGO_TABS,
  direccionPagoEstatus,
  exportPagosCsv,
  filterByTab,
  latestPaymentDate,
  paginateItems,
  pagosPageKpis,
  partialProgress,
  spendByObraThisMonth,
  totalPages,
  upcomingScheduledPayments,
  uniqueSuppliers,
  type DireccionPagoTab,
  type DireccionPagosFilters,
} from "@/lib/dashboard/direccion-pagos";
import type { ObraDto, PurchaseOrderDto } from "@/lib/domain/types";
import { formatDateShort, formatMoney } from "@/lib/format";

const PAGE_SIZE_OPTIONS = [8, 15, 25, 50] as const;

const EMPTY_FILTERS: DireccionPagosFilters = {
  obraId: "",
  supplier: "",
  estatus: "",
  dateFrom: "",
  dateTo: "",
};

function PagoStatusBadge({ order }: { order: PurchaseOrderDto }) {
  const key = direccionPagoEstatus(order);
  return (
    <span
      className={`inline-flex max-w-full items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset ${DIRECCION_PAGO_ESTATUS_TONE[key]}`}
    >
      {DIRECCION_PAGO_ESTATUS_LABEL[key]}
    </span>
  );
}

function KpiCard({
  label,
  value,
  sub,
  accent,
  iconBg,
  href,
}: {
  label: string;
  value: string;
  sub: string;
  accent: string;
  iconBg: string;
  href?: string;
}) {
  const inner = (
    <>
      <div className="flex items-start justify-between gap-2">
        <span className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${iconBg}`}>
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </span>
        <span className="text-right text-lg font-bold tabular-nums leading-tight text-zinc-900">{value}</span>
      </div>
      <p className="mt-2 text-xs font-semibold text-zinc-800">{label}</p>
      <p className="mt-0.5 text-[11px] text-zinc-500">{sub}</p>
    </>
  );
  if (href) {
    return (
      <Link
        href={href}
        className={`block rounded-2xl border border-zinc-200/80 border-l-4 p-4 shadow-sm transition hover:shadow-md ${accent}`}
      >
        {inner}
      </Link>
    );
  }
  return (
    <div className={`rounded-2xl border border-zinc-200/80 border-l-4 p-4 shadow-sm ${accent}`}>{inner}</div>
  );
}

export function DireccionPagosView({ onRegisterRefresh }: { onRegisterRefresh?: (fn: () => void) => void }) {
  const [orders, setOrders] = useState<PurchaseOrderDto[]>([]);
  const [obras, setObras] = useState<ObraDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<DireccionPagoTab>("todos");
  const [filters, setFilters] = useState<DireccionPagosFilters>(EMPTY_FILTERS);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<(typeof PAGE_SIZE_OPTIONS)[number]>(15);

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

  const currency = orders[0]?.currency ?? "MXN";
  const kpis = useMemo(() => pagosPageKpis(orders), [orders]);
  const suppliers = useMemo(() => uniqueSuppliers(orders), [orders]);

  const tabbed = useMemo(() => filterByTab(orders, tab), [orders, tab]);
  const filtered = useMemo(() => applyPagosFilters(tabbed, filters), [tabbed, filters]);
  const sorted = useMemo(
    () =>
      [...filtered].sort((a, b) => {
        const da = latestPaymentDate(a) ?? a.paymentDueDate ?? a.createdAt;
        const db = latestPaymentDate(b) ?? b.paymentDueDate ?? b.createdAt;
        return new Date(db).getTime() - new Date(da).getTime();
      }),
    [filtered]
  );

  const pages = useMemo(() => totalPages(sorted.length, pageSize), [sorted.length, pageSize]);
  const pageItems = useMemo(() => paginateItems(sorted, page, pageSize), [sorted, page, pageSize]);

  const partialsBottom = useMemo(() => filterByTab(orders, "parciales").slice(0, 4), [orders]);
  const upcoming = useMemo(() => upcomingScheduledPayments(orders, 4), [orders]);
  const obraResumen = useMemo(() => spendByObraThisMonth(orders, obras).slice(0, 4), [orders, obras]);

  useEffect(() => {
    setPage(1);
  }, [tab, filters, pageSize]);

  useEffect(() => {
    if (page > pages) setPage(pages);
  }, [page, pages]);

  function setFilter<K extends keyof DireccionPagosFilters>(key: K, value: DireccionPagosFilters[K]) {
    setFilters((f) => ({ ...f, [key]: value }));
  }

  function clearFilters() {
    setFilters(EMPTY_FILTERS);
  }

  if (loading) return <LoadingScreen message="Cargando pagos" />;

  const rangeStart = sorted.length === 0 ? 0 : (page - 1) * pageSize + 1;
  const rangeEnd = Math.min(page * pageSize, sorted.length);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 sm:text-3xl">Pagos</h1>
        <p className="mt-1 text-sm text-zinc-600">
          Consulta y da seguimiento a los pagos del consorcio.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard
          label="Pagos realizados este mes"
          value={formatMoney(kpis.realizadosMes, currency)}
          sub={`${kpis.realizadosCount} pago${kpis.realizadosCount === 1 ? "" : "s"}`}
          accent="border-l-emerald-400 bg-emerald-50/35"
          iconBg="bg-emerald-100 text-emerald-800"
        />
        <KpiCard
          label="Pagos pendientes de autorizar"
          value={formatMoney(kpis.pendientesAmount, currency)}
          sub={`${kpis.pendientesCount} pago${kpis.pendientesCount === 1 ? "" : "s"}`}
          accent="border-l-orange-400 bg-orange-50/40"
          iconBg="bg-orange-100 text-orange-700"
          href="#tab-pendientes"
        />
        <KpiCard
          label="Pagos parciales activos"
          value={String(kpis.parcialesCount)}
          sub="Con saldo pendiente"
          accent="border-l-sky-400 bg-sky-50/35"
          iconBg="bg-sky-100 text-sky-800"
          href="#tab-parciales"
        />
        <KpiCard
          label="Total comprometido"
          value={formatMoney(kpis.totalComprometido, currency)}
          sub="Ver resumen →"
          accent="border-l-violet-400 bg-violet-50/35"
          iconBg="bg-violet-100 text-violet-800"
          href="/reportes"
        />
      </div>

      <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
        <div className="flex flex-wrap gap-1 border-b border-zinc-100 px-3 pt-3">
          {DIRECCION_PAGO_TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              id={t.key === "pendientes" ? "tab-pendientes" : t.key === "parciales" ? "tab-parciales" : undefined}
              onClick={() => setTab(t.key)}
              className={`rounded-t-lg px-3 py-2 text-xs font-semibold transition sm:text-sm ${
                tab === t.key
                  ? "bg-violet-100 text-violet-900"
                  : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-end gap-3 border-b border-zinc-100 bg-zinc-50/50 px-4 py-3">
          <label className="block min-w-[8rem] flex-1 text-xs">
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
          <label className="block min-w-[8rem] flex-1 text-xs">
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
          <label className="block min-w-[8rem] flex-1 text-xs">
            <span className="font-medium text-zinc-600">Estatus</span>
            <select
              value={filters.estatus}
              onChange={(e) => setFilter("estatus", e.target.value)}
              className="mt-1 block w-full rounded-lg border border-zinc-200 bg-white px-2 py-2 text-sm"
            >
              {DIRECCION_PAGO_ESTATUS_OPTIONS.map((o) => (
                <option key={o.value || "all"} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-xs">
            <span className="font-medium text-zinc-600">Fecha pago — Desde</span>
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
          <button type="button" onClick={clearFilters} className="btn-ghost shrink-0 text-sm">
            Limpiar filtros
          </button>
          <button
            type="button"
            onClick={() => exportPagosCsv(sorted)}
            className="btn-secondary shrink-0 text-sm"
          >
            Exportar
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-zinc-50/80 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
              <tr>
                <th className="px-4 py-2.5">Folio OC</th>
                <th className="px-4 py-2.5">Proveedor</th>
                <th className="px-4 py-2.5">Obra</th>
                <th className="px-4 py-2.5 text-right">Monto total OC</th>
                <th className="px-4 py-2.5 text-right">A pagar</th>
                <th className="px-4 py-2.5 text-right">Pagado</th>
                <th className="px-4 py-2.5 text-right">Saldo pendiente</th>
                <th className="px-4 py-2.5">Fecha pago</th>
                <th className="px-4 py-2.5">Estatus</th>
                <th className="px-4 py-2.5 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {pageItems.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-12 text-center text-zinc-500">
                    No hay pagos que coincidan con los filtros seleccionados.
                  </td>
                </tr>
              ) : (
                pageItems.map((order) => {
                  const payDate = latestPaymentDate(order) ?? order.paymentDueDate;
                  const pending = isPendingAuthorization(order);
                  const estatus = direccionPagoEstatus(order);
                  return (
                    <tr key={order.id} className="hover:bg-zinc-50/60">
                      <td className="px-4 py-2.5">
                        <OcLink order={order} showPdfIcon className="text-sm" />
                      </td>
                      <td className="max-w-[9rem] truncate px-4 py-2.5 text-zinc-700">{order.supplierName}</td>
                      <td className="max-w-[8rem] truncate px-4 py-2.5 font-medium text-sky-800">{order.obraName}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-zinc-700">
                        {formatMoney(order.totalAmount, order.currency)}
                      </td>
                      <td className="px-4 py-2.5 text-right font-medium tabular-nums text-zinc-900">
                        {formatMoney(amountToPay(order), order.currency)}
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-emerald-700">
                        {formatMoney(order.amountPaidSoFar, order.currency)}
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-orange-700">
                        {formatMoney(order.amountRemaining, order.currency)}
                      </td>
                      <td className="px-4 py-2.5 tabular-nums text-zinc-600">
                        {payDate ? formatDateShort(payDate) : "—"}
                      </td>
                      <td className="px-4 py-2.5">
                        <PagoStatusBadge order={order} />
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <OrderActionMenu
                          order={order}
                          primaryLabel={pending || estatus === "pendiente_autorizar" ? "Revisar" : "Ver detalle"}
                          primaryHref={`/ordenes/${order.id}${pending ? "" : "#pagos"}`}
                          appearance="neutral"
                        />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-zinc-100 px-4 py-3 text-sm text-zinc-600">
          <p>
            Mostrando {rangeStart} a {rangeEnd} de {sorted.length} pago{sorted.length === 1 ? "" : "s"}
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-xs">
              Filas
              <select
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value) as (typeof PAGE_SIZE_OPTIONS)[number])}
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

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        <section className="card p-4">
          <div className="mb-2 flex items-center justify-between gap-2">
            <h3 className="text-sm font-bold text-zinc-900">Pagos parciales activos</h3>
            <button
              type="button"
              onClick={() => setTab("parciales")}
              className="text-[11px] font-medium text-sky-700 hover:underline"
            >
              Ver todos
            </button>
          </div>
          <ul className="space-y-3">
            {partialsBottom.length === 0 ? (
              <li className="py-3 text-center text-xs text-zinc-400">Sin parcialidades activas.</li>
            ) : (
              partialsBottom.map((o) => {
                const prog = partialProgress(o);
                return (
                  <li key={o.id}>
                    <Link href={`/ordenes/${o.id}`} className="block rounded-xl px-1 py-1 hover:bg-sky-50/50">
                      <p className="truncate text-xs font-semibold text-zinc-800">
                        {o.ocFolio || o.title} · {o.supplierName}
                      </p>
                      <div className="mt-1.5 flex items-center gap-2">
                        <div className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-zinc-200">
                          <div className="h-full rounded-full bg-sky-500" style={{ width: `${prog.pct}%` }} />
                        </div>
                        <span className="shrink-0 text-[10px] font-semibold text-sky-700">{prog.pct}%</span>
                      </div>
                      <p className="mt-0.5 text-[11px] tabular-nums text-zinc-500">
                        {formatMoney(o.amountPaidSoFar, o.currency)} de {formatMoney(o.totalAmount, o.currency)}
                      </p>
                    </Link>
                  </li>
                );
              })
            )}
          </ul>
        </section>

        <section className="card p-4">
          <div className="mb-2 flex items-center justify-between gap-2">
            <h3 className="text-sm font-bold text-zinc-900">Próximos pagos programados</h3>
            <button
              type="button"
              onClick={() => {
                setTab("pendientes");
                setFilter("estatus", "programado");
              }}
              className="text-[11px] font-medium text-orange-700 hover:underline"
            >
              Ver todos
            </button>
          </div>
          <ul className="space-y-2">
            {upcoming.length === 0 ? (
              <li className="py-3 text-center text-xs text-zinc-400">Sin pagos programados próximos.</li>
            ) : (
              upcoming.map((o) => (
                <li key={o.id}>
                  <Link
                    href={`/ordenes/${o.id}`}
                    className="flex items-start justify-between gap-2 rounded-xl px-1 py-1.5 hover:bg-orange-50/40"
                  >
                    <span className="min-w-0">
                      <span className="block text-[11px] font-semibold text-violet-700">
                        {o.paymentDueDate ? formatDateShort(o.paymentDueDate) : "—"}
                      </span>
                      <span className="block truncate text-xs font-medium text-zinc-800">
                        {o.ocFolio || o.title} · {o.supplierName}
                      </span>
                    </span>
                    <span className="shrink-0 text-xs font-bold tabular-nums text-zinc-900">
                      {formatMoney(amountToPay(o), o.currency)}
                    </span>
                  </Link>
                </li>
              ))
            )}
          </ul>
        </section>

        <section className="card p-4">
          <div className="mb-2 flex items-center justify-between gap-2">
            <h3 className="text-sm font-bold text-zinc-900">Resumen de pagos por obra (este mes)</h3>
            <Link href="/reportes" className="text-[11px] font-medium text-violet-700 hover:underline">
              Ver reporte
            </Link>
          </div>
          <ul className="space-y-3">
            {obraResumen.length === 0 ? (
              <li className="py-3 text-center text-xs text-zinc-400">Sin pagos este mes.</li>
            ) : (
              obraResumen.map((row) => (
                <li key={row.obraId}>
                  <Link href={`/obras/${row.obraId}`} className="block rounded-xl px-1 py-1 hover:bg-violet-50/40">
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="truncate font-semibold text-zinc-800">{row.name}</span>
                      <span className="shrink-0 font-bold tabular-nums text-zinc-900">
                        {formatMoney(row.total, currency)}
                      </span>
                    </div>
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-zinc-200">
                      <div
                        className="h-full rounded-full bg-violet-500"
                        style={{ width: `${row.pct}%` }}
                      />
                    </div>
                    <p className="mt-0.5 text-[10px] text-violet-700">{row.pct}% del gasto del mes</p>
                  </Link>
                </li>
              ))
            )}
          </ul>
        </section>
      </div>
    </div>
  );
}

function isPendingAuthorization(order: PurchaseOrderDto): boolean {
  return order.status === "awaitingPayment" || order.status === "awaitingPatyDeadline";
}
