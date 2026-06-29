"use client";

import Link from "next/link";
import { useMemo } from "react";
import { IngenieroHomeSidebar } from "@/components/dashboard/ingeniero-home-sidebar";
import { IngenieroPendingOrdersPanel } from "@/components/dashboard/ingeniero-pending-orders-panel";
import { RoleQuickGuideBanner } from "@/components/dashboard/role-quick-guide";
import { RoleActivityIcon } from "@/components/dashboard/role-activity-icon";
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

function KpiIcon({ name }: { name: "clock" | "x" | "check" | "alert" }) {
  const cls = "h-4 w-4 sm:h-5 sm:w-5";
  if (name === "clock") {
    return (
      <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    );
  }
  if (name === "x") {
    return (
      <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
      </svg>
    );
  }
  if (name === "alert") {
    return (
      <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
      </svg>
    );
  }
  return (
    <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  );
}

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

  return (
    <div className="home-dashboard flex flex-col gap-3 pb-2 sm:gap-4 lg:min-h-0 lg:flex-1 lg:gap-2.5 lg:overflow-hidden lg:pb-0">
      <header className="shrink-0">
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-bold text-zinc-900 sm:text-2xl">
              ¡Hola, {userName.split(" ")[0]}!
            </h1>
            <p className="mt-0.5 flex items-start gap-2 text-xs text-zinc-500 sm:items-center sm:text-sm">
              <RoleActivityIcon role="ingeniero" size="sm" />
              <span>Ingeniería — Revisa OC de Compras y gestiona solicitudes de material.</span>
            </p>
          </div>
          <Link
            href="/solicitudes/nueva"
            className="btn-primary h-11 min-h-11 w-full shrink-0 px-4 py-2 text-sm sm:w-auto"
          >
            + Nueva solicitud
          </Link>
        </div>
      </header>

      <div className="grid shrink-0 grid-cols-2 gap-2 sm:grid-cols-2 md:grid-cols-4 lg:gap-2">
        {INGENIERO_HOME_KPI_CONFIG.map((cfg) => (
          <div
            key={cfg.key}
            className={`flex min-w-0 flex-col rounded-xl border border-orange-100/80 border-l-4 p-2.5 shadow-sm sm:p-3 lg:rounded-2xl ${cfg.accent}`}
          >
            <div className="flex items-start justify-between gap-2">
              <span className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg sm:h-9 sm:w-9 sm:rounded-xl ${cfg.iconBg}`}>
                <KpiIcon name={cfg.icon} />
              </span>
              <span className="text-xl font-bold tabular-nums text-zinc-900 sm:text-2xl">{counts[cfg.key]}</span>
            </div>
            <p className="mt-1.5 text-[11px] font-semibold leading-tight text-zinc-800 sm:text-xs">{cfg.label}</p>
            <p className="mt-0.5 hidden text-[10px] text-zinc-500 sm:block sm:text-[11px]">{cfg.sublabel}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-3 lg:min-h-0 lg:flex-1 lg:gap-2 xl:grid xl:grid-cols-4 xl:gap-3 xl:overflow-hidden">
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
