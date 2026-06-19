"use client";

import Link from "next/link";
import { useMemo } from "react";
import { HomeActivitySidebar } from "@/components/dashboard/home-activity-sidebar";
import { MiniListPanel } from "@/components/dashboard/panel-link";
import { RoleActivityIcon } from "@/components/dashboard/role-activity-icon";
import {
  INGENIERO_KPI_CONFIG,
  ingenieroKpiCounts,
} from "@/lib/dashboard/ingeniero-dashboard";
import { MATERIAL_REQUEST_STATUS_LABEL, DIRECT_EXPENSE_STATUS_LABEL } from "@/lib/domain/solicitudes";
import type {
  DirectExpenseDto,
  MaterialRequestDto,
  MovementDto,
  PendingMovementDto,
  PurchaseOrderDto,
} from "@/lib/domain/types";

export function IngenieroHomeDashboard({
  userId,
  userName,
  orders,
  materialRequests,
  expenses,
  recentMovements,
  pendingMovements,
}: {
  userId: string;
  userName: string;
  orders: PurchaseOrderDto[];
  materialRequests: MaterialRequestDto[];
  expenses: DirectExpenseDto[];
  recentMovements: MovementDto[];
  pendingMovements: PendingMovementDto[];
}) {
  const counts = useMemo(
    () => ingenieroKpiCounts({ materialRequests, expenses, orders, engineerUserId: userId }),
    [materialRequests, expenses, orders, userId]
  );

  const ocQueue = useMemo(
    () =>
      orders.filter(
        (o) =>
          o.status === "awaitingEngineer" &&
          (o.assignedEngineerUserId === userId || !o.assignedEngineerUserId)
      ),
    [orders, userId]
  );

  const myMaterial = useMemo(
    () => materialRequests.filter((r) => r.createdByUserId === userId).slice(0, 5),
    [materialRequests, userId]
  );

  const myExpenses = useMemo(
    () => expenses.filter((e) => e.createdByUserId === userId).slice(0, 5),
    [expenses, userId]
  );

  return (
    <div className="flex min-h-0 flex-col gap-4 overflow-x-hidden overflow-y-auto lg:h-[calc(100dvh-5.5rem)]">
      <header className="shrink-0">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-bold text-zinc-900 sm:text-2xl">
              ¡Hola, {userName.split(" ")[0]}!
            </h1>
            <p className="mt-1 flex items-center gap-2 text-sm text-zinc-500">
              <RoleActivityIcon role="ingeniero" size="sm" />
              Ingeniería — Inicia solicitudes (Proceso A y B) y aprueba las OC que envía Compras.
            </p>
          </div>
          <Link href="/solicitudes/nueva" className="btn-primary w-full shrink-0 sm:w-auto">
            + Nueva solicitud
          </Link>
        </div>
      </header>

      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4 lg:gap-3">
        {INGENIERO_KPI_CONFIG.map((cfg) => (
          <div
            key={cfg.key}
            className={`flex min-w-0 flex-col rounded-2xl border border-orange-100/80 border-l-4 p-3 shadow-sm ${cfg.accent}`}
          >
            <div className="flex items-start justify-between gap-2">
              <span className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${cfg.iconBg}`}>
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </span>
              <span className="text-2xl font-bold tabular-nums text-zinc-900">{counts[cfg.key]}</span>
            </div>
            <p className="mt-2 text-xs font-semibold text-zinc-800 lg:text-sm">{cfg.label}</p>
            <p className="mt-0.5 text-[11px] text-zinc-500 lg:text-xs">{cfg.sublabel}</p>
          </div>
        ))}
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 xl:grid-cols-4">
        <div className="flex min-h-0 flex-col gap-4 xl:col-span-3">
          <MiniListPanel
            title="OC pendientes de revisión"
            surface="bandeja"
            empty="No hay OC esperando tu aprobación."
            href={ocQueue[0] ? `/ordenes/${ocQueue[0].id}` : "/obras"}
            linkLabel={ocQueue[0] ? "Revisar primera" : "Ver obras"}
            items={ocQueue.slice(0, 5).map((o) => ({
              id: o.id,
              primary: o.title,
              secondary: `${o.obraName} · ${o.supplierName}`,
              href: `/ordenes/${o.id}`,
            }))}
          />

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <MiniListPanel
              title="Mis solicitudes de material (A)"
              surface="obras"
              empty="Aún no has creado solicitudes."
              href="/solicitudes/material/nueva"
              linkLabel="Nueva solicitud A"
              items={myMaterial.map((r) => ({
                id: r.id,
                primary: r.materials.slice(0, 60) + (r.materials.length > 60 ? "…" : ""),
                secondary: `${r.obraName} · ${MATERIAL_REQUEST_STATUS_LABEL[r.status]}`,
                href: `/solicitudes/material/${r.id}`,
              }))}
            />

            <MiniListPanel
              title="Mis gastos directos (B)"
              surface="ordenes"
              empty="Aún no has creado gastos directos."
              href="/solicitudes/gasto/nueva"
              linkLabel="Nuevo gasto B"
              items={myExpenses.map((e) => ({
                id: e.id,
                primary: e.category || e.justification.slice(0, 50),
                secondary: `${e.obraName} · ${DIRECT_EXPENSE_STATUS_LABEL[e.status]}`,
                href: `/solicitudes/gasto/${e.id}`,
              }))}
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Link
              href="/obras"
              className="rounded-xl border border-teal-200 bg-gradient-to-r from-teal-600 to-teal-700 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:from-teal-700"
            >
              Crear o consultar obras
            </Link>
            <Link
              href="/solicitudes/material/nueva"
              className="rounded-xl border border-orange-200 bg-gradient-to-r from-orange-600 to-orange-700 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:from-orange-700"
            >
              Proceso A — Solicitud de material
            </Link>
            <Link
              href="/solicitudes/gasto/nueva"
              className="rounded-xl border border-teal-200 bg-gradient-to-r from-teal-600 to-teal-700 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:from-teal-700"
            >
              Proceso B — Gasto directo sin OC
            </Link>
          </div>
        </div>

        <div className="min-h-0 xl:col-span-1">
          <HomeActivitySidebar
            className="h-full"
            recentMovements={recentMovements}
            pendingMovements={pendingMovements}
          />
        </div>
      </div>
    </div>
  );
}
