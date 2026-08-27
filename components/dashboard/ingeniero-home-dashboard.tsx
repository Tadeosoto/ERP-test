"use client";

import Link from "next/link";
import { useMemo } from "react";
import { CalmKpiTile, HomePulseLine } from "@/components/dashboard/calm-kpi-tile";
import { IngenieroHomeSidebar } from "@/components/dashboard/ingeniero-home-sidebar";
import { IngenieroPendingOrdersPanel } from "@/components/dashboard/ingeniero-pending-orders-panel";
import { RoleQuickGuideBanner } from "@/components/dashboard/role-quick-guide";
import {
  INGENIERO_HOME_KPI_CONFIG,
  ingenieroHomeKpiCounts,
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
  const counts = useMemo(
    () => ingenieroHomeKpiCounts({ orders, engineerUserId: userId }),
    [orders, userId]
  );

  const recentObras = useMemo(() => sortByCreatedAtDesc(obras).slice(0, 3), [obras]);

  const pulse = useMemo(() => {
    const n = counts.pendingApproval;
    if (n > 0) {
      const stale = counts.pendingOver3Days;
      const extra =
        stale > 0 ? ` (${stale} con más de 3 días)` : "";
      return `Tienes ${n} OC pendiente${n === 1 ? "" : "s"} de revisión${extra}.`;
    }
    return "Sin OC urgentes por revisar. Puedes crear una solicitud de material.";
  }, [counts.pendingApproval, counts.pendingOver3Days]);

  return (
    <div className="home-dashboard dash-stack mx-auto max-w-6xl pb-4 lg:max-w-none lg:min-h-0 lg:flex-1 lg:overflow-hidden lg:pb-0">
      <header className="shrink-0">
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <div className="min-w-0 flex-1 space-y-1.5">
            <h1 className="dash-page-title">¡Hola, {userName.split(" ")[0]}!</h1>
            <HomePulseLine>{pulse}</HomePulseLine>
          </div>
          <Link href="/solicitudes/nueva" className="btn-primary w-full shrink-0 sm:w-auto">
            + Nueva solicitud
          </Link>
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
          />
        ))}
      </div>

      <div className="flex min-h-0 flex-col gap-4 lg:flex-1 xl:grid xl:grid-cols-4 xl:overflow-hidden">
        <div className="flex min-w-0 flex-col lg:min-h-0 lg:flex-1 xl:col-span-3">
          <IngenieroPendingOrdersPanel
            orders={orders}
            engineerUserId={userId}
            materialRequests={materialRequests}
            embedded
          />
        </div>

        <aside className="min-w-0 shrink-0 xl:col-span-1 xl:min-h-0 xl:overflow-hidden">
          <IngenieroHomeSidebar
            recentMovements={recentMovements}
            pendingMovements={pendingMovements}
            obras={recentObras}
          />
        </aside>
      </div>

      <div className="shrink-0">
        <RoleQuickGuideBanner role="ingeniero" compact />
      </div>
    </div>
  );
}
