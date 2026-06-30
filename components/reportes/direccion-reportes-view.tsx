"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  DireccionDonutChart,
  ReportesYoYLineChart,
} from "@/components/dashboard/direccion-charts";
import { LoadingScreen } from "@/components/ui/loading-screen";
import {
  compareRange,
  defaultMonthRange,
  expedientesResumen,
  exportReportesCsv,
  formatRangeLabel,
  monthlyYoYSpend,
  obraDetalleRows,
  paymentStatusSlices,
  paymentSummary,
  paymentsByCondition,
  reportesKpis,
  REPORTES_COMPARE_OPTIONS,
  REPORTES_TABS,
  spendByObraInRange,
  topSuppliersInRange,
  type ReportesCompareMode,
  type ReportesDateRange,
  type ReportesTab,
} from "@/lib/dashboard/direccion-reportes";
import type { ObraDto, PurchaseOrderDto } from "@/lib/domain/types";
import { formatMoney } from "@/lib/format";

function Sparkline({ values, positive }: { values: number[]; positive?: boolean }) {
  const w = 72;
  const h = 28;
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const span = max - min || 1;
  const pts = values.map((v, i) => {
    const x = values.length <= 1 ? w / 2 : (i / (values.length - 1)) * w;
    const y = h - ((v - min) / span) * (h - 4) - 2;
    return `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
  });
  const color = positive === false ? "#ea580c" : "#059669";
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="opacity-80" aria-hidden>
      <path d={pts.join(" ")} fill="none" stroke={color} strokeWidth={1.75} strokeLinecap="round" />
    </svg>
  );
}

function KpiCard({
  label,
  value,
  trend,
  sparkline,
  displayAsCount,
  currency,
}: {
  label: string;
  value: number;
  trend: number | null;
  sparkline: number[];
  displayAsCount?: boolean;
  currency: string;
}) {
  const trendText =
    trend === null
      ? "Sin comparación"
      : `${trend >= 0 ? "+" : ""}${trend}% vs. periodo anterior`;
  const positiveTrend = trend === null ? true : trend <= 0;

  return (
    <div className="rounded-2xl border border-zinc-200/80 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">{label}</p>
        <Sparkline values={sparkline} positive={label.includes("pendiente") ? false : positiveTrend} />
      </div>
      <p className="mt-2 text-xl font-bold tabular-nums text-zinc-900 lg:text-2xl">
        {displayAsCount ? value : formatMoney(value, currency)}
      </p>
      <p
        className={`mt-1 text-[11px] font-medium ${
          trend === null ? "text-zinc-400" : trend >= 0 ? "text-emerald-600" : "text-orange-600"
        }`}
      >
        {trendText}
      </p>
    </div>
  );
}

function ProgressBar({ pct }: { pct: number }) {
  return (
    <div className="flex min-w-[88px] items-center gap-2">
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-zinc-100">
        <div
          className="h-full rounded-full bg-violet-600 transition-all"
          style={{ width: `${Math.min(100, pct)}%` }}
        />
      </div>
      <span className="w-9 shrink-0 text-right text-xs font-semibold tabular-nums text-zinc-700">{pct}%</span>
    </div>
  );
}

export function DireccionReportesView({ onRegisterRefresh }: { onRegisterRefresh?: (fn: () => void) => void }) {
  const [orders, setOrders] = useState<PurchaseOrderDto[]>([]);
  const [obras, setObras] = useState<ObraDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<ReportesTab>("resumen");
  const [range, setRange] = useState<ReportesDateRange>(() => defaultMonthRange());
  const [compareMode, setCompareMode] = useState<ReportesCompareMode>("mes_anterior");

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
  const compare = useMemo(() => compareRange(range, compareMode), [range, compareMode]);

  const kpis = useMemo(() => reportesKpis(orders, range, compare), [orders, range, compare]);
  const summary = useMemo(() => paymentSummary(orders), [orders]);
  const obraSlices = useMemo(() => spendByObraInRange(orders, obras, range), [orders, obras, range]);
  const yoy = useMemo(() => monthlyYoYSpend(orders), [orders]);
  const statusSlices = useMemo(() => paymentStatusSlices(summary), [summary]);
  const topSuppliers = useMemo(() => topSuppliersInRange(orders, range), [orders, range]);
  const byCondition = useMemo(() => paymentsByCondition(orders, range), [orders, range]);
  const expResumen = useMemo(() => expedientesResumen(orders), [orders]);
  const obraRows = useMemo(() => obraDetalleRows(orders, obras, range), [orders, obras, range]);

  const showResumen = tab === "resumen";
  const showGastos = tab === "resumen" || tab === "gastos";
  const showPagos = tab === "resumen" || tab === "pagos";
  const showProveedores = tab === "resumen" || tab === "proveedores";
  const showObras = tab === "resumen" || tab === "obras";
  const showExpedientes = tab === "resumen" || tab === "expedientes";

  if (loading) return <LoadingScreen message="Cargando reportes" />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 sm:text-3xl">Reportes</h1>
          <p className="mt-1 text-sm text-zinc-600">
            Análisis de gastos, pagos, obras y proveedores.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm shadow-sm">
            <span className="text-zinc-500">Desde</span>
            <input
              type="date"
              value={range.from}
              onChange={(e) => setRange((r) => ({ ...r, from: e.target.value }))}
              className="border-0 bg-transparent p-0 text-sm font-medium text-zinc-800 focus:ring-0"
            />
          </label>
          <label className="flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm shadow-sm">
            <span className="text-zinc-500">Hasta</span>
            <input
              type="date"
              value={range.to}
              onChange={(e) => setRange((r) => ({ ...r, to: e.target.value }))}
              className="border-0 bg-transparent p-0 text-sm font-medium text-zinc-800 focus:ring-0"
            />
          </label>
          <select
            value={compareMode}
            onChange={(e) => setCompareMode(e.target.value as ReportesCompareMode)}
            className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-700 shadow-sm"
          >
            {REPORTES_COMPARE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                Comparar: {o.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => exportReportesCsv({ orders, obras, range })}
            className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-800 shadow-sm transition hover:bg-zinc-50"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
              />
            </svg>
            Exportar
          </button>
        </div>
      </div>

      <p className="text-xs font-medium text-zinc-500">Periodo: {formatRangeLabel(range)}</p>

      <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
        <div className="flex flex-wrap gap-1 border-b border-zinc-100 px-3 pt-3">
          {REPORTES_TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={`rounded-t-lg px-3 py-2 text-sm font-semibold transition ${
                tab === t.key
                  ? "bg-violet-50 text-violet-800 ring-1 ring-inset ring-violet-200/80"
                  : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {(showResumen || tab !== "expedientes") && (
        <div className="grid grid-cols-2 gap-3 xl:grid-cols-5">
          {kpis.map((k) => (
            <KpiCard
              key={k.key}
              label={k.label}
              value={k.value}
              trend={k.trend}
              sparkline={k.sparkline}
              displayAsCount={k.displayAsCount}
              currency={currency}
            />
          ))}
        </div>
      )}

      {showGastos && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-bold text-zinc-900">Gasto por obra</h2>
            <p className="mt-0.5 text-xs text-zinc-500">Distribución en el periodo seleccionado</p>
            <div className="mt-4">
              <DireccionDonutChart slices={obraSlices} />
            </div>
            {obraSlices.length > 0 && (
              <ul className="mt-3 space-y-1 border-t border-zinc-100 pt-3 text-xs text-zinc-600">
                {obraSlices.slice(0, 4).map((s) => (
                  <li key={s.obraId} className="flex justify-between gap-2">
                    <span className="truncate">{s.name}</span>
                    <span className="shrink-0 font-semibold tabular-nums">{formatMoney(s.total, currency)}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
          <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-bold text-zinc-900">Evolución de gasto mensual</h2>
            <p className="mt-0.5 text-xs text-zinc-500">Este año vs. año anterior</p>
            <div className="mt-4">
              <ReportesYoYLineChart data={yoy} currency={currency} />
            </div>
          </section>
        </div>
      )}

      {showPagos && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-bold text-zinc-900">Estado de pagos</h2>
            <p className="mt-0.5 text-xs text-zinc-500">Pagado, parcial y pendiente</p>
            <div className="mt-4">
              <DireccionDonutChart slices={statusSlices} />
            </div>
            <ul className="mt-3 space-y-2 text-xs">
              {statusSlices.map((s) => (
                <li key={s.obraId} className="flex items-center justify-between gap-2">
                  <span className="text-zinc-700">{s.name}</span>
                  <span className="font-semibold tabular-nums text-zinc-900">
                    {formatMoney(s.total, currency)} ({s.pct}%)
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-3 border-t border-zinc-100 pt-3 text-center text-xs font-semibold text-zinc-600">
              Total comprometido: {formatMoney(summary.totalComprometido, currency)}
            </p>
          </section>
          <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-bold text-zinc-900">Pagos por condición</h2>
              <Link href="/pagos" className="text-xs font-semibold text-violet-700 hover:underline">
                Ver detalle de condiciones →
              </Link>
            </div>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[280px] text-left text-sm">
                <thead>
                  <tr className="border-b border-zinc-100 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                    <th className="pb-2 pr-3">Condición</th>
                    <th className="pb-2 pr-3 text-right">Monto</th>
                    <th className="pb-2 text-right">%</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-50">
                  {byCondition.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="py-6 text-center text-zinc-500">
                        Sin pagos en el periodo.
                      </td>
                    </tr>
                  ) : (
                    byCondition.map((row) => (
                      <tr key={row.label}>
                        <td className="py-2.5 pr-3 font-medium text-zinc-800">{row.label}</td>
                        <td className="py-2.5 pr-3 text-right tabular-nums font-semibold">
                          {formatMoney(row.total, currency)}
                        </td>
                        <td className="py-2.5 text-right tabular-nums text-zinc-600">{row.pct}%</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}

      {(showProveedores || showExpedientes) && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {showProveedores && (
            <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-sm font-bold text-zinc-900">Top proveedores por gasto</h2>
                <Link href="/proveedores" className="text-xs font-semibold text-violet-700 hover:underline">
                  Ver todos los proveedores →
                </Link>
              </div>
              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[280px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-zinc-100 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                      <th className="pb-2 pr-3">Proveedor</th>
                      <th className="pb-2 pr-3 text-right">Monto</th>
                      <th className="pb-2 text-right">%</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-50">
                    {topSuppliers.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="py-6 text-center text-zinc-500">
                          Sin pagos en el periodo.
                        </td>
                      </tr>
                    ) : (
                      topSuppliers.map((row) => (
                        <tr key={row.name}>
                          <td className="py-2.5 pr-3 font-medium text-zinc-800">{row.name}</td>
                          <td className="py-2.5 pr-3 text-right tabular-nums font-semibold">
                            {formatMoney(row.total, currency)}
                          </td>
                          <td className="py-2.5 text-right tabular-nums text-zinc-600">{row.pct}%</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {showExpedientes && (
            <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-sm font-bold text-zinc-900">Resumen de expedientes</h2>
                <Link href="/expedientes" className="text-xs font-semibold text-violet-700 hover:underline">
                  Ver expedientes →
                </Link>
              </div>
              <ul className="mt-4 space-y-4">
                {[
                  { label: "Completos", data: expResumen.completos, tone: "bg-emerald-500" },
                  { label: "En proceso / Parciales", data: expResumen.enProceso, tone: "bg-sky-500" },
                  { label: "Requieren atención", data: expResumen.atencion, tone: "bg-orange-500" },
                ].map((item) => (
                  <li key={item.label}>
                    <div className="flex items-center justify-between gap-2 text-sm">
                      <span className="font-medium text-zinc-800">{item.label}</span>
                      <span className="tabular-nums text-zinc-600">
                        {item.data.count} ({item.data.pct}%)
                      </span>
                    </div>
                    <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-zinc-100">
                      <div
                        className={`h-full rounded-full ${item.tone}`}
                        style={{ width: `${Math.max(item.data.pct, item.data.count > 0 ? 4 : 0)}%` }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
              <p className="mt-4 text-xs text-zinc-500">{expResumen.total} expedientes en total</p>
            </section>
          )}
        </div>
      )}

      {showObras && (
        <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-100 px-5 py-4">
            <h2 className="text-sm font-bold text-zinc-900">Detalle de obras</h2>
            <Link href="/obras" className="text-xs font-semibold text-violet-700 hover:underline">
              Ver todas las obras →
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-100 bg-zinc-50/80 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                  <th className="px-5 py-3">Obra</th>
                  <th className="px-3 py-3 text-right">Presupuesto</th>
                  <th className="px-3 py-3 text-right">Gasto actual</th>
                  <th className="px-3 py-3 text-right">Comprometido</th>
                  <th className="px-3 py-3 text-right">Pagado</th>
                  <th className="px-3 py-3 text-right">Pendiente de pago</th>
                  <th className="px-5 py-3">% Avance financiero</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {obraRows.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-10 text-center text-zinc-500">
                      No hay movimiento registrado en obras para este periodo.
                    </td>
                  </tr>
                ) : (
                  obraRows.map((row) => (
                    <tr key={row.obraId} className="hover:bg-zinc-50/60">
                      <td className="px-5 py-3 font-medium text-zinc-900">{row.name}</td>
                      <td className="px-3 py-3 text-right tabular-nums text-zinc-700">
                        {formatMoney(row.presupuesto, currency)}
                      </td>
                      <td className="px-3 py-3 text-right tabular-nums font-semibold text-zinc-900">
                        {formatMoney(row.gastoActual, currency)}
                      </td>
                      <td className="px-3 py-3 text-right tabular-nums text-zinc-700">
                        {formatMoney(row.comprometido, currency)}
                      </td>
                      <td className="px-3 py-3 text-right tabular-nums text-emerald-700">
                        {formatMoney(row.pagado, currency)}
                      </td>
                      <td className="px-3 py-3 text-right tabular-nums text-orange-700">
                        {formatMoney(row.pendiente, currency)}
                      </td>
                      <td className="px-5 py-3">
                        <ProgressBar pct={row.avancePct} />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
