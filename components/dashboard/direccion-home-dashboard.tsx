"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { DireccionCommitmentsPanel } from "@/components/dashboard/direccion-commitments-panel";
import { DireccionHomeSidebar } from "@/components/dashboard/direccion-home-sidebar";
import { SubirFacturaModal } from "@/components/direccion/subir-factura-modal";
import { RoleActivityIcon } from "@/components/dashboard/role-activity-icon";
import {
  authorizedPaymentsCountMonth,
  direccionKpiCounts,
  kpiMonthGrowth,
  pendingAuthorizationCount,
} from "@/lib/dashboard/direccion-dashboard";
import {
  direccionFacturasEsperandoOcKpi,
  enrichInvoiceFirstCommitments,
} from "@/lib/dashboard/direccion-proceso-c-dashboard";
import { ROLE_LABEL } from "@/lib/domain/labels";
import type {
  InvoiceFirstCommitmentDto,
  MovementDto,
  ObraDto,
  PendingMovementDto,
  PurchaseOrderDto,
  SupplierDto,
} from "@/lib/domain/types";
import { formatMoney } from "@/lib/format";

function KpiCard({
  label,
  value,
  sub,
  accent,
  iconBg,
  href,
  linkClass,
  icon,
}: {
  label: string;
  value: string;
  sub: string;
  accent: string;
  iconBg: string;
  href: string;
  linkClass: string;
  icon: "wallet" | "hourglass" | "doc" | "check" | "invoice";
}) {
  return (
    <Link
      href={href}
      className={`flex h-full min-w-0 flex-col rounded-2xl border border-orange-100/80 border-l-4 p-3 shadow-sm transition hover:shadow-md lg:p-3.5 ${accent}`}
    >
      <div className="flex items-start justify-between gap-2">
        <span className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl lg:h-10 lg:w-10 ${iconBg}`}>
          {icon === "wallet" && (
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
          )}
          {icon === "hourglass" && (
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          )}
          {icon === "invoice" && (
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          )}
          {icon === "doc" && (
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          )}
          {icon === "check" && (
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          )}
        </span>
        <span className="text-right text-lg font-bold tabular-nums leading-tight text-zinc-900 lg:text-xl">
          {value}
        </span>
      </div>
      <p className="mt-2 text-xs font-semibold leading-snug text-zinc-800 lg:text-sm">{label}</p>
      <p className={`mt-0.5 text-[11px] lg:text-xs ${linkClass}`}>{sub}</p>
    </Link>
  );
}

export function DireccionHomeDashboard({
  userName,
  orders,
  obras,
  suppliers,
  invoiceCommitments,
  recentMovements,
  pendingMovements,
  onCommitmentsMutated,
}: {
  userName: string;
  orders: PurchaseOrderDto[];
  obras: ObraDto[];
  suppliers: SupplierDto[];
  invoiceCommitments: InvoiceFirstCommitmentDto[];
  recentMovements: MovementDto[];
  pendingMovements: PendingMovementDto[];
  onCommitmentsMutated?: () => void;
}) {
  const [modalOpen, setModalOpen] = useState(false);
  const currency = orders[0]?.currency ?? "MXN";

  const kpis = useMemo(() => direccionKpiCounts(orders), [orders]);
  const growth = useMemo(() => kpiMonthGrowth(orders), [orders]);
  const enriched = useMemo(
    () => enrichInvoiceFirstCommitments(invoiceCommitments, orders),
    [invoiceCommitments, orders]
  );
  const facturasKpi = useMemo(() => direccionFacturasEsperandoOcKpi(enriched), [enriched]);
  const authCount = useMemo(() => authorizedPaymentsCountMonth(orders), [orders]);
  const pendingCount = useMemo(() => pendingAuthorizationCount(orders), [orders]);

  const growthText =
    growth === null
      ? "Sin comparación"
      : growth >= 0
        ? `+${growth}% vs. mes anterior`
        : `${growth}% vs. mes anterior`;

  return (
    <div className="home-dashboard flex flex-col gap-3 pb-4 sm:gap-4 lg:gap-4">
      <header className="shrink-0">
        <h1 className="text-xl font-bold text-zinc-900 sm:text-2xl">
          ¡Hola, {userName.replace(/^Ing\.\s*/i, "").trim() || userName}!
        </h1>
        <p className="mt-0.5 flex items-start gap-2 text-xs text-zinc-500 sm:items-center sm:text-sm">
          <RoleActivityIcon role="direccion" size="sm" />
          <span>{ROLE_LABEL.direccion} · Resumen general de pagos, gastos y autorizaciones pendientes.</span>
        </p>
      </header>

      <div className="grid shrink-0 grid-cols-2 gap-2 lg:grid-cols-5 lg:gap-3">
        <KpiCard
          label="Gasto total este mes"
          value={formatMoney(kpis.gastoTotalMes, currency)}
          sub={growthText}
          accent="border-l-violet-400 bg-violet-50/35"
          iconBg="bg-violet-100 text-violet-800"
          href="/reportes"
          linkClass="text-emerald-700"
          icon="wallet"
        />
        <KpiCard
          label="Pagos pendientes de autorizar"
          value={formatMoney(kpis.pagosPendientesAutorizar, currency)}
          sub={`${pendingCount} pago${pendingCount === 1 ? "" : "s"}`}
          accent="border-l-orange-400 bg-orange-50/40"
          iconBg="bg-orange-100 text-orange-700"
          href="/pagos"
          linkClass="text-orange-700"
          icon="hourglass"
        />
        <KpiCard
          label="Facturas registradas (esperando OC)"
          value={formatMoney(facturasKpi.amount, currency)}
          sub={`${facturasKpi.count} factura${facturasKpi.count === 1 ? "" : "s"}`}
          accent="border-l-amber-400 bg-amber-50/40"
          iconBg="bg-amber-100 text-amber-800"
          href="/inicio"
          linkClass="text-amber-800"
          icon="invoice"
        />
        <KpiCard
          label="Pagos parciales activos"
          value={String(kpis.pagosParcialesActivos)}
          sub="Con saldo pendiente"
          accent="border-l-sky-400 bg-sky-50/35"
          iconBg="bg-sky-100 text-sky-800"
          href="/pagos"
          linkClass="text-sky-800"
          icon="doc"
        />
        <KpiCard
          label="Pagos autorizados este mes"
          value={formatMoney(kpis.pagosAutorizadosMes, currency)}
          sub={`${authCount} pago${authCount === 1 ? "" : "s"} →`}
          accent="border-l-emerald-400 bg-emerald-50/35"
          iconBg="bg-emerald-100 text-emerald-800"
          href="/pagos"
          linkClass="text-emerald-800"
          icon="check"
        />
      </div>

      <div className="grid min-h-0 grid-cols-1 gap-3 xl:grid-cols-[1fr_18rem] 2xl:grid-cols-[1fr_20rem]">
        <DireccionCommitmentsPanel
          commitments={enriched}
          onUploadClick={() => setModalOpen(true)}
        />
        <DireccionHomeSidebar
          orders={orders}
          recentMovements={recentMovements}
          pendingMovements={pendingMovements}
        />
      </div>

      <SubirFacturaModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSaved={() => onCommitmentsMutated?.()}
        suppliers={suppliers}
        obras={obras.filter((o) => o.active)}
      />
    </div>
  );
}
