"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ComprasKpiCards } from "@/components/dashboard/compras-kpi-cards";
import { ComprasOrdersPanel } from "@/components/dashboard/compras-orders-panel";
import { HomeActivitySidebar } from "@/components/dashboard/home-activity-sidebar";
import { RoleActivityIcon } from "@/components/dashboard/role-activity-icon";
import { ROLE_ACTIVITY_STYLE } from "@/lib/dashboard/role-activity-style";
import { comprasKpiCounts, type ComprasOrderTab } from "@/lib/dashboard/compras-dashboard";
import { getHomePanelHint } from "@/lib/dashboard/role-hints";
import { rolePlaybook } from "@/lib/domain/flow";
import type { MovementDto, ObraDto, PendingMovementDto, PurchaseOrderDto } from "@/lib/domain/types";

export function ComprasHomeDashboard({
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
  const [activeTab, setActiveTab] = useState<ComprasOrderTab>("all");
  const [hintDismissed, setHintDismissed] = useState(false);

  const kpiCounts = useMemo(() => comprasKpiCounts(orders), [orders]);
  const panelHint = useMemo(() => getHomePanelHint("compras", orders), [orders]);
  const hintKey = panelHint ? `${panelHint.href}:${panelHint.message}` : "";

  useEffect(() => {
    setHintDismissed(false);
  }, [hintKey]);

  const playbook = rolePlaybook("compras")[0];

  return (
    <div className="flex min-h-0 flex-col gap-3 overflow-x-visible overflow-y-auto lg:h-[calc(100dvh-5.5rem)] lg:gap-4">
      <header className="shrink-0">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-zinc-900 sm:text-2xl">
              ¡Hola, {userName.split(" ")[0]}!
            </h1>
            <p className="mt-1 flex items-center gap-2 text-sm text-zinc-500">
              <RoleActivityIcon role="compras" size="sm" />
              {ROLE_ACTIVITY_STYLE.compras.label} · {playbook ?? "Gestiona tus órdenes de compra."}
            </p>
          </div>
          <Link href="/ordenes/nueva" className="btn-primary w-full shrink-0 sm:w-auto">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Nueva OC
          </Link>
        </div>
      </header>

      <ComprasKpiCards
        counts={kpiCounts}
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        hint={
          panelHint && !hintDismissed
            ? {
                title: panelHint.title,
                message: panelHint.message,
                actionLabel: panelHint.actionLabel,
                href: panelHint.href,
                onDismiss: () => setHintDismissed(true),
              }
            : null
        }
      />

      <div className="flex min-h-0 flex-1 flex-col gap-2 xl:grid xl:grid-cols-4 xl:items-stretch xl:gap-4">
        <div className="flex min-h-0 min-w-0 flex-col gap-2 xl:col-span-3">
          <ComprasOrdersPanel
            orders={orders}
            obras={obras}
            activeTab={activeTab}
            onTabChange={setActiveTab}
          />

          <Link
            href="/ordenes/nueva"
            className="flex shrink-0 flex-col gap-3 rounded-xl border border-orange-200 bg-gradient-to-r from-orange-600 to-orange-700 px-4 py-3 text-white shadow-sm transition hover:from-orange-700 hover:to-orange-800 sm:flex-row sm:items-center sm:justify-between sm:py-2.5"
          >
            <div className="flex min-w-0 items-center gap-3">
              <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/15">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              </span>
              <p className="text-sm font-semibold leading-snug">Crear nueva OC · sube el PDF y regístrala</p>
            </div>
            <span className="w-full shrink-0 rounded-lg bg-white px-3 py-2 text-center text-xs font-bold text-orange-700 sm:w-auto sm:py-1.5">
              + Nueva OC
            </span>
          </Link>
        </div>

        <div className="min-h-0 xl:col-span-1">
          <HomeActivitySidebar
            recentMovements={recentMovements}
            pendingMovements={pendingMovements}
          />
        </div>
      </div>
    </div>
  );
}
