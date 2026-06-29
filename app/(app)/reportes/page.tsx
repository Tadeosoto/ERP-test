"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { DireccionDonutChart, DireccionLineChart } from "@/components/dashboard/direccion-charts";
import {
  direccionKpiCounts,
  kpiMonthGrowth,
  last6MonthsSpend,
  paymentSummary,
  spendByObraThisMonth,
  topSuppliersThisMonth,
} from "@/lib/dashboard/direccion-dashboard";
import type { ObraDto, PurchaseOrderDto } from "@/lib/domain/types";
import { formatMoney } from "@/lib/format";
import { LoadingScreen } from "@/components/ui/loading-screen";
import { useSession } from "@/components/session-provider";
import { useRouter } from "next/navigation";

function ReportesInner() {
  const { user } = useSession();
  const router = useRouter();
  const [orders, setOrders] = useState<PurchaseOrderDto[]>([]);
  const [obras, setObras] = useState<ObraDto[]>([]);
  const [loading, setLoading] = useState(true);

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
    if (user && user.role !== "direccion") {
      router.replace("/inicio");
      return;
    }
    void load();
  }, [user, load, router]);

  const currency = orders[0]?.currency ?? "MXN";
  const monthly = useMemo(() => last6MonthsSpend(orders), [orders]);
  const obraSlices = useMemo(() => spendByObraThisMonth(orders, obras), [orders, obras]);
  const summary = useMemo(() => paymentSummary(orders), [orders]);
  const kpis = useMemo(() => direccionKpiCounts(orders), [orders]);
  const growth = useMemo(() => kpiMonthGrowth(orders), [orders]);
  const topSuppliers = useMemo(() => topSuppliersThisMonth(orders), [orders]);

  if (loading || !user) return <LoadingScreen message="Cargando reportes" />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">Reportes</h1>
        <p className="mt-1 text-sm text-zinc-600">
          Vista consolidada de gastos, pagos y proveedores del consorcio.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: "Gasto del mes", value: formatMoney(kpis.gastoTotalMes, currency) },
          {
            label: "Vs. mes anterior",
            value: growth === null ? "—" : `${growth >= 0 ? "+" : ""}${growth}%`,
          },
          { label: "Pendiente autorizar", value: formatMoney(kpis.pagosPendientesAutorizar, currency) },
          { label: "Total comprometido", value: formatMoney(summary.totalComprometido, currency) },
        ].map((item) => (
          <div key={item.label} className="card p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">{item.label}</p>
            <p className="mt-1 text-lg font-bold tabular-nums text-zinc-900">{item.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <section className="card p-5">
          <h2 className="text-sm font-bold text-zinc-900">Gasto mensual (6 meses)</h2>
          <div className="mt-4">
            <DireccionLineChart data={monthly} currency={currency} />
          </div>
        </section>
        <section className="card p-5">
          <h2 className="text-sm font-bold text-zinc-900">Gasto por obra (mes actual)</h2>
          <div className="mt-4">
            <DireccionDonutChart slices={obraSlices} />
          </div>
        </section>
      </div>

      <section className="card p-5">
        <h2 className="text-sm font-bold text-zinc-900">Top proveedores del mes</h2>
        <ul className="mt-3 divide-y divide-zinc-100">
          {topSuppliers.length === 0 ? (
            <li className="py-4 text-sm text-zinc-500">Sin pagos registrados este mes.</li>
          ) : (
            topSuppliers.map((p) => (
              <li key={p.name} className="flex items-center justify-between gap-4 py-3 text-sm">
                <span className="font-medium text-zinc-800">{p.name}</span>
                <span className="font-semibold tabular-nums">{formatMoney(p.total, currency)}</span>
              </li>
            ))
          )}
        </ul>
      </section>
    </div>
  );
}

export default function ReportesPage() {
  return (
    <Suspense fallback={<LoadingScreen message="Cargando reportes" />}>
      <ReportesInner />
    </Suspense>
  );
}
