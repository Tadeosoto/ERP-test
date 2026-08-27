"use client";

import Link from "next/link";
import { useMemo } from "react";
import {
  CalmKpiTile,
  DashPanelHeader,
  HomeHeroMetric,
  HomeLauncherLink,
  HomePulseLine,
} from "@/components/dashboard/calm-kpi-tile";
import {
  direccionKpiCounts,
  kpiMonthGrowth,
  pendingAuthorizationCount,
} from "@/lib/dashboard/direccion-dashboard";
import {
  expedienteKpis,
  expedientePendingArea,
  filterByExpedienteTab,
  isProcesoBExpediente,
  isProcesoCExpediente,
  mergeExpedienteOrders,
} from "@/lib/dashboard/direccion-expedientes";
import { orderDisplayCode } from "@/lib/dashboard/compras-dashboard";
import { ROLE_LABEL } from "@/lib/domain/labels";
import type {
  DirectExpenseDto,
  InvoiceFirstCommitmentDto,
  MovementDto,
  ObraDto,
  PendingMovementDto,
  PurchaseOrderDto,
} from "@/lib/domain/types";
import { formatMoney } from "@/lib/format";

const ATTENTION_LIMIT = 5;

const AREA_LABEL: Record<string, string> = {
  ingeniero: "Ingeniería",
  compras: "Compras",
  pagos: "Administración",
  recepcion: "Recepción",
  contabilidad: "Contabilidad",
};

function attentionHref(order: PurchaseOrderDto): string {
  if (isProcesoBExpediente(order)) return `/solicitudes/gasto/${order.id}`;
  if (isProcesoCExpediente(order)) return `/compromisos-c/${order.id}`;
  return `/ordenes/${order.id}`;
}

export function DireccionHomeDashboard({
  userName,
  orders,
  expenses = [],
  invoiceCommitments = [],
}: {
  userName: string;
  orders: PurchaseOrderDto[];
  obras?: ObraDto[];
  expenses?: DirectExpenseDto[];
  invoiceCommitments?: InvoiceFirstCommitmentDto[];
  recentMovements?: MovementDto[];
  pendingMovements?: PendingMovementDto[];
}) {
  const kpis = useMemo(() => direccionKpiCounts(orders), [orders]);
  const growth = useMemo(() => kpiMonthGrowth(orders), [orders]);
  const pendingCount = useMemo(() => pendingAuthorizationCount(orders), [orders]);
  const expedienteRows = useMemo(
    () => mergeExpedienteOrders(orders, expenses, invoiceCommitments),
    [orders, expenses, invoiceCommitments]
  );
  const expKpis = useMemo(() => expedienteKpis(expedienteRows), [expedienteRows]);
  const attention = useMemo(
    () => filterByExpedienteTab(expedienteRows, "atencion").slice(0, ATTENTION_LIMIT),
    [expedienteRows]
  );
  const currency = orders[0]?.currency ?? "MXN";

  const growthText =
    growth === null
      ? undefined
      : growth >= 0
        ? `+${growth}% vs. mes anterior`
        : `${growth}% vs. mes anterior`;

  const pulse = useMemo(() => {
    const parts: string[] = [];
    if (pendingCount > 0) {
      parts.push(
        `${pendingCount} pago${pendingCount === 1 ? "" : "s"} por autorizar`
      );
    }
    if (expKpis.atencion > 0) {
      parts.push(
        `${expKpis.atencion} expediente${expKpis.atencion === 1 ? "" : "s"} requieren atención`
      );
    }
    if (parts.length === 0) {
      return "Sin pendientes críticos. Consulta expedientes o reportes cuando lo necesites.";
    }
    return `Hoy: ${parts.join(" · ")}.`;
  }, [pendingCount, expKpis.atencion]);

  const displayName = userName.replace(/^Ing\.\s*/i, "").trim() || userName;

  return (
    <div className="home-dashboard dash-stack w-full pb-6">
      <header className="space-y-2">
        <h1 className="dash-page-title">¡Hola, {displayName}!</h1>
        <HomePulseLine>
          {ROLE_LABEL.direccion} · {pulse}
        </HomePulseLine>
      </header>

      <HomeHeroMetric
        label="Pendiente de autorizar"
        value={formatMoney(kpis.pagosPendientesAutorizar, currency)}
        hint={
          pendingCount > 0
            ? `${pendingCount} pago${pendingCount === 1 ? "" : "s"} del mes`
            : "Nada pendiente de autorización"
        }
      />

      <div className="dash-grid-3">
        <CalmKpiTile
          label="Gasto del mes"
          value={formatMoney(kpis.gastoTotalMes, currency)}
          sub={growthText ?? "Ver reportes"}
          href="/reportes"
          tint="violet"
        />
        <CalmKpiTile
          label="Parciales activos"
          value={kpis.pagosParcialesActivos}
          sub="Con saldo pendiente"
          href="/pagos"
          tint="sky"
        />
        <CalmKpiTile
          label="Requieren atención"
          value={expKpis.atencion}
          sub="Expedientes / OC en alerta"
          href="/expedientes"
          tint="orange"
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <HomeLauncherLink href="/pagos" label="Ver pagos" primary />
        <HomeLauncherLink href="/expedientes" label="Ver expedientes" />
        <HomeLauncherLink href="/reportes" label="Reportes" />
        <HomeLauncherLink href="/agregar-factura" label="Agregar factura" />
      </div>

      <section className="dash-panel">
        <DashPanelHeader
          title="Atención prioritaria"
          meta={`Top ${ATTENTION_LIMIT} · listado completo en Expedientes`}
          action={
            <Link href="/expedientes" className="text-sm font-semibold text-orange-700 hover:text-orange-900">
              Ver todos →
            </Link>
          }
        />

        {attention.length === 0 ? (
          <p className="dash-body px-4 py-10 text-center text-zinc-500 sm:px-5">
            No hay expedientes que requieran atención ahora.
          </p>
        ) : (
          <ul className="divide-y divide-zinc-100">
            {attention.map((order) => {
              const area = expedientePendingArea(order);
              return (
                <li key={order.id} className="flex flex-wrap items-center gap-3 px-4 py-3.5 sm:px-5">
                  <div className="min-w-0 flex-1">
                    <Link href={attentionHref(order)} className="link-oc text-sm">
                      {orderDisplayCode(order)}
                    </Link>
                    <p className="dash-caption mt-0.5 truncate">
                      {order.obraName} · {order.supplierName}
                    </p>
                  </div>
                  {area ? (
                    <span className="shrink-0 rounded-full bg-orange-50 px-2.5 py-1 text-xs font-semibold text-orange-800 ring-1 ring-inset ring-orange-200/80">
                      {AREA_LABEL[area] ?? area}
                    </span>
                  ) : null}
                  <span className="shrink-0 text-sm font-bold tabular-nums text-zinc-900">
                    {formatMoney(order.totalAmount, order.currency)}
                  </span>
                  <Link
                    href={attentionHref(order)}
                    className="shrink-0 text-xs font-semibold text-orange-700 hover:underline"
                  >
                    Revisar
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
