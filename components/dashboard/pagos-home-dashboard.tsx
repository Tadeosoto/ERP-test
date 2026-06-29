"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { CalloutBubble } from "@/components/ui/callout-bubble";
import { PagosHomeBottomColumns } from "@/components/dashboard/pagos-home-bottom-columns";
import { PagosPendingPaymentsPanel } from "@/components/dashboard/pagos-pending-payments-panel";
import { PagosHomeSidebar } from "@/components/dashboard/pagos-home-sidebar";
import { RoleActivityIcon } from "@/components/dashboard/role-activity-icon";
import {
  PAGOS_HOME_KPI_CONFIG,
  pagosHomeKpiCounts,
} from "@/lib/dashboard/pagos-dashboard";
import { getHomePanelHint } from "@/lib/dashboard/role-hints";
import type {
  MovementDto,
  ObraDto,
  PendingMovementDto,
  PurchaseOrderDto,
  SupplierDto,
} from "@/lib/domain/types";
import { ProveedorModal } from "@/components/compras/proveedor-modal";
import { NuevaObraModal } from "@/components/obras/nueva-obra-modal";
import { RegistrarPagoModal } from "@/components/pagos/registrar-pago-modal";
import { payableOrders } from "@/lib/pagos/registrar-pago-form";

function KpiIcon({ name }: { name: (typeof PAGOS_HOME_KPI_CONFIG)[number]["icon"] }) {
  const cls = "h-5 w-5 lg:h-5 lg:w-5";
  if (name === "pay") {
    return (
      <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8V6m0 12v-2m9-4a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    );
  }
  if (name === "calendar") {
    return (
      <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
        />
      </svg>
    );
  }
  if (name === "receipt") {
    return (
      <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
        />
      </svg>
    );
  }
  if (name === "suppliers") {
    return (
      <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
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
  onClick,
  disabled,
}: {
  href?: string;
  label: string;
  icon: "pay" | "suppliers" | "obras" | "search";
  onClick?: () => void;
  disabled?: boolean;
}) {
  const content = (
    <>
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
        {icon === "suppliers" && (
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
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
    </>
  );

  const className = `flex min-h-12 flex-1 items-center justify-center gap-2.5 rounded-2xl border border-orange-100/90 bg-white px-3 py-2.5 shadow-sm transition hover:border-orange-200 hover:bg-orange-50/25 hover:shadow-md sm:min-h-11 ${
    disabled ? "pointer-events-none opacity-50" : ""
  }`;

  if (onClick) {
    return (
      <button type="button" onClick={onClick} disabled={disabled} className={className}>
        {content}
      </button>
    );
  }

  return (
    <Link href={href ?? "#"} className={className}>
      {content}
    </Link>
  );
}

export function PagosHomeDashboard({
  userName,
  orders,
  obras,
  suppliers,
  recentMovements,
  pendingMovements,
  onOrdersMutated,
}: {
  userName: string;
  orders: PurchaseOrderDto[];
  obras: ObraDto[];
  suppliers: SupplierDto[];
  recentMovements: MovementDto[];
  pendingMovements: PendingMovementDto[];
  onOrdersMutated?: () => void;
}) {
  const [hintDismissed, setHintDismissed] = useState(false);
  const [pagoModalOpen, setPagoModalOpen] = useState(false);
  const [pagoModalOrderId, setPagoModalOrderId] = useState<string | null>(null);
  const [proveedorModalOpen, setProveedorModalOpen] = useState(false);
  const [obraModalOpen, setObraModalOpen] = useState(false);

  const counts = useMemo(
    () => pagosHomeKpiCounts({ orders, suppliers, obras }),
    [orders, suppliers, obras]
  );

  const panelHint = useMemo(() => getHomePanelHint("pagos", orders), [orders]);
  const hintKey = panelHint ? `${panelHint.href}:${panelHint.message}` : "";

  const payable = useMemo(() => payableOrders(orders), [orders]);

  useEffect(() => {
    setHintDismissed(false);
  }, [hintKey]);

  function openRegistrarPago(orderId?: string | null) {
    setPagoModalOrderId(orderId ?? payable[0]?.id ?? null);
    setPagoModalOpen(true);
  }

  return (
    <div className="home-dashboard flex flex-col gap-3 pb-4 sm:gap-3 lg:gap-3">
      <header className="shrink-0">
        <h1 className="text-xl font-bold text-zinc-900 sm:text-2xl">
          ¡Hola, {userName.split(" ")[0]}!
        </h1>
        <p className="mt-0.5 flex items-start gap-2 text-xs text-zinc-500 sm:items-center sm:text-sm">
          <RoleActivityIcon role="pagos" size="sm" />
          <span>Administración — Registra pagos y da seguimiento al catálogo del sistema.</span>
        </p>
      </header>

      <div className="grid shrink-0 grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5 lg:gap-3">
        {PAGOS_HOME_KPI_CONFIG.map((cfg) => (
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
          Acciones rápidas
        </p>
        <div className="flex flex-col gap-2 sm:flex-row">
          <QuickActionButton
            label="Registrar pago"
            icon="pay"
            disabled={payable.length === 0}
            onClick={() => openRegistrarPago()}
          />
          <QuickActionButton
            label="Proveedores"
            icon="suppliers"
            onClick={() => setProveedorModalOpen(true)}
          />
          <QuickActionButton label="Nueva obra" icon="obras" onClick={() => setObraModalOpen(true)} />
          <QuickActionButton href="/obras?estado=pago" label="Buscar expediente" icon="search" />
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
        {/* Columna principal: tabla arriba, resúmenes abajo */}
        <div className="flex min-w-0 flex-1 flex-col gap-3 lg:flex-[3]">
          <PagosPendingPaymentsPanel orders={orders} embedded />
          <PagosHomeBottomColumns orders={orders} suppliers={suppliers} obras={obras} />
        </div>

        {/* Sidebar derecha */}
        <div className="w-full shrink-0 lg:sticky lg:top-4 lg:w-72 lg:flex-[1] xl:w-80">
          <PagosHomeSidebar
            recentMovements={recentMovements}
            pendingMovements={pendingMovements}
          />
        </div>
      </div>

      <RegistrarPagoModal
        open={pagoModalOpen}
        onClose={() => setPagoModalOpen(false)}
        orders={orders}
        obras={obras}
        initialOrderId={pagoModalOrderId}
        onCompleted={onOrdersMutated}
      />

      <ProveedorModal
        open={proveedorModalOpen}
        onClose={() => setProveedorModalOpen(false)}
        onSaved={() => onOrdersMutated?.()}
      />

      <NuevaObraModal
        open={obraModalOpen}
        onClose={() => setObraModalOpen(false)}
        onSaved={() => onOrdersMutated?.()}
      />
    </div>
  );
}
