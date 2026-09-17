"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  CalmKpiTile,
  DashPanelHeader,
  HomeHeroMetric,
  HomeLauncherLink,
  HomePulseLine,
} from "@/components/dashboard/calm-kpi-tile";
import { HomeWorkTabs } from "@/components/dashboard/home-work-tabs";
import { ProcessAHomeMap } from "@/components/dashboard/process-a-home-map";
import { OcLink } from "@/components/ui/oc-link";
import { RegistrarPagoModal } from "@/components/pagos/registrar-pago-modal";
import {
  filterPagosQueueOrders,
  PAGOS_PAYMENT_STATUS_LABEL,
  PAGOS_PAYMENT_STATUS_TONE,
  pagosHomeKpiCounts,
  pagosPaymentDisplayStatus,
} from "@/lib/dashboard/pagos-dashboard";
import { isActivePartial, isPendingAuthorization } from "@/lib/dashboard/direccion-dashboard";
import { payableOrders } from "@/lib/pagos/registrar-pago-form";
import type {
  InvoiceFirstCommitmentDto,
  ObraDto,
  PurchaseOrderDto,
  SupplierDto,
} from "@/lib/domain/types";
import { formatMoney } from "@/lib/format";

const QUEUE_LIMIT = 8;

type PagosHomeTab = "pagar" | "autorizar" | "parciales" | "compromisos" | "mapa";

export function PagosHomeDashboard({
  userName,
  orders,
  obras,
  suppliers,
  invoiceCommitments = [],
  onOrdersMutated,
}: {
  userName: string;
  orders: PurchaseOrderDto[];
  obras: ObraDto[];
  suppliers: SupplierDto[];
  commitments?: unknown[];
  expenses?: unknown[];
  invoiceCommitments?: InvoiceFirstCommitmentDto[];
  materialRequests?: unknown[];
  recentMovements?: unknown[];
  pendingMovements?: unknown[];
  onOrdersMutated?: () => void;
  onCommitmentsMutated?: () => void;
}) {
  const [tab, setTab] = useState<PagosHomeTab>("pagar");
  const [pagoModalOpen, setPagoModalOpen] = useState(false);
  const [pagoModalOrderId, setPagoModalOrderId] = useState<string | null>(null);

  const counts = useMemo(
    () => pagosHomeKpiCounts({ orders, suppliers, obras }),
    [orders, suppliers, obras]
  );

  const partials = useMemo(() => orders.filter(isActivePartial), [orders]);
  const authorizeQueue = useMemo(
    () => orders.filter(isPendingAuthorization).slice(0, QUEUE_LIMIT),
    [orders]
  );

  const facturasEspera = useMemo(
    () =>
      invoiceCommitments.filter(
        (c) => c.status === "awaiting_oc" || c.status === "oc_requested"
      ).length,
    [invoiceCommitments]
  );

  const saldoPendiente = useMemo(
    () =>
      orders
        .filter((o) => o.status === "awaitingPayment")
        .reduce((s, o) => s + o.amountRemaining, 0),
    [orders]
  );

  const currency =
    orders.find((o) => o.status === "awaitingPayment")?.currency ??
    orders[0]?.currency ??
    "MXN";

  const payQueue = useMemo(
    () =>
      filterPagosQueueOrders({
        orders,
        search: "",
        obraId: "all",
        supplier: "all",
        estado: "all",
      }).slice(0, QUEUE_LIMIT),
    [orders]
  );

  const queueTotal = useMemo(
    () =>
      filterPagosQueueOrders({
        orders,
        search: "",
        obraId: "all",
        supplier: "all",
        estado: "all",
      }).length,
    [orders]
  );

  const payable = useMemo(() => payableOrders(orders), [orders]);

  const pulse = useMemo(() => {
    if (counts.pagosPorRealizar === 0 && authorizeQueue.length === 0) {
      return "Nada urgente. Autoriza OC, registra pagos o revisa compromisos.";
    }
    const bits: string[] = [];
    if (authorizeQueue.length > 0) {
      bits.push(
        `${authorizeQueue.length} por autorizar (tú o Dirección)`
      );
    }
    if (counts.pagosPorRealizar > 0) {
      bits.push(
        `${counts.pagosPorRealizar} lista${counts.pagosPorRealizar === 1 ? "" : "s"} para pagar`
      );
    }
    return bits.join(" · ");
  }, [counts.pagosPorRealizar, authorizeQueue.length]);

  const tabs = useMemo(
    () => [
      { id: "pagar", label: "Órdenes de compra pendientes", count: counts.pagosPorRealizar },
      { id: "autorizar", label: "Autorizar", count: authorizeQueue.length },
      { id: "parciales", label: "Parciales", count: partials.length },
      { id: "compromisos", label: "Compromisos" },
      { id: "mapa", label: "Mapa" },
    ],
    [counts.pagosPorRealizar, authorizeQueue.length, partials.length]
  );

  function openRegistrarPago(orderId?: string | null) {
    setPagoModalOrderId(orderId ?? payable[0]?.id ?? null);
    setPagoModalOpen(true);
  }

  function renderOrderRow(
    order: PurchaseOrderDto,
    action: "pagar" | "revisar"
  ) {
    const status = pagosPaymentDisplayStatus(order);
    const amount =
      order.status === "awaitingPayment" ? order.amountRemaining : order.totalAmount;
    return (
      <li key={order.id} className="flex flex-wrap items-center gap-3 px-4 py-4 sm:px-5">
        <div className="min-w-0 flex-1">
          <OcLink order={order} showPdfIcon className="text-sm" />
          <p className="dash-caption mt-0.5 truncate">
            {order.obraName} · {order.supplierName}
          </p>
        </div>
        <span
          className={`inline-flex shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${PAGOS_PAYMENT_STATUS_TONE[status]}`}
        >
          {PAGOS_PAYMENT_STATUS_LABEL[status]}
        </span>
        <span className="shrink-0 text-base font-bold tabular-nums text-zinc-900">
          {formatMoney(amount, order.currency)}
        </span>
        {action === "pagar" ? (
          <button
            type="button"
            onClick={() => openRegistrarPago(order.id)}
            className="btn-primary !min-h-9 shrink-0 !px-3 !py-1.5 !text-xs"
          >
            Pagar
          </button>
        ) : (
          <Link
            href={`/ordenes/${order.id}`}
            className="btn-secondary !min-h-9 shrink-0 !px-3 !py-1.5 !text-xs"
          >
            Revisar
          </Link>
        )}
      </li>
    );
  }

  return (
    <div className="home-dashboard flex w-full flex-col gap-4 pb-6 lg:gap-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="dash-caption">Administración</p>
          <h1 className="mt-0.5 text-xl font-bold tracking-tight text-zinc-900 sm:text-2xl">
            Hola, {userName.split(" ")[0]}
          </h1>
          <HomePulseLine>{pulse}</HomePulseLine>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/obras" className="btn-secondary shrink-0">
            Nueva obra
          </Link>
          <button
            type="button"
            className="btn-primary shrink-0"
            disabled={payable.length === 0}
            onClick={() => openRegistrarPago()}
          >
            Registrar pago
          </button>
        </div>
      </header>

      <div className="grid gap-4 lg:grid-cols-12">
        <div className="lg:col-span-6">
          <HomeHeroMetric
            label="Saldo por pagar"
            value={formatMoney(saldoPendiente, currency)}
            hint={
              counts.pagosPorRealizar > 0
                ? `${counts.pagosPorRealizar} OC en cola`
                : "Sin montos pendientes"
            }
          />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 lg:col-span-6">
          <CalmKpiTile
            label="Órdenes pendientes"
            value={counts.pagosPorRealizar}
            sub="Por pagar"
            tint="orange"
            selected={tab === "pagar"}
            onClick={() => setTab("pagar")}
          />
          <CalmKpiTile
            label="Parciales"
            value={partials.length + counts.comprobantesPendientes}
            sub={`${partials.length} parcial · ${counts.comprobantesPendientes} sin comprobante`}
            tint="amber"
            selected={tab === "parciales"}
            onClick={() => setTab("parciales")}
          />
          <CalmKpiTile
            label="Facturas espera"
            value={facturasEspera}
            sub="Proceso aparte"
            href="/facturas"
            tint="teal"
          />
        </div>
      </div>

      <HomeWorkTabs tabs={tabs} activeId={tab} onChange={(id) => setTab(id as PagosHomeTab)} />

      <div className="flex flex-wrap gap-2">
        <HomeLauncherLink href="/pagos" label="Centro de pagos" primary />
        <HomeLauncherLink href="/compromisos" label="Compromisos" />
        <HomeLauncherLink href="/obras" label="Obras" />
        <HomeLauncherLink href="/expedientes" label="Expedientes" />
      </div>

      {tab === "mapa" ? (
        <ProcessAHomeMap role="pagos" compact={false} />
      ) : tab === "compromisos" ? (
        <section className="dash-panel p-5">
          <h2 className="dash-section-title">Compromisos recurrentes</h2>
          <p className="dash-body mt-2 max-w-2xl text-zinc-600">
            Proceso aparte de Carolina: registro de servicios y compromisos que se pagan de forma
            recurrente. No forma parte del Proceso A de OC.
          </p>
          <div className="mt-4">
            <HomeLauncherLink href="/compromisos" label="Abrir compromisos" primary />
          </div>
        </section>
      ) : (
        <section className="dash-panel">
          <DashPanelHeader
            title={
              tab === "pagar"
                ? "Órdenes de compra pendientes"
                : tab === "autorizar"
                  ? "Autorizar OC"
                  : "Pagos parciales"
            }
            meta={
              tab === "pagar"
                ? queueTotal === 0
                  ? "Cola vacía"
                  : `${queueTotal} en cola`
                : tab === "autorizar"
                  ? authorizeQueue.length === 0
                    ? "Nada por autorizar"
                    : `${authorizeQueue.length} OC`
                  : `${partials.length} activas`
            }
            action={
              <Link href="/pagos" className="text-sm font-semibold text-orange-700 hover:text-orange-900">
                Ver pagos →
              </Link>
            }
          />

          {tab === "autorizar" ? (
            authorizeQueue.length === 0 ? (
              <p className="dash-body px-4 py-12 text-center text-zinc-500 sm:px-5">
                No hay OC pendientes de autorización. Tú o Dirección pueden dar el sí.
              </p>
            ) : (
              <ul className="divide-y divide-zinc-100">
                {authorizeQueue.map((o) => renderOrderRow(o, "revisar"))}
              </ul>
            )
          ) : tab === "parciales" ? (
            partials.length === 0 ? (
              <p className="dash-body px-4 py-12 text-center text-zinc-500 sm:px-5">
                No hay parcialidades activas.
              </p>
            ) : (
              <ul className="divide-y divide-zinc-100">
                {partials.slice(0, QUEUE_LIMIT).map((o) => renderOrderRow(o, "pagar"))}
              </ul>
            )
          ) : payQueue.length === 0 ? (
            <p className="dash-body px-4 py-12 text-center text-zinc-500 sm:px-5">
              Nada en cola. Cuando una OC esté autorizada aparece aquí para pagar.
            </p>
          ) : (
            <ul className="divide-y divide-zinc-100">
              {payQueue.map((o) => renderOrderRow(o, "pagar"))}
            </ul>
          )}
        </section>
      )}

      {tab !== "mapa" ? <ProcessAHomeMap role="pagos" /> : null}

      <RegistrarPagoModal
        open={pagoModalOpen}
        onClose={() => setPagoModalOpen(false)}
        orders={orders}
        obras={obras}
        initialOrderId={pagoModalOrderId}
        onCompleted={onOrdersMutated}
      />
    </div>
  );
}
