"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { OrderActionMenu } from "@/components/obras/order-action-menu";
import { PagosProcesoBListPanel } from "@/components/dashboard/pagos-direct-expenses-panel";
import { OcLink } from "@/components/ui/oc-link";
import { LoadingScreen } from "@/components/ui/loading-screen";
import { useSession } from "@/components/session-provider";
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
import type { DirectExpenseDto, ObraDto, PurchaseOrderDto, RecurringCommitmentDto, SupplierDto } from "@/lib/domain/types";
import { formatDateShort, formatMoney } from "@/lib/format";
import { PagosRecurringCommitmentsPanel } from "@/components/dashboard/pagos-recurring-commitments-panel";
import { CompromisoRecurrenteModal } from "@/components/pagos/compromiso-recurrente-modal";

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

type KpiIconKind = "pending" | "paid" | "partial" | "committed";

function KpiIcon({ kind }: { kind: KpiIconKind }) {
  const cls = "h-5 w-5";
  if (kind === "pending") {
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
  if (kind === "paid") {
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
  if (kind === "partial") {
    return (
      <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z"
        />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z"
        />
      </svg>
    );
  }
  return (
    <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
      />
    </svg>
  );
}

function KpiCard({
  label,
  value,
  sub,
  accent,
  icon,
  iconBg,
  href,
  onClick,
  emphasis,
}: {
  label: string;
  value: string;
  sub: string;
  accent: string;
  icon: KpiIconKind;
  iconBg: string;
  href?: string;
  onClick?: () => void;
  /** Destaca el KPI de acción (p. ej. pendientes). */
  emphasis?: boolean;
}) {
  const className = `dash-panel flex h-full min-w-0 flex-col border-l-4 p-4 text-left sm:p-5 ${accent} ${
    emphasis ? "ring-1 ring-orange-300/70 shadow-sm" : ""
  } ${href || onClick ? "transition hover:shadow-md" : ""}`;

  const inner = (
    <>
      <div className="flex items-start justify-between gap-3">
        <span
          className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${iconBg}`}
          aria-hidden
        >
          <KpiIcon kind={icon} />
        </span>
        <p
          className={`min-w-0 flex-1 text-right font-bold tabular-nums tracking-tight text-zinc-900 ${
            emphasis
              ? "text-2xl sm:text-3xl lg:text-[2rem]"
              : "text-xl sm:text-2xl lg:text-[1.75rem]"
          }`}
        >
          {value}
        </p>
      </div>
      <p className="mt-3 text-sm font-semibold leading-snug text-zinc-800 sm:text-[15px]">{label}</p>
      <p className="dash-caption mt-1.5">{sub}</p>
    </>
  );

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={className}>
        {inner}
      </button>
    );
  }

  if (href) {
    return (
      <Link href={href} className={className}>
        {inner}
      </Link>
    );
  }
  return <div className={className}>{inner}</div>;
}

export function DireccionPagosView({ onRegisterRefresh }: { onRegisterRefresh?: (fn: () => void) => void }) {
  const { user } = useSession();
  const [orders, setOrders] = useState<PurchaseOrderDto[]>([]);
  const [obras, setObras] = useState<ObraDto[]>([]);
  const [expenses, setExpenses] = useState<DirectExpenseDto[]>([]);
  const [commitments, setCommitments] = useState<RecurringCommitmentDto[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<DireccionPagoTab>("todos");
  const [filters, setFilters] = useState<DireccionPagosFilters>(EMPTY_FILTERS);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<(typeof PAGE_SIZE_OPTIONS)[number]>(15);
  const [compromisoModalOpen, setCompromisoModalOpen] = useState(false);
  const [editingCommitment, setEditingCommitment] = useState<RecurringCommitmentDto | null>(null);

  const canManageCommitments = user?.role === "pagos";
  const canOpenReportes = user?.role === "direccion";

  const load = useCallback(async () => {
    const [oRes, ordRes, expRes, comRes, supRes] = await Promise.all([
      fetch("/api/obras", { credentials: "include" }),
      fetch("/api/orders", { credentials: "include" }),
      fetch("/api/direct-expenses?includeCompleted=1", { credentials: "include" }),
      fetch("/api/recurring-commitments", { credentials: "include" }),
      fetch("/api/suppliers", { credentials: "include" }),
    ]);
    if (oRes.ok) {
      const d = (await oRes.json()) as { obras: ObraDto[] };
      setObras(d.obras);
    }
    if (ordRes.ok) {
      const d = (await ordRes.json()) as { orders: PurchaseOrderDto[] };
      setOrders(d.orders);
    }
    if (expRes.ok) {
      const d = (await expRes.json()) as { expenses: DirectExpenseDto[] };
      setExpenses(d.expenses);
    }
    if (comRes.ok) {
      const d = (await comRes.json()) as { commitments: RecurringCommitmentDto[] };
      setCommitments(d.commitments);
    }
    if (supRes.ok) {
      const d = (await supRes.json()) as { suppliers: SupplierDto[] };
      setSuppliers(d.suppliers);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
    onRegisterRefresh?.(() => void load());
  }, [load, onRegisterRefresh]);

  useEffect(() => {
    if (typeof window === "undefined" || loading) return;

    function scrollToHash() {
      if (window.location.hash === "#compromisos") {
        document.getElementById("compromisos")?.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }

    scrollToHash();
    window.addEventListener("hashchange", scrollToHash);
    return () => window.removeEventListener("hashchange", scrollToHash);
  }, [loading]);

  const currency = orders[0]?.currency ?? "MXN";
  const kpis = useMemo(() => pagosPageKpis(orders), [orders]);
  const supplierNames = useMemo(() => uniqueSuppliers(orders), [orders]);

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

  function focusPagosLista(
    nextTab: DireccionPagoTab,
    nextFilters?: Partial<DireccionPagosFilters>
  ) {
    setTab(nextTab);
    if (nextFilters) {
      setFilters((f) => ({ ...f, ...nextFilters }));
    } else if (nextTab === "parciales" || nextTab === "todos" || nextTab === "realizados") {
      setFilters(EMPTY_FILTERS);
    }
    requestAnimationFrame(() => {
      document.getElementById("pagos-lista")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  function openNewCompromiso() {
    setEditingCommitment(null);
    setCompromisoModalOpen(true);
  }

  function openEditCompromiso(c: RecurringCommitmentDto) {
    setEditingCommitment(c);
    setCompromisoModalOpen(true);
  }

  if (loading) return <LoadingScreen message="Cargando pagos" />;

  const rangeStart = sorted.length === 0 ? 0 : (page - 1) * pageSize + 1;
  const rangeEnd = Math.min(page * pageSize, sorted.length);

  return (
    <div className="space-y-5 lg:space-y-6">
      <div>
        <h1 className="dash-page-title">Pagos</h1>
        <p className="dash-body mt-1 text-zinc-600">
          Seguimiento de pagos del consorcio. Primero el resumen, luego la cola de OC.
        </p>
      </div>

      {/* 1) KPIs — etiqueta legible arriba, monto grande abajo */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Pendientes de autorizar"
          value={formatMoney(kpis.pendientesAmount, currency)}
          sub={`${kpis.pendientesCount} pago${kpis.pendientesCount === 1 ? "" : "s"} · acción prioritaria`}
          accent="border-l-orange-500 bg-orange-50/50"
          icon="pending"
          iconBg="bg-orange-100 text-orange-700"
          onClick={() => focusPagosLista("pendientes", { estatus: "" })}
          emphasis
        />
        <KpiCard
          label="Realizados este mes"
          value={formatMoney(kpis.realizadosMes, currency)}
          sub={`${kpis.realizadosCount} pago${kpis.realizadosCount === 1 ? "" : "s"}`}
          accent="border-l-emerald-500 bg-emerald-50/45"
          icon="paid"
          iconBg="bg-emerald-100 text-emerald-800"
          onClick={() => focusPagosLista("realizados")}
        />
        <KpiCard
          label="Parciales activos"
          value={String(kpis.parcialesCount)}
          sub="Con saldo pendiente"
          accent="border-l-sky-500 bg-sky-50/45"
          icon="partial"
          iconBg="bg-sky-100 text-sky-800"
          onClick={() => focusPagosLista("parciales")}
        />
        <KpiCard
          label="Total comprometido"
          value={formatMoney(kpis.totalComprometido, currency)}
          sub={canOpenReportes ? "Ver resumen en reportes →" : "Ver gasto por obra abajo →"}
          accent="border-l-violet-500 bg-violet-50/45"
          icon="committed"
          iconBg="bg-violet-100 text-violet-800"
          href={canOpenReportes ? "/reportes" : undefined}
          onClick={
            canOpenReportes
              ? undefined
              : () => {
                  document
                    .getElementById("pagos-por-obra")
                    ?.scrollIntoView({ behavior: "smooth", block: "start" });
                }
          }
        />
      </div>

      {/* 2) Panel principal: todos los pagos / tabs */}
      <div id="pagos-lista" className="dash-panel scroll-mt-24 overflow-hidden">
        <div className="border-b border-zinc-100 px-4 pt-4 sm:px-5">
          <h2 className="dash-section-title">Órdenes y pagos</h2>
          <p className="dash-caption mt-0.5 mb-3">Filtra por estado, obra o proveedor</p>
          <div className="flex flex-wrap gap-1">
          {DIRECCION_PAGO_TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              id={t.key === "pendientes" ? "tab-pendientes" : t.key === "parciales" ? "tab-parciales" : undefined}
              onClick={() => setTab(t.key)}
              className={`rounded-t-lg px-3 py-2.5 text-sm font-semibold transition ${
                tab === t.key
                  ? "bg-orange-50 text-orange-900"
                  : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900"
              }`}
            >
              {t.label}
            </button>
          ))}
          </div>
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
              {supplierNames.map((s) => (
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
              onClick={() => focusPagosLista("parciales")}
              className="text-xs font-semibold text-sky-700 hover:underline"
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
              onClick={() => focusPagosLista("pendientes", { estatus: "programado" })}
              className="text-xs font-semibold text-orange-700 hover:underline"
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

        <section id="pagos-por-obra" className="card scroll-mt-24 p-4">
          <div className="mb-2 flex items-center justify-between gap-2">
            <h3 className="text-sm font-bold text-zinc-900">Resumen de pagos por obra (este mes)</h3>
            {canOpenReportes ? (
              <Link href="/reportes" className="text-xs font-semibold text-violet-700 hover:underline">
                Ver reporte
              </Link>
            ) : (
              <Link href="/obras" className="text-xs font-semibold text-violet-700 hover:underline">
                Ver obras
              </Link>
            )}
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

      {/* Compromisos recurrentes — también son pagos; módulo completo en /compromisos */}
      <section id="compromisos" className="scroll-mt-24 space-y-2">
        <div>
          <h2 className="dash-section-title">Compromisos recurrentes</h2>
          <p className="dash-caption mt-0.5">
            Servicios y gastos que se repiten. El módulo completo está en Compromisos.
          </p>
        </div>
        <PagosRecurringCommitmentsPanel
          commitments={commitments}
          onNew={openNewCompromiso}
          onEdit={openEditCompromiso}
          onMutated={() => void load()}
          variant="embedded"
          canManage={canManageCommitments}
          showModuleLink
        />
      </section>

      {/* 3) Gastos directos Proceso B — jerarquía inferior */}
      {(user?.role === "pagos" || user?.role === "direccion") && (
        <section className="space-y-2">
          <div>
            <h2 className="dash-section-title text-zinc-700">Gastos directos (Proceso B)</h2>
            <p className="dash-caption mt-0.5">
              Secundario respecto a OC: compromisos y pagos sin orden de compra.
            </p>
          </div>
          <PagosProcesoBListPanel
            expenses={expenses}
            role={user?.role}
            title="Listado Proceso B"
            subtitle="Sin OC — consulta y registra pagos de gasto directo"
          />
        </section>
      )}

      {canManageCommitments && (
        <CompromisoRecurrenteModal
          open={compromisoModalOpen}
          onClose={() => {
            setCompromisoModalOpen(false);
            setEditingCommitment(null);
          }}
          onSaved={() => void load()}
          suppliers={suppliers}
          editing={editingCommitment}
          obras={obras}
        />
      )}
    </div>
  );
}

function isPendingAuthorization(order: PurchaseOrderDto): boolean {
  return order.status === "awaitingPayment" || order.status === "awaitingPatyDeadline";
}
