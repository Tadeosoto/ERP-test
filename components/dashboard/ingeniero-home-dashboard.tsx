"use client";

import Link from "next/link";
import { useMemo } from "react";
import { HomeActivitySidebar } from "@/components/dashboard/home-activity-sidebar";
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
  const cls = "h-4 w-4 lg:h-5 lg:w-5";
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
    <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto lg:gap-2.5 lg:overflow-hidden">
      <header className="shrink-0">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h1 className="text-lg font-bold text-zinc-900 sm:text-xl lg:text-2xl">
              ¡Hola, {userName.split(" ")[0]}!
            </h1>
            <p className="mt-0.5 hidden items-center gap-2 text-xs text-zinc-500 sm:flex lg:text-sm">
              <RoleActivityIcon role="ingeniero" size="sm" />
              Ingeniería — Revisa las OC que envía Compras y gestiona solicitudes de material.
            </p>
          </div>
          <Link
            href="/solicitudes/nueva"
            className="btn-primary h-10 min-h-10 w-full shrink-0 px-4 py-2 text-sm sm:w-auto"
          >
            + Nueva solicitud
          </Link>
        </div>
      </header>

      <div className="grid shrink-0 grid-cols-2 gap-1.5 lg:grid-cols-4 lg:gap-2">
        {INGENIERO_HOME_KPI_CONFIG.map((cfg) => (
          <div
            key={cfg.key}
            className={`flex min-w-0 flex-col rounded-xl border border-orange-100/80 border-l-4 p-2 shadow-sm lg:rounded-2xl lg:p-2.5 ${cfg.accent}`}
          >
            <div className="flex items-start justify-between gap-2">
              <span className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg lg:h-9 lg:w-9 lg:rounded-xl ${cfg.iconBg}`}>
                <KpiIcon name={cfg.icon} />
              </span>
              <span className="text-xl font-bold tabular-nums text-zinc-900 lg:text-2xl">{counts[cfg.key]}</span>
            </div>
            <p className="mt-1 text-[11px] font-semibold leading-tight text-zinc-800 lg:text-xs">{cfg.label}</p>
            <p className="mt-0.5 hidden text-[10px] text-zinc-500 lg:block lg:text-[11px]">{cfg.sublabel}</p>
          </div>
        ))}
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-2 overflow-hidden xl:grid-cols-4 xl:gap-3">
        <div className="flex min-h-0 flex-col xl:col-span-3">
          <IngenieroPendingOrdersPanel
            orders={orders}
            engineerUserId={userId}
            materialRequests={materialRequests}
            embedded
          />
        </div>

        <div className="hidden min-h-0 flex-col gap-2 overflow-hidden xl:flex">
          <HomeActivitySidebar
            compact
            limit={3}
            recentMovements={recentMovements}
            pendingMovements={pendingMovements}
          />

          <section className="card shrink-0 p-2.5">
            <div className="mb-1 flex items-center justify-between gap-2">
              <h2 className="text-xs font-bold text-zinc-900">Mis obras</h2>
              <Link href="/obras" className="text-[11px] font-medium text-sky-700 hover:underline">
                Ver todas
              </Link>
            </div>
            <ul className="space-y-0.5">
              {recentObras.length === 0 ? (
                <li className="py-2 text-center text-[11px] text-zinc-400">Sin obras registradas.</li>
              ) : (
                recentObras.map((obra) => (
                  <li key={obra.id}>
                    <Link
                      href={`/obras/${obra.id}`}
                      className="block rounded-lg border border-transparent px-1.5 py-1 transition hover:border-orange-100 hover:bg-orange-50/40"
                    >
                      <p className="truncate text-xs font-medium text-sky-800">{obra.name}</p>
                      <p className="text-[10px] text-zinc-500">
                        {obra.orderCount} orden{obra.orderCount === 1 ? "" : "es"}
                      </p>
                    </Link>
                  </li>
                ))
              )}
            </ul>
          </section>
        </div>
      </div>

      <div className="shrink-0">
        <RoleQuickGuideBanner role="ingeniero" compact />
      </div>
    </div>
  );
}
