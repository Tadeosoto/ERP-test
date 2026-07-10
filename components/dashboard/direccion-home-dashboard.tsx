"use client";

import Link from "next/link";
import { useMemo } from "react";
import { DireccionExpedientesPanel } from "@/components/expedientes/direccion-expedientes-panel";
import { DireccionHomeSidebar } from "@/components/dashboard/direccion-home-sidebar";
import { RoleActivityIcon } from "@/components/dashboard/role-activity-icon";
import {
  direccionKpiCounts,
  kpiMonthGrowth,
  pendingAuthorizationCount,
} from "@/lib/dashboard/direccion-dashboard";
import { expedienteKpis } from "@/lib/dashboard/direccion-expedientes";
import { ROLE_LABEL } from "@/lib/domain/labels";
import type { MovementDto, ObraDto, PendingMovementDto, PurchaseOrderDto } from "@/lib/domain/types";
import { formatMoney } from "@/lib/format";

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
  icon: "wallet" | "hourglass" | "doc";
}) {
  return (
    <Link
      href={href}
      className={`flex h-full min-w-0 flex-col rounded-2xl border border-zinc-200/80 border-l-4 p-4 shadow-sm transition hover:shadow-md ${accent}`}
    >
      <div className="flex items-start justify-between gap-2">
        <span className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${iconBg}`}>
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
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          )}
        </span>
        <span className="text-right text-xl font-bold tabular-nums leading-tight text-zinc-900 lg:text-2xl">
          {value}
        </span>
      </div>
      <p className="mt-2 text-xs font-semibold leading-snug text-zinc-800 sm:text-sm">{label}</p>
      <p className={`mt-0.5 text-[11px] sm:text-xs ${linkClass}`}>{sub}</p>
    </Link>
  );
}

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
  const expKpis = useMemo(() => expedienteKpis(orders), [orders]);
  const growth = useMemo(() => kpiMonthGrowth(orders), [orders]);
  const pendingCount = useMemo(() => pendingAuthorizationCount(orders), [orders]);

  const tabCounts = useMemo(
    () => ({
      todos: expKpis.total,
      completos: expKpis.completos,
      en_proceso: expKpis.enProceso,
      atencion: expKpis.atencion,
    }),
    [expKpis]
  );

  const growthText =
    growth === null
      ? "Ver reportes →"
      : growth >= 0
        ? `+${growth}% vs. mes anterior`
        : `${growth}% vs. mes anterior`;

  return (
    <div className="home-dashboard flex flex-col gap-4 pb-4">
      <header className="shrink-0">
        <h1 className="text-2xl font-bold text-zinc-900 sm:text-3xl">
          ¡Hola, {userName.replace(/^Ing\.\s*/i, "").trim() || userName}!
        </h1>
        <p className="mt-1 flex items-start gap-2 text-sm text-zinc-600">
          <RoleActivityIcon role="direccion" size="sm" />
          <span>{ROLE_LABEL.direccion} · Consulta expedientes, pagos y autorizaciones del consorcio.</span>
        </p>
      </header>

      <div className="grid shrink-0 grid-cols-1 gap-3 sm:grid-cols-3">
        <KpiCard
          label="Gasto total del mes"
          value={formatMoney(kpis.gastoTotalMes, currency)}
          sub={growthText}
          accent="border-l-violet-400 bg-violet-50/35"
          iconBg="bg-violet-100 text-violet-800"
          href="/reportes"
          linkClass="text-violet-700"
          icon="wallet"
        />
        <KpiCard
          label="Pagos pendientes de autorizar"
          value={formatMoney(kpis.pagosPendientesAutorizar, currency)}
          sub={`${pendingCount} pago${pendingCount === 1 ? "" : "s"} del mes →`}
          accent="border-l-orange-400 bg-orange-50/40"
          iconBg="bg-orange-100 text-orange-700"
          href="/pagos"
          linkClass="text-orange-700"
          icon="hourglass"
        />
        <KpiCard
          label="Pagos parciales activos"
          value={String(kpis.pagosParcialesActivos)}
          sub="Con saldo pendiente →"
          accent="border-l-sky-400 bg-sky-50/35"
          iconBg="bg-sky-100 text-sky-800"
          href="/pagos"
          linkClass="text-sky-800"
          icon="doc"
        />
      </div>

      <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-[minmax(0,1fr)_17.5rem] 2xl:grid-cols-[minmax(0,1fr)_19rem]">
        <DireccionExpedientesPanel
          orders={orders}
          obras={obras}
          compact
          showExport={false}
          defaultTab="todos"
          tabCounts={tabCounts}
        />
        <DireccionHomeSidebar
          orders={orders}
          recentMovements={recentMovements}
          pendingMovements={pendingMovements}
          sticky
        />
      </div>
    </div>
  );
}
