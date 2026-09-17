"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  CalmKpiTile,
  DashPanelHeader,
  HomeLauncherLink,
  HomePulseLine,
} from "@/components/dashboard/calm-kpi-tile";
import { HomeWorkTabs } from "@/components/dashboard/home-work-tabs";
import { ProcessAHomeMap } from "@/components/dashboard/process-a-home-map";
import { RoleQuickGuideBanner } from "@/components/dashboard/role-quick-guide";
import { OcLink } from "@/components/ui/oc-link";
import { SystemStatusBadge } from "@/components/ui/system-status-badge";
import {
  COMPRAS_KPI_CONFIG,
  comprasKpiCounts,
  filterComprasOrders,
  type ComprasOrderTab,
} from "@/lib/dashboard/compras-dashboard";
import { materialRequestDisplayLabel } from "@/lib/dashboard/ingeniero-dashboard";
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

const HOME_KPI_CONFIG = COMPRAS_KPI_CONFIG.filter((c) => c.key !== "completadas");

const KPI_TINT: Record<string, "orange" | "amber" | "sky" | "emerald" | "violet"> = {
  aprobar: "orange",
  pago: "amber",
  factura: "sky",
  diferencias: "violet",
};

type ComprasHomeTab = "solicitudes" | "armar" | "revision" | "saldadas" | "mapa";

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
  embedded?: boolean;
}) {
  const [tab, setTab] = useState<ComprasHomeTab>("solicitudes");
  const kpiCounts = useMemo(() => comprasKpiCounts(orders), [orders]);

  const solicitudesAbiertas = useMemo(
    () => materialRequests.filter((r) => r.status === "sent" || r.status === "in_oc_process").length,
    [materialRequests]
  );

  const armarCount = useMemo(
    () =>
      orders.filter((o) => o.status === "draft" || o.status === "engineerRejected").length +
      materialRequests.filter((r) => r.status === "sent").length,
    [orders, materialRequests]
  );

  const revisionCount = useMemo(
    () => orders.filter((o) => o.status === "awaitingEngineer").length,
    [orders]
  );

  const saldadasCount = useMemo(
    () =>
      orders.filter(
        (o) =>
          o.status === "paid" ||
          o.status === "awaitingInvoice" ||
          o.status === "invoiceReceived"
      ).length,
    [orders]
  );

  const pendingRequests = useMemo(
    () => materialRequests.filter((r) => r.status === "sent").slice(0, QUEUE_LIMIT),
    [materialRequests]
  );

  const filtered = useMemo(() => {
    const orderTab: ComprasOrderTab =
      tab === "revision" ? "aprobar" : tab === "saldadas" ? "factura" : "all";
    return filterComprasOrders({
      orders,
      tab: orderTab,
      search: "",
      obraId: "all",
      dateFrom: "",
      dateTo: "",
    });
  }, [orders, tab]);

  const queueOrders = useMemo(() => {
    if (tab === "armar") {
      return orders
        .filter((o) => o.status === "draft" || o.status === "engineerRejected")
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
        .slice(0, QUEUE_LIMIT);
    }
    if (tab === "revision" || tab === "saldadas") {
      return filtered.slice(0, QUEUE_LIMIT);
    }
    return [];
  }, [tab, orders, filtered]);

  const pulse = useMemo(() => {
    const parts: string[] = [];
    if (solicitudesAbiertas > 0) parts.push(`${solicitudesAbiertas} solicitud(es)`);
    if (kpiCounts.aprobar > 0) parts.push(`${kpiCounts.aprobar} en revisión de Ingeniería`);
    if (kpiCounts.diferencias > 0) parts.push(`${kpiCounts.diferencias} con diferencias`);
    if (parts.length === 0) {
      return "Sin colas urgentes. Arma una OC desde una solicitud o el catálogo.";
    }
    return `Hoy: ${parts.join(" · ")}.`;
  }, [solicitudesAbiertas, kpiCounts.aprobar, kpiCounts.diferencias]);

  const tabs = useMemo(
    () => [
      { id: "solicitudes", label: "Solicitudes", count: solicitudesAbiertas },
      { id: "armar", label: "Armar / corregir", count: armarCount },
      { id: "revision", label: "En revisión", count: revisionCount },
      { id: "saldadas", label: "Tras el pago", count: saldadasCount },
      { id: "mapa", label: "Mapa" },
    ],
    [solicitudesAbiertas, armarCount, revisionCount, saldadasCount]
  );

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
            selected={
              (cfg.key === "aprobar" && tab === "revision") ||
              (cfg.key === "factura" && tab === "saldadas")
            }
            onClick={() => {
              if (cfg.key === "aprobar") setTab("revision");
              else if (cfg.key === "factura") setTab("saldadas");
              else if (cfg.key === "pago") setTab("armar");
            }}
          />
        ))}
      </div>

      <HomeWorkTabs tabs={tabs} activeId={tab} onChange={(id) => setTab(id as ComprasHomeTab)} />

      <div className="flex flex-wrap gap-2">
        <HomeLauncherLink href="/solicitudes-ingenieria" label="Solicitudes Ingeniería" primary />
        <HomeLauncherLink href="/ordenes" label="Todas las OC" />
        <HomeLauncherLink href="/proveedores" label="Proveedores" />
        <HomeLauncherLink href="/obras" label="Obras" />
      </div>

      {tab === "mapa" ? (
        <ProcessAHomeMap role="compras" compact={false} />
      ) : (
        <section className="dash-panel">
          <DashPanelHeader
            title={
              tab === "solicitudes"
                ? "Solicitudes de Ingeniería"
                : tab === "armar"
                  ? "Armar o corregir OC"
                  : tab === "revision"
                    ? "OC en revisión de Ingeniería"
                    : "Tras el pago — factura y documentos"
            }
            meta={
              tab === "solicitudes"
                ? pendingRequests.length === 0
                  ? "Sin solicitudes nuevas"
                  : `${pendingRequests.length} pendiente${pendingRequests.length === 1 ? "" : "s"}`
                : queueOrders.length === 0
                  ? "Sin coincidencias"
                  : `Mostrando ${queueOrders.length}`
            }
            action={
              <Link
                href={tab === "solicitudes" ? "/solicitudes-ingenieria" : "/ordenes"}
                className="text-sm font-semibold text-orange-700 hover:text-orange-900"
              >
                Ver listado →
              </Link>
            }
          />

          {tab === "solicitudes" ? (
            pendingRequests.length === 0 ? (
              <p className="dash-body px-4 py-10 text-center text-zinc-500 sm:px-5">
                No hay solicitudes nuevas. Cuando Ingeniería pida material aparecerán aquí.
              </p>
            ) : (
              <ul className="divide-y divide-zinc-100">
                {pendingRequests.map((r) => (
                  <li key={r.id} className="flex flex-wrap items-center gap-3 px-4 py-3.5 sm:px-5">
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/solicitudes/material/${r.id}`}
                        className="text-sm font-semibold text-sky-800 hover:underline"
                      >
                        {materialRequestDisplayLabel(r)}
                      </Link>
                      <p className="dash-caption mt-0.5 truncate">
                        {r.obraName} · {r.createdByName}
                      </p>
                    </div>
                    <Link
                      href={`/ordenes/nueva?materialRequestId=${r.id}`}
                      className="btn-primary !min-h-9 !px-3 !py-1.5 !text-xs"
                    >
                      Armar OC
                    </Link>
                  </li>
                ))}
              </ul>
            )
          ) : queueOrders.length === 0 ? (
            <p className="dash-body px-4 py-10 text-center text-zinc-500 sm:px-5">
              Nada en esta cola. Cambia de pestaña o crea una OC desde una solicitud.
            </p>
          ) : (
            <ul className="divide-y divide-zinc-100">
              {queueOrders.map((order) => (
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
      )}

      {tab !== "mapa" ? <ProcessAHomeMap role="compras" /> : null}
      <RoleQuickGuideBanner role="compras" compact />
    </div>
  );
}
