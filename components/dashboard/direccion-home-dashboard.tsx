"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  CalmKpiTile,
  DashPanelHeader,
  HomeHeroMetric,
  HomeLauncherLink,
  HomePulseLine,
} from "@/components/dashboard/calm-kpi-tile";
import { HomeWorkTabs } from "@/components/dashboard/home-work-tabs";
import { ProcessAHomeMap } from "@/components/dashboard/process-a-home-map";
import {
  direccionKpiCounts,
  kpiMonthGrowth,
  pendingAuthorizationCount,
  isPendingAuthorization,
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
import { OcLink } from "@/components/ui/oc-link";
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
const QUEUE_LIMIT = 8;

const AREA_LABEL: Record<string, string> = {
  ingeniero: "Ingeniería",
  compras: "Compras",
  pagos: "Administración",
  recepcion: "Recepción",
  contabilidad: "Contabilidad",
};

type DireccionHomeTab = "autorizar" | "seguimiento" | "mapa";

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
  const [tab, setTab] = useState<DireccionHomeTab>("autorizar");

  const kpis = useMemo(() => direccionKpiCounts(orders), [orders]);
  const growth = useMemo(() => kpiMonthGrowth(orders), [orders]);
  const pendingCount = useMemo(() => pendingAuthorizationCount(orders), [orders]);
  const authorizeQueue = useMemo(
    () => orders.filter(isPendingAuthorization).slice(0, QUEUE_LIMIT),
    [orders]
  );
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
    if (pendingCount > 0) {
      return `${pendingCount} OC por autorizar — un sí de Dirección o Administración basta.`;
    }
    if (expKpis.atencion > 0) {
      return `${expKpis.atencion} orden${expKpis.atencion === 1 ? "" : "es"} requieren seguimiento.`;
    }
    return "Sin pendientes críticos. Consulta pagos o el mapa del Proceso A.";
  }, [pendingCount, expKpis.atencion]);

  const displayName = userName.replace(/^Ing\.\s*/i, "").trim() || userName;

  const tabs = useMemo(
    () => [
      { id: "autorizar", label: "Por autorizar", count: pendingCount },
      { id: "seguimiento", label: "Seguimiento", count: expKpis.atencion },
      { id: "mapa", label: "Mapa" },
    ],
    [pendingCount, expKpis.atencion]
  );

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
            ? `${pendingCount} OC — el primero que aprueba avanza`
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
          sub="Seguimiento de OC"
          tint="orange"
          selected={tab === "seguimiento"}
          onClick={() => setTab("seguimiento")}
        />
      </div>

      <HomeWorkTabs
        tabs={tabs}
        activeId={tab}
        onChange={(id) => setTab(id as DireccionHomeTab)}
      />

      <div className="flex flex-wrap gap-2">
        <HomeLauncherLink href="/pagos" label="Ver pagos" primary />
        <HomeLauncherLink href="/ordenes" label="Órdenes de compra" />
        <HomeLauncherLink href="/reportes" label="Reportes" />
        <HomeLauncherLink href="/flujo" label="Mapa del proceso" />
      </div>

      {tab === "mapa" ? (
        <ProcessAHomeMap role="direccion" compact={false} />
      ) : tab === "autorizar" ? (
        <section className="dash-panel">
          <DashPanelHeader
            title="Autorizar órdenes de compra"
            meta="Tú o Carolina — el primero que aprueba avanza a pendiente de pago"
            action={
              <Link href="/pagos" className="text-sm font-semibold text-orange-700 hover:text-orange-900">
                Ir a pagos →
              </Link>
            }
          />
          {authorizeQueue.length === 0 ? (
            <p className="dash-body px-4 py-10 text-center text-zinc-500 sm:px-5">
              No hay OC pendientes de autorización.
            </p>
          ) : (
            <ul className="divide-y divide-zinc-100">
              {authorizeQueue.map((order) => (
                <li key={order.id} className="flex flex-wrap items-center gap-3 px-4 py-3.5 sm:px-5">
                  <div className="min-w-0 flex-1">
                    <OcLink order={order} showPdfIcon className="text-sm" />
                    <p className="dash-caption mt-0.5 truncate">
                      {order.obraName} · {order.supplierName}
                    </p>
                  </div>
                  <span className="shrink-0 text-sm font-bold tabular-nums text-zinc-900">
                    {formatMoney(order.amountRemaining || order.totalAmount, order.currency)}
                  </span>
                  <Link
                    href={`/ordenes/${order.id}`}
                    className="btn-primary !min-h-9 shrink-0 !px-3 !py-1.5 !text-xs"
                  >
                    Revisar
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : (
        <section className="dash-panel">
          <DashPanelHeader
            title="Seguimiento prioritario"
            meta={`Top ${ATTENTION_LIMIT} · listado completo en Órdenes`}
            action={
              <Link
                href="/ordenes"
                className="text-sm font-semibold text-orange-700 hover:text-orange-900"
              >
                Ver todos →
              </Link>
            }
          />
          {attention.length === 0 ? (
            <p className="dash-body px-4 py-10 text-center text-zinc-500 sm:px-5">
              No hay órdenes que requieran atención ahora.
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
      )}

      {tab !== "mapa" ? <ProcessAHomeMap role="direccion" /> : null}
    </div>
  );
}
