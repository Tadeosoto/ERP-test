"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { CalmKpiTile, HomeLauncherLink, HomePulseLine } from "@/components/dashboard/calm-kpi-tile";
import { HomeWorkTabs } from "@/components/dashboard/home-work-tabs";
import { IngenieroHomeSidebar } from "@/components/dashboard/ingeniero-home-sidebar";
import { IngenieroPendingOrdersPanel } from "@/components/dashboard/ingeniero-pending-orders-panel";
import { ProcessAHomeMap } from "@/components/dashboard/process-a-home-map";
import { RoleQuickGuideBanner } from "@/components/dashboard/role-quick-guide";
import {
  INGENIERO_HOME_KPI_CONFIG,
  ingenieroHomeKpiCounts,
  materialRequestDisplayLabel,
} from "@/lib/dashboard/ingeniero-dashboard";
import type {
  DirectExpenseDto,
  MaterialRequestDto,
  MovementDto,
  ObraDto,
  PendingMovementDto,
  PurchaseOrderDto,
} from "@/lib/domain/types";
import { sortByCreatedAtDesc } from "@/lib/list-utils";

const KPI_TINT: Record<string, "orange" | "amber" | "sky" | "emerald" | "violet"> = {
  pendingApproval: "orange",
  correctionsRequested: "amber",
  approvedThisMonth: "emerald",
  pendingOver3Days: "violet",
};

type IngenieroHomeTab = "revisar" | "solicitudes" | "obras" | "mapa";

export function IngenieroHomeDashboard({
  userId,
  userName,
  orders,
  obras,
  materialRequests,
  recentMovements,
  pendingMovements,
}: {
  userId: string;
  userName: string;
  orders: PurchaseOrderDto[];
  obras: ObraDto[];
  materialRequests: MaterialRequestDto[];
  expenses: DirectExpenseDto[];
  recentMovements: MovementDto[];
  pendingMovements: PendingMovementDto[];
}) {
  const [tab, setTab] = useState<IngenieroHomeTab>("revisar");

  const counts = useMemo(
    () => ingenieroHomeKpiCounts({ orders, engineerUserId: userId }),
    [orders, userId]
  );

  const myRequests = useMemo(
    () =>
      sortByCreatedAtDesc(
        materialRequests.filter((r) => r.createdByUserId === userId)
      ).slice(0, 8),
    [materialRequests, userId]
  );

  const openRequests = useMemo(
    () =>
      materialRequests.filter(
        (r) =>
          r.createdByUserId === userId &&
          (r.status === "draft" || r.status === "sent" || r.status === "in_oc_process")
      ).length,
    [materialRequests, userId]
  );

  const recentObras = useMemo(() => sortByCreatedAtDesc(obras).slice(0, 6), [obras]);

  const pulse = useMemo(() => {
    const n = counts.pendingApproval;
    if (n > 0) {
      const stale = counts.pendingOver3Days;
      const extra = stale > 0 ? ` (${stale} con más de 3 días)` : "";
      return `Tienes ${n} OC por revisar y firmar${extra}.`;
    }
    if (openRequests > 0) {
      return `${openRequests} solicitud${openRequests === 1 ? "" : "es"} en curso. Puedes pedir material en tus obras.`;
    }
    return "Sin OC urgentes. Crea una solicitud de material o revisa tus obras.";
  }, [counts.pendingApproval, counts.pendingOver3Days, openRequests]);

  const tabs = useMemo(
    () => [
      { id: "revisar", label: "Por revisar", count: counts.pendingApproval },
      { id: "solicitudes", label: "Solicitudes", count: openRequests },
      { id: "obras", label: "Mis obras", count: obras.length },
      { id: "mapa", label: "Mapa" },
    ],
    [counts.pendingApproval, openRequests, obras.length]
  );

  return (
    <div className="home-dashboard dash-stack mx-auto max-w-6xl pb-4 lg:max-w-none lg:min-h-0 lg:flex-1 lg:overflow-hidden lg:pb-0">
      <header className="shrink-0">
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <div className="min-w-0 flex-1 space-y-1.5">
            <h1 className="dash-page-title">¡Hola, {userName.split(" ")[0]}!</h1>
            <HomePulseLine>{pulse}</HomePulseLine>
          </div>
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            <Link href="/obras" className="btn-secondary w-full shrink-0 sm:w-auto">
              Nueva obra
            </Link>
            <Link href="/solicitudes/nueva" className="btn-primary w-full shrink-0 sm:w-auto">
              + Pedir material
            </Link>
          </div>
        </div>
      </header>

      <div className="dash-grid-4 shrink-0">
        {INGENIERO_HOME_KPI_CONFIG.map((cfg) => (
          <CalmKpiTile
            key={cfg.key}
            label={cfg.label}
            value={counts[cfg.key]}
            sub={cfg.sublabel}
            tint={KPI_TINT[cfg.key] ?? "zinc"}
            selected={
              (cfg.key === "pendingApproval" && tab === "revisar") ||
              (cfg.key === "correctionsRequested" && tab === "revisar")
            }
            onClick={() => {
              if (cfg.key === "pendingApproval" || cfg.key === "correctionsRequested") {
                setTab("revisar");
              }
            }}
          />
        ))}
      </div>

      <div className="shrink-0">
        <HomeWorkTabs
          tabs={tabs}
          activeId={tab}
          onChange={(id) => setTab(id as IngenieroHomeTab)}
        />
      </div>

      <div className="flex min-h-0 flex-col gap-4 lg:flex-1 xl:grid xl:grid-cols-4 xl:overflow-hidden">
        <div className="flex min-w-0 flex-col lg:min-h-0 lg:flex-1 xl:col-span-3">
          {tab === "revisar" ? (
            <IngenieroPendingOrdersPanel
              orders={orders}
              engineerUserId={userId}
              materialRequests={materialRequests}
              embedded
            />
          ) : null}

          {tab === "solicitudes" ? (
            <section className="dash-panel flex min-h-0 flex-1 flex-col">
              <div className="flex items-center justify-between gap-3 border-b border-zinc-100 px-4 py-3.5 sm:px-5">
                <div>
                  <h2 className="dash-section-title">Mis solicitudes de material</h2>
                  <p className="dash-caption mt-0.5">Cantidad + material → Compras arma la OC</p>
                </div>
                <Link
                  href="/solicitudes/nueva"
                  className="text-sm font-semibold text-orange-700 hover:text-orange-900"
                >
                  Nueva →
                </Link>
              </div>
              {myRequests.length === 0 ? (
                <p className="dash-body px-4 py-10 text-center text-zinc-500 sm:px-5">
                  Aún no tienes solicitudes. Pide material desde una obra donde estés involucrado.
                </p>
              ) : (
                <ul className="divide-y divide-zinc-100">
                  {myRequests.map((r) => (
                    <li key={r.id} className="flex flex-wrap items-center gap-3 px-4 py-3.5 sm:px-5">
                      <div className="min-w-0 flex-1">
                        <Link
                          href={`/solicitudes/material/${r.id}`}
                          className="text-sm font-semibold text-sky-800 hover:underline"
                        >
                          {materialRequestDisplayLabel(r)}
                        </Link>
                        <p className="dash-caption mt-0.5 truncate">{r.obraName}</p>
                      </div>
                      <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-semibold text-zinc-700">
                        {r.status === "draft"
                          ? "Borrador"
                          : r.status === "sent"
                            ? "En Compras"
                            : r.status === "in_oc_process"
                              ? "En OC"
                              : r.status}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ) : null}

          {tab === "obras" ? (
            <section className="dash-panel flex min-h-0 flex-1 flex-col">
              <div className="flex items-center justify-between gap-3 border-b border-zinc-100 px-4 py-3.5 sm:px-5">
                <div>
                  <h2 className="dash-section-title">Obras</h2>
                  <p className="dash-caption mt-0.5">
                    Al crear una obra designas el equipo de ingenieros
                  </p>
                </div>
                <Link href="/obras" className="text-sm font-semibold text-orange-700 hover:text-orange-900">
                  Ver todas →
                </Link>
              </div>
              {recentObras.length === 0 ? (
                <p className="dash-body px-4 py-10 text-center text-zinc-500 sm:px-5">
                  No hay obras aún. Crea la primera y designa a los ingenieros involucrados.
                </p>
              ) : (
                <ul className="divide-y divide-zinc-100">
                  {recentObras.map((o) => (
                    <li key={o.id} className="flex flex-wrap items-center gap-3 px-4 py-3.5 sm:px-5">
                      <div className="min-w-0 flex-1">
                        <Link
                          href={`/obras/${o.id}`}
                          className="text-sm font-semibold text-zinc-900 hover:text-orange-800"
                        >
                          {o.name}
                        </Link>
                        <p className="dash-caption mt-0.5">{o.code || "Sin código"}</p>
                      </div>
                      <Link
                        href={`/solicitudes/nueva?obraId=${o.id}`}
                        className="text-xs font-semibold text-orange-700 hover:underline"
                      >
                        Pedir material
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
              <div className="border-t border-zinc-100 px-4 py-3 sm:px-5">
                <div className="flex flex-wrap gap-2">
                  <HomeLauncherLink href="/obras" label="Gestionar obras" primary />
                  <HomeLauncherLink href="/expedientes" label="Expedientes" />
                  <HomeLauncherLink href="/pagos" label="Ver pagos" />
                </div>
              </div>
            </section>
          ) : null}

          {tab === "mapa" ? <ProcessAHomeMap role="ingeniero" compact={false} /> : null}
        </div>

        <aside className="min-w-0 shrink-0 xl:col-span-1 xl:min-h-0 xl:overflow-hidden">
          <IngenieroHomeSidebar
            recentMovements={recentMovements}
            pendingMovements={pendingMovements}
            obras={recentObras.slice(0, 3)}
          />
        </aside>
      </div>

      {tab !== "mapa" ? (
        <div className="shrink-0">
          <ProcessAHomeMap role="ingeniero" />
        </div>
      ) : null}

      <div className="shrink-0">
        <RoleQuickGuideBanner role="ingeniero" compact />
      </div>
    </div>
  );
}
