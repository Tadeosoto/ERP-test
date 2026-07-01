"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { CalloutBubble } from "@/components/ui/callout-bubble";
import { ContabilidadHomeBottomColumns } from "@/components/dashboard/contabilidad-home-bottom-columns";
import { ContabilidadHomeSidebar } from "@/components/dashboard/contabilidad-home-sidebar";
import { ContabilidadRecentPaymentsPanel } from "@/components/dashboard/contabilidad-recent-payments-panel";
import { RoleActivityIcon } from "@/components/dashboard/role-activity-icon";
import {
  CONTABILIDAD_HOME_KPI_CONFIG,
  contabilidadHomeKpiCounts,
} from "@/lib/dashboard/contabilidad-dashboard";
import { getHomePanelHint } from "@/lib/dashboard/role-hints";
import { ROLE_LABEL } from "@/lib/domain/labels";
import type {
  MovementDto,
  ObraDto,
  PendingMovementDto,
  PurchaseOrderDto,
  Role,
} from "@/lib/domain/types";

function KpiIcon({ name }: { name: (typeof CONTABILIDAD_HOME_KPI_CONFIG)[number]["icon"] }) {
  const cls = "h-5 w-5";
  if (name === "payDone") {
    return (
      <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
      </svg>
    );
  }
  if (name === "payPending") {
    return (
      <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    );
  }
  if (name === "folder") {
    return (
      <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
        />
      </svg>
    );
  }
  return (
    <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeWidth={2} d="M4 5h6v6H4V5zm10 0h6v6h-6V5zM4 15h6v6H4v-6zm10 0h6v6h-6v-6z" />
    </svg>
  );
}

function QuickActionButton({
  href,
  label,
  icon,
}: {
  href: string;
  label: string;
  icon: "pay" | "pending" | "obras" | "search";
}) {
  return (
    <Link
      href={href}
      className="flex min-h-12 flex-1 items-center justify-center gap-2.5 rounded-2xl border border-orange-100/90 bg-white px-3 py-2.5 shadow-sm transition hover:border-orange-200 hover:bg-orange-50/25 hover:shadow-md sm:min-h-11"
    >
      <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-orange-700">
        {icon === "pay" && (
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8V6m0 12v-2m9-4a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        )}
        {icon === "pending" && (
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        )}
        {icon === "obras" && (
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
            <path strokeWidth={2} d="M4 5h6v6H4V5zm10 0h6v6h-6V5zM4 15h6v6H4v-6zm10 0h6v6h-6v-6z" />
          </svg>
        )}
        {icon === "search" && (
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        )}
      </span>
      <span className="text-xs font-semibold text-zinc-800 sm:text-sm">{label}</span>
    </Link>
  );
}

export function ContabilidadRecepcionHomeDashboard({
  userName,
  role,
  orders,
  obras,
  recentMovements,
  pendingMovements,
}: {
  userName: string;
  role: Role;
  orders: PurchaseOrderDto[];
  obras: ObraDto[];
  recentMovements: MovementDto[];
  pendingMovements: PendingMovementDto[];
}) {
  const [hintDismissed, setHintDismissed] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const counts = useMemo(
    () => contabilidadHomeKpiCounts({ orders, obras }),
    [orders, obras]
  );

  const panelHint = useMemo(() => getHomePanelHint(role, orders), [role, orders]);
  const hintKey = panelHint ? `${panelHint.href}:${panelHint.message}` : "";

  useEffect(() => {
    setHintDismissed(false);
  }, [hintKey]);

  const roleSubtitle =
    role === "contabilidad"
      ? "Consulta documentos, pagos y expedientes del sistema."
      : "Consulta expedientes y sube facturas de las órdenes de compra.";

  return (
    <div className="home-dashboard flex flex-col gap-3 pb-4 sm:gap-3 lg:gap-3">
      <header className="shrink-0">
        <h1 className="text-xl font-bold text-zinc-900 sm:text-2xl">
          ¡Hola, {userName.split(" ")[0]}!
        </h1>
        <p className="mt-0.5 flex items-start gap-2 text-xs text-zinc-500 sm:items-center sm:text-sm">
          <RoleActivityIcon role={role} size="sm" />
          <span>
            {ROLE_LABEL[role]} · {roleSubtitle}
          </span>
        </p>
      </header>

      <div className="grid shrink-0 grid-cols-2 gap-2 lg:grid-cols-4 lg:gap-3">
        {CONTABILIDAD_HOME_KPI_CONFIG.map((cfg) => (
          <Link
            key={cfg.key}
            href={cfg.href}
            className={`flex h-full min-w-0 flex-col rounded-2xl border border-orange-100/80 border-l-4 p-3 shadow-sm transition hover:shadow-md lg:p-3.5 ${cfg.accent}`}
          >
            <div className="flex items-start justify-between gap-2">
              <span
                className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl lg:h-10 lg:w-10 ${cfg.iconBg}`}
              >
                <KpiIcon name={cfg.icon} />
              </span>
              <span className="text-2xl font-bold tabular-nums text-zinc-900 lg:text-3xl">
                {counts[cfg.key]}
              </span>
            </div>
            <p className="mt-2 text-xs font-semibold leading-snug text-zinc-800 lg:text-sm">
              {cfg.label}
            </p>
            <p className="mt-0.5 line-clamp-2 text-[11px] text-zinc-500 lg:text-xs">{cfg.sublabel}</p>
            <span className={`mt-2 text-xs font-medium lg:text-sm ${cfg.linkClass}`}>Ver →</span>
          </Link>
        ))}
      </div>

      <div className="shrink-0">
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
          Acceso rápido
        </p>
        <div className="mb-2">
          <div className="relative">
            <svg
              className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar expediente"
              className="block w-full rounded-2xl border border-zinc-200 bg-white py-3 pl-10 pr-4 text-sm shadow-sm focus:border-orange-300 focus:outline-none focus:ring-1 focus:ring-orange-200"
            />
          </div>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          {role === "recepcion" ? (
            <>
              <QuickActionButton href="/expedientes" label="Ver expedientes" icon="pending" />
              <QuickActionButton href="/obras" label="Ver obras" icon="obras" />
            </>
          ) : (
            <>
              <QuickActionButton href="/ordenes" label="Ver pagos" icon="pay" />
              <QuickActionButton href="/ordenes" label="Ver pendientes" icon="pending" />
              <QuickActionButton href="/obras" label="Ver obras" icon="obras" />
            </>
          )}
        </div>
      </div>

      {panelHint && !hintDismissed && (
        <CalloutBubble
          title={panelHint.title}
          message={panelHint.message}
          actionLabel={panelHint.actionLabel}
          href={panelHint.href}
          onDismiss={() => setHintDismissed(true)}
          tailSide="top"
          tailAlign="left"
        />
      )}

      <div className="flex min-w-0 flex-col gap-3 lg:flex-row lg:items-start lg:gap-4">
        <div className="flex min-w-0 flex-1 flex-col gap-3 lg:flex-[3]">
          <ContabilidadRecentPaymentsPanel
            orders={orders}
            role={role}
            searchQuery={searchQuery}
            embedded
          />
          <ContabilidadHomeBottomColumns orders={orders} />
        </div>

        <div className="w-full shrink-0 lg:sticky lg:top-4 lg:w-72 lg:flex-[1] xl:w-80">
          <ContabilidadHomeSidebar
            orders={orders}
            recentMovements={recentMovements}
            pendingMovements={pendingMovements}
          />
        </div>
      </div>
    </div>
  );
}
