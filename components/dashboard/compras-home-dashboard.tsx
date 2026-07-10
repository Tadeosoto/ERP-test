"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { RoleQuickGuideBanner } from "@/components/dashboard/role-quick-guide";
import { ComprasKpiCards } from "@/components/dashboard/compras-kpi-cards";
import { ComprasMaterialRequestsPanel } from "@/components/dashboard/compras-material-requests-panel";
import { ComprasOrdersPanel } from "@/components/dashboard/compras-orders-panel";
import { HomeActivitySidebar } from "@/components/dashboard/home-activity-sidebar";
import { RoleActivityIcon } from "@/components/dashboard/role-activity-icon";
import { comprasKpiCounts, type ComprasOrderTab } from "@/lib/dashboard/compras-dashboard";
import { getHomePanelHint } from "@/lib/dashboard/role-hints";
import type {
  InvoiceFirstCommitmentDto,
  MovementDto,
  ObraDto,
  MaterialRequestDto,
  PendingMovementDto,
  PurchaseOrderDto,
} from "@/lib/domain/types";
import { PagosProcesoCPanel } from "@/components/dashboard/pagos-proceso-c-panel";

export function ComprasHomeDashboard({
  userName,
  orders,
  obras,
  materialRequests = [],
  invoiceCommitments = [],
  recentMovements,
  pendingMovements,
  onOrderMutated,
}: {
  userName: string;
  orders: PurchaseOrderDto[];
  obras: ObraDto[];
  materialRequests?: MaterialRequestDto[];
  invoiceCommitments?: InvoiceFirstCommitmentDto[];
  recentMovements: MovementDto[];
  pendingMovements: PendingMovementDto[];
  onOrderMutated?: () => void;
}) {
  const [activeTab, setActiveTab] = useState<ComprasOrderTab>("all");
  const [hintDismissed, setHintDismissed] = useState(false);

  const kpiCounts = useMemo(() => comprasKpiCounts(orders), [orders]);
  const panelHint = useMemo(() => getHomePanelHint("compras", orders), [orders]);
  const hintKey = panelHint ? `${panelHint.href}:${panelHint.message}` : "";

  useEffect(() => {
    setHintDismissed(false);
  }, [hintKey]);

  return (
    <div className="home-dashboard flex flex-col gap-3 pb-2 sm:gap-4 lg:min-h-0 lg:flex-1 lg:gap-3 lg:overflow-y-auto lg:pb-4">
      {/* Bloque principal: ocupa el viewport; las colas van debajo con scroll */}
      <div className="flex min-h-0 flex-col gap-3 lg:min-h-[calc(100dvh-6.5rem)] lg:flex-none">
        <header className="shrink-0">
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
            <div className="min-w-0 flex-1">
              <h1 className="text-xl font-bold text-zinc-900 sm:text-2xl">
                ¡Hola, {userName.split(" ")[0]}!
              </h1>
              <p className="mt-0.5 flex items-start gap-2 text-xs text-zinc-500 sm:items-center sm:text-sm">
                <RoleActivityIcon role="compras" size="sm" />
                <span>Compras — Registra la OC con PDF tras negociar con proveedores.</span>
              </p>
            </div>
            <Link href="/ordenes/nueva" className="btn-primary h-11 min-h-11 w-full shrink-0 text-sm sm:w-auto">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Nueva OC
            </Link>
          </div>
        </header>

        <div className="compras-dashboard-grid min-h-0 min-w-0 flex-1">
          <ComprasKpiCards
            layout="embedded"
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

          <div className="col-span-2 flex min-h-0 min-w-0 flex-col gap-2 lg:col-span-4 lg:row-start-2 lg:overflow-hidden">
            <ComprasOrdersPanel
              orders={orders}
              obras={obras}
              activeTab={activeTab}
              onTabChange={setActiveTab}
              onOrderMutated={onOrderMutated}
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

            <RoleQuickGuideBanner role="compras" compact />
          </div>

          <div className="col-span-2 flex min-h-0 min-w-0 flex-col lg:col-span-1 lg:row-start-2 lg:self-stretch">
            <HomeActivitySidebar
              compact
              limit={3}
              className="lg:h-full lg:min-h-0"
              recentMovements={recentMovements}
              pendingMovements={pendingMovements}
            />
          </div>
        </div>
      </div>

      {/* Colas secundarias compactas en una fila (scroll hacia abajo) */}
      <div className="grid shrink-0 grid-cols-1 gap-2 lg:grid-cols-2">
        <ComprasMaterialRequestsPanel requests={materialRequests} compact />
        <PagosProcesoCPanel commitments={invoiceCommitments} role="compras" compact />
      </div>
    </div>
  );
}
