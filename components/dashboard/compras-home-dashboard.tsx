"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { CalmKpiTile, DashPanelHeader, HomeLauncherLink, HomePulseLine } from "@/components/dashboard/calm-kpi-tile";
import { RoleQuickGuideBanner } from "@/components/dashboard/role-quick-guide";
import { OcLink } from "@/components/ui/oc-link";
import { SystemStatusBadge } from "@/components/ui/system-status-badge";
import {
  COMPRAS_KPI_CONFIG,
  comprasKpiCounts,
  filterComprasOrders,
  type ComprasOrderTab,
} from "@/lib/dashboard/compras-dashboard";
import type {
  InvoiceFirstCommitmentDto,
  MaterialRequestDto,
  MovementDto,
  ObraDto,
  PendingMovementDto,
  PurchaseOrderDto,
} from "@/lib/domain/types";
import { formatMoney } from "@/lib/format";

const QUEUE_LIMIT = 8;

/** Solo KPIs de trabajo en Inicio (sin “Completadas”). */
const HOME_KPI_CONFIG = COMPRAS_KPI_CONFIG.filter((c) => c.key !== "completadas");

const KPI_TINT: Record<string, "orange" | "amber" | "sky" | "emerald" | "violet"> = {
  aprobar: "orange",
  pago: "amber",
  factura: "sky",
  diferencias: "violet",
};

export function ComprasHomeDashboard({
  userName,
  orders,
  materialRequests = [],
  invoiceCommitments = [],
}: {
  userName: string;
  orders: PurchaseOrderDto[];
  obras?: ObraDto[];
  materialRequests?: MaterialRequestDto[];
  invoiceCommitments?: InvoiceFirstCommitmentDto[];
  recentMovements?: MovementDto[];
  pendingMovements?: PendingMovementDto[];
  onOrderMutated?: () => void;
  /** @deprecated Ya no se embebe en Administración; se conserva por compat. */
  embedded?: boolean;
}) {
  const [activeTab, setActiveTab] = useState<ComprasOrderTab>("all");
  const kpiCounts = useMemo(() => comprasKpiCounts(orders), [orders]);

  const filtered = useMemo(
    () =>
      filterComprasOrders({
        orders,
        tab: activeTab,
        search: "",
        obraId: "all",
        dateFrom: "",
        dateTo: "",
      }),
    [orders, activeTab]
  );
  const queue = filtered.slice(0, QUEUE_LIMIT);

  const procesoCEspera = useMemo(
    () =>
      invoiceCommitments.filter(
        (c) => c.status === "awaiting_oc" || c.status === "oc_requested"
      ).length,
    [invoiceCommitments]
  );

  const solicitudesAbiertas = useMemo(
    () => materialRequests.filter((r) => r.status === "sent" || r.status === "in_oc_process").length,
    [materialRequests]
  );

  const pulse = useMemo(() => {
    const parts: string[] = [];
    if (kpiCounts.aprobar > 0) parts.push(`${kpiCounts.aprobar} por avanzar`);
    if (kpiCounts.diferencias > 0) parts.push(`${kpiCounts.diferencias} con diferencias`);
    if (procesoCEspera > 0) parts.push(`${procesoCEspera} factura(s) Proceso C`);
    if (parts.length === 0) return "Sin colas urgentes. Crea una OC o revisa el listado completo cuando lo necesites.";
    return `Hoy: ${parts.join(" · ")}.`;
  }, [kpiCounts.aprobar, kpiCounts.diferencias, procesoCEspera]);

  return (
    <div className="home-dashboard dash-stack w-full pb-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-2">
          <h1 className="dash-page-title">¡Hola, {userName.split(" ")[0]}!</h1>
          <HomePulseLine>{pulse}</HomePulseLine>
        </div>
        <Link href="/ordenes/nueva" className="btn-primary shrink-0">
          + Nueva OC
        </Link>
      </header>

      <div className="dash-grid-4">
        {HOME_KPI_CONFIG.map((cfg) => (
          <CalmKpiTile
            key={cfg.key}
            label={cfg.label}
            value={kpiCounts[cfg.key]}
            sub={cfg.sublabel}
            tint={KPI_TINT[cfg.key] ?? "zinc"}
            selected={activeTab === cfg.tab}
            onClick={() => setActiveTab(cfg.tab === activeTab ? "all" : cfg.tab)}
          />
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        <HomeLauncherLink href="/ordenes" label="Ver todas las órdenes" primary />
        <HomeLauncherLink href="/ordenes/nueva" label="Nueva OC" />
        <HomeLauncherLink href="/expedientes" label="Expedientes" />
        {solicitudesAbiertas > 0 ? (
          <HomeLauncherLink
            href="/solicitudes-ingenieria"
            label={`Solicitudes Ingeniería (${solicitudesAbiertas})`}
          />
        ) : (
          <HomeLauncherLink href="/solicitudes-ingenieria" label="Solicitudes Ingeniería" />
        )}
      </div>

      <section className="dash-panel">
        <DashPanelHeader
          title="Bandeja de órdenes"
          meta={
            filtered.length === 0
              ? "Sin coincidencias"
              : `Mostrando ${Math.min(QUEUE_LIMIT, filtered.length)} de ${filtered.length}`
          }
          action={
            <Link href="/ordenes" className="text-sm font-semibold text-orange-700 hover:text-orange-900">
              Ver en Órdenes →
            </Link>
          }
        />

        {queue.length === 0 ? (
          <p className="dash-body px-4 py-10 text-center text-zinc-500 sm:px-5">
            No hay órdenes en esta vista. Prueba otro KPI o crea una nueva OC.
          </p>
        ) : (
          <ul className="divide-y divide-zinc-100">
            {queue.map((order) => (
              <li key={order.id} className="flex flex-wrap items-center gap-3 px-4 py-3.5 sm:px-5">
                <div className="min-w-0 flex-1">
                  <OcLink order={order} showPdfIcon className="text-sm" />
                  <p className="dash-caption mt-0.5 truncate">
                    {order.obraName} · {order.supplierName}
                  </p>
                </div>
                <SystemStatusBadge status={order.status} />
                <span className="shrink-0 text-sm font-bold tabular-nums text-zinc-900">
                  {formatMoney(order.totalAmount, order.currency)}
                </span>
                <Link
                  href={`/ordenes/${order.id}`}
                  className="shrink-0 text-xs font-semibold text-orange-700 hover:underline"
                >
                  Abrir
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <RoleQuickGuideBanner role="compras" compact />
    </div>
  );
}
