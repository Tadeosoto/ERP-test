"use client";

import Link from "next/link";
import { useMemo } from "react";
import { DireccionDonutChart, DireccionLineChart } from "@/components/dashboard/direccion-charts";
import { HomeActivitySidebar } from "@/components/dashboard/home-activity-sidebar";
import { RoleActivityIcon } from "@/components/dashboard/role-activity-icon";
import { OcLink } from "@/components/ui/oc-link";
import {
  activePartialOrders,
  authorizedPaymentsCountMonth,
  direccionAlerts,
  direccionKpiCounts,
  kpiMonthGrowth,
  last6MonthsSpend,
  partialProgress,
  paymentSummary,
  pendingAuthorizationCount,
  pendingAuthorizationOrders,
  spendByObraThisMonth,
  topSuppliersThisMonth,
} from "@/lib/dashboard/direccion-dashboard";
import { ROLE_LABEL } from "@/lib/domain/labels";
import type { MovementDto, ObraDto, PendingMovementDto, PurchaseOrderDto } from "@/lib/domain/types";
import { formatDateShort, formatMoney } from "@/lib/format";

function KpiCard({
  label,
  value,
  sub,
  accent,
  iconBg,
  href,
  linkClass,
  icon,
}: {
  label: string;
  value: string;
  sub: string;
  accent: string;
  iconBg: string;
  href: string;
  linkClass: string;
  icon: "wallet" | "hourglass" | "doc" | "check";
}) {
  return (
    <Link
      href={href}
      className={`flex h-full min-w-0 flex-col rounded-2xl border border-orange-100/80 border-l-4 p-3 shadow-sm transition hover:shadow-md lg:p-3.5 ${accent}`}
    >
      <div className="flex items-start justify-between gap-2">
        <span className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl lg:h-10 lg:w-10 ${iconBg}`}>
          {icon === "wallet" && (
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
          )}
          {icon === "hourglass" && (
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          )}
          {icon === "doc" && (
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          )}
          {icon === "check" && (
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          )}
        </span>
        <span className="text-right text-lg font-bold tabular-nums leading-tight text-zinc-900 lg:text-xl">
          {value}
        </span>
      </div>
      <p className="mt-2 text-xs font-semibold leading-snug text-zinc-800 lg:text-sm">{label}</p>
      <p className={`mt-0.5 text-[11px] lg:text-xs ${linkClass}`}>{sub}</p>
    </Link>
  );
}

const ALERT_TONE: Record<string, string> = {
  red: "border-red-200 bg-red-50/80 text-red-900",
  amber: "border-amber-200 bg-amber-50/80 text-amber-950",
  violet: "border-violet-200 bg-violet-50/80 text-violet-950",
};

export function DireccionHomeDashboard({
  userName,
  orders,
  obras,
  recentMovements,
  pendingMovements,
}: {
  userName: string;
  orders: PurchaseOrderDto[];
  obras: ObraDto[];
  recentMovements: MovementDto[];
  pendingMovements: PendingMovementDto[];
}) {
  const currency = orders[0]?.currency ?? "MXN";

  const kpis = useMemo(() => direccionKpiCounts(orders), [orders]);
  const growth = useMemo(() => kpiMonthGrowth(orders), [orders]);
  const monthly = useMemo(() => last6MonthsSpend(orders), [orders]);
  const obraSlices = useMemo(() => spendByObraThisMonth(orders, obras), [orders, obras]);
  const summary = useMemo(() => paymentSummary(orders), [orders]);
  const pendingTable = useMemo(() => pendingAuthorizationOrders(orders), [orders]);
  const partials = useMemo(() => activePartialOrders(orders), [orders]);
  const topSuppliers = useMemo(() => topSuppliersThisMonth(orders), [orders]);
  const alerts = useMemo(() => direccionAlerts(orders), [orders]);
  const authCount = useMemo(() => authorizedPaymentsCountMonth(orders), [orders]);
  const pendingCount = useMemo(() => pendingAuthorizationCount(orders), [orders]);

  const growthText =
    growth === null
      ? "Sin comparación"
      : growth >= 0
        ? `+${growth}% vs. mes anterior`
        : `${growth}% vs. mes anterior`;

  return (
    <div className="home-dashboard flex flex-col gap-3 pb-4 sm:gap-4 lg:gap-4">
      <header className="shrink-0">
        <h1 className="text-xl font-bold text-zinc-900 sm:text-2xl">
          ¡Hola, {userName.replace(/^Ing\.\s*/i, "").trim() || userName}!
        </h1>
        <p className="mt-0.5 flex items-start gap-2 text-xs text-zinc-500 sm:items-center sm:text-sm">
          <RoleActivityIcon role="direccion" size="sm" />
          <span>{ROLE_LABEL.direccion} · Resumen general de pagos, gastos y autorizaciones pendientes.</span>
        </p>
      </header>

      <div className="grid shrink-0 grid-cols-2 gap-2 lg:grid-cols-4 lg:gap-3">
        <KpiCard
          label="Gasto total este mes"
          value={formatMoney(kpis.gastoTotalMes, currency)}
          sub={growthText}
          accent="border-l-violet-400 bg-violet-50/35"
          iconBg="bg-violet-100 text-violet-800"
          href="/reportes"
          linkClass="text-emerald-700"
          icon="wallet"
        />
        <KpiCard
          label="Pagos pendientes de autorizar"
          value={formatMoney(kpis.pagosPendientesAutorizar, currency)}
          sub={`${pendingCount} pago${pendingCount === 1 ? "" : "s"}`}
          accent="border-l-orange-400 bg-orange-50/40"
          iconBg="bg-orange-100 text-orange-700"
          href="/pagos"
          linkClass="text-orange-700"
          icon="hourglass"
        />
        <KpiCard
          label="Pagos parciales activos"
          value={String(kpis.pagosParcialesActivos)}
          sub="Con saldo pendiente"
          accent="border-l-sky-400 bg-sky-50/35"
          iconBg="bg-sky-100 text-sky-800"
          href="/pagos"
          linkClass="text-sky-800"
          icon="doc"
        />
        <KpiCard
          label="Pagos autorizados este mes"
          value={formatMoney(kpis.pagosAutorizadosMes, currency)}
          sub={`${authCount} pago${authCount === 1 ? "" : "s"} →`}
          accent="border-l-emerald-400 bg-emerald-50/35"
          iconBg="bg-emerald-100 text-emerald-800"
          href="/pagos"
          linkClass="text-emerald-800"
          icon="check"
        />
      </div>

      <div className="grid grid-cols-1 gap-3 xl:grid-cols-3">
        <section className="card p-4 xl:col-span-1">
          <h3 className="text-sm font-bold text-zinc-900">Gasto mensual (últimos 6 meses)</h3>
          <div className="mt-3">
            <DireccionLineChart data={monthly} currency={currency} />
          </div>
        </section>

        <section className="card p-4 xl:col-span-1">
          <h3 className="text-sm font-bold text-zinc-900">Gasto por obra</h3>
          <p className="mt-0.5 text-xs text-zinc-500">Distribución del mes en curso</p>
          <div className="mt-4">
            <DireccionDonutChart slices={obraSlices} />
          </div>
        </section>

        <section className="card p-4 xl:col-span-1">
          <h3 className="text-sm font-bold text-zinc-900">Resumen de pagos</h3>
          <ul className="mt-3 space-y-3 text-sm">
            <li className="flex items-center justify-between gap-2">
              <span className="text-zinc-600">Pagado</span>
              <span className="text-right font-semibold tabular-nums text-zinc-900">
                {formatMoney(summary.pagado.amount, currency)}
                <span className="block text-[11px] font-normal text-zinc-500">
                  {summary.pagado.count} pago{summary.pagado.count === 1 ? "" : "s"}
                </span>
              </span>
            </li>
            <li className="flex items-center justify-between gap-2">
              <span className="text-zinc-600">Pendiente de autorizar</span>
              <span className="text-right font-semibold tabular-nums text-orange-800">
                {formatMoney(summary.pendienteAutorizar.amount, currency)}
                <span className="block text-[11px] font-normal text-zinc-500">
                  {summary.pendienteAutorizar.count} pago{summary.pendienteAutorizar.count === 1 ? "" : "s"}
                </span>
              </span>
            </li>
            <li className="flex items-center justify-between gap-2">
              <span className="text-zinc-600">En proceso / Parciales</span>
              <span className="text-right font-semibold tabular-nums text-sky-800">
                {formatMoney(summary.enProcesoParciales.amount, currency)}
                <span className="block text-[11px] font-normal text-zinc-500">
                  {summary.enProcesoParciales.count} pago{summary.enProcesoParciales.count === 1 ? "" : "s"}
                </span>
              </span>
            </li>
          </ul>
          <div className="mt-4 rounded-xl bg-violet-50 px-3 py-2.5 ring-1 ring-violet-100">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-violet-700">Total comprometido</p>
            <p className="mt-0.5 text-lg font-bold tabular-nums text-violet-950">
              {formatMoney(summary.totalComprometido, currency)}
            </p>
          </div>
        </section>
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        <section className="card overflow-hidden lg:col-span-2">
          <div className="flex items-center justify-between gap-2 border-b border-zinc-100 px-4 py-3">
            <h3 className="text-sm font-bold text-zinc-900">Pagos pendientes de autorizar</h3>
            <Link href="/pagos" className="text-xs font-medium text-orange-700 hover:underline">
              Ver todos →
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-zinc-50/80 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                <tr>
                  <th className="px-4 py-2">Folio OC</th>
                  <th className="px-4 py-2">Proveedor</th>
                  <th className="px-4 py-2">Obra</th>
                  <th className="px-4 py-2 text-right">Monto a pagar</th>
                  <th className="px-4 py-2">Parcialidad</th>
                  <th className="px-4 py-2">Fecha solicitud</th>
                  <th className="px-4 py-2 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {pendingTable.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-sm text-zinc-500">
                      No hay pagos pendientes en cola.
                    </td>
                  </tr>
                ) : (
                  pendingTable.map((order) => {
                    const prog = partialProgress(order);
                    const monto = order.amountRemaining > 0 ? order.amountRemaining : order.totalAmount;
                    return (
                      <tr key={order.id} className="hover:bg-zinc-50/60">
                        <td className="px-4 py-2">
                          <OcLink order={order} className="text-sm" />
                        </td>
                        <td className="max-w-[8rem] truncate px-4 py-2 text-zinc-700">{order.supplierName}</td>
                        <td className="max-w-[7rem] truncate px-4 py-2 font-medium text-sky-800">{order.obraName}</td>
                        <td className="px-4 py-2 text-right font-semibold tabular-nums">{formatMoney(monto, order.currency)}</td>
                        <td className="px-4 py-2">
                          {order.paymentType === "parcialidades" ? (
                            <div className="min-w-[5rem]">
                              <div className="h-1.5 overflow-hidden rounded-full bg-zinc-200">
                                <div className="h-full rounded-full bg-sky-500" style={{ width: `${prog.pct}%` }} />
                              </div>
                              <span className="mt-0.5 block text-[10px] text-zinc-500">{prog.pct}% pagado</span>
                            </div>
                          ) : (
                            <span className="text-xs text-zinc-400">—</span>
                          )}
                        </td>
                        <td className="px-4 py-2 tabular-nums text-zinc-600">{formatDateShort(order.createdAt)}</td>
                        <td className="px-4 py-2 text-right">
                          <Link
                            href={`/ordenes/${order.id}`}
                            className="inline-flex rounded-lg border border-violet-200 bg-violet-50 px-3 py-1.5 text-xs font-semibold text-violet-800 hover:bg-violet-100"
                          >
                            Revisar
                          </Link>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="card p-4">
          <div className="mb-2 flex items-center justify-between gap-2">
            <h3 className="text-sm font-bold text-zinc-900">Pagos parciales activos</h3>
            <Link href="/pagos" className="text-[11px] font-medium text-sky-700 hover:underline">
              Ver
            </Link>
          </div>
          <ul className="space-y-2">
            {partials.length === 0 ? (
              <li className="py-4 text-center text-xs text-zinc-400">Sin parcialidades activas.</li>
            ) : (
              partials.map((o) => {
                const prog = partialProgress(o);
                return (
                  <li key={o.id}>
                    <Link
                      href={`/ordenes/${o.id}`}
                      className="block rounded-xl border border-transparent px-2 py-2 transition hover:border-sky-100 hover:bg-sky-50/40"
                    >
                      <p className="truncate text-xs font-semibold text-zinc-800">
                        {o.ocFolio || o.title} · {o.supplierName}
                      </p>
                      <p className="mt-1 text-[11px] font-medium tabular-nums text-orange-800">
                        {formatMoney(o.amountRemaining, o.currency)} pendiente
                      </p>
                      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-zinc-200">
                        <div className="h-full rounded-full bg-sky-500" style={{ width: `${prog.pct}%` }} />
                      </div>
                    </Link>
                  </li>
                );
              })
            )}
          </ul>
        </section>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <section className="card p-4">
          <h3 className="text-sm font-bold text-zinc-900">Gasto por obra (este mes)</h3>
          <ul className="mt-3 space-y-2">
            {obraSlices.length === 0 ? (
              <li className="text-xs text-zinc-400">Sin datos este mes.</li>
            ) : (
              obraSlices.slice(0, 4).map((row) => (
                <li key={row.obraId}>
                  <Link href={`/obras/${row.obraId}`} className="flex items-center gap-2 rounded-lg px-1 py-1 hover:bg-zinc-50">
                    <span className="h-2 w-2 shrink-0 rounded-full bg-violet-500" />
                    <span className="min-w-0 flex-1 truncate text-xs font-medium text-zinc-800">{row.name}</span>
                    <span className="shrink-0 text-xs font-semibold text-violet-700">{row.pct}%</span>
                  </Link>
                </li>
              ))
            )}
          </ul>
        </section>

        <section className="card p-4">
          <h3 className="text-sm font-bold text-zinc-900">Top proveedores (este mes)</h3>
          <ul className="mt-3 space-y-2">
            {topSuppliers.length === 0 ? (
              <li className="text-xs text-zinc-400">Sin pagos a proveedores este mes.</li>
            ) : (
              topSuppliers.map((p) => (
                <li key={p.name} className="flex items-start justify-between gap-2 text-xs">
                  <span className="min-w-0 truncate font-medium text-zinc-800">{p.name}</span>
                  <span className="shrink-0 font-semibold tabular-nums text-zinc-700">
                    {formatMoney(p.total, currency)}
                  </span>
                </li>
              ))
            )}
          </ul>
        </section>

        <section className="card p-4 sm:col-span-2 lg:col-span-1">
          <h3 className="text-sm font-bold text-zinc-900">Alertas importantes</h3>
          <ul className="mt-3 space-y-2">
            {alerts.length === 0 ? (
              <li className="rounded-xl border border-emerald-100 bg-emerald-50/50 px-3 py-2 text-xs text-emerald-800">
                Sin alertas críticas. El flujo avanza con normalidad.
              </li>
            ) : (
              alerts.map((a) => (
                <li key={a.id}>
                  <Link
                    href={a.href}
                    className={`block rounded-xl border px-3 py-2.5 text-xs leading-relaxed ${ALERT_TONE[a.tone]}`}
                  >
                    {a.message}
                  </Link>
                </li>
              ))
            )}
          </ul>
        </section>
      </div>

      <section className="card p-4">
        <div className="mb-2 flex items-center justify-between gap-2">
          <h3 className="text-sm font-bold text-zinc-900">Actividad del equipo</h3>
          <Link href="/movimientos" className="text-xs font-medium text-indigo-700 hover:underline">
            Ver todos los movimientos →
          </Link>
        </div>
        <HomeActivitySidebar
          compact
          limit={4}
          recentMovements={recentMovements}
          pendingMovements={pendingMovements}
        />
      </section>
    </div>
  );
}
