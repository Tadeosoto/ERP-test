"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  CalmKpiTile,
  DashPanelHeader,
  HomeHeroMetric,
  HomePulseLine,
} from "@/components/dashboard/calm-kpi-tile";
import { OcLink } from "@/components/ui/oc-link";
import { RegistrarPagoModal } from "@/components/pagos/registrar-pago-modal";
import {
  filterPagosQueueOrders,
  PAGOS_PAYMENT_STATUS_LABEL,
  PAGOS_PAYMENT_STATUS_TONE,
  pagosHomeKpiCounts,
  pagosPaymentDisplayStatus,
} from "@/lib/dashboard/pagos-dashboard";
import { isActivePartial } from "@/lib/dashboard/direccion-dashboard";
import { payableOrders } from "@/lib/pagos/registrar-pago-form";
import type {
  InvoiceFirstCommitmentDto,
  ObraDto,
  PurchaseOrderDto,
  SupplierDto,
} from "@/lib/domain/types";
import { formatMoney } from "@/lib/format";

const QUEUE_LIMIT = 8;

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
  const [pagoModalOpen, setPagoModalOpen] = useState(false);
  const [pagoModalOrderId, setPagoModalOrderId] = useState<string | null>(null);

  const counts = useMemo(
    () => pagosHomeKpiCounts({ orders, suppliers, obras }),
    [orders, suppliers, obras]
  );

  const partialsCount = useMemo(() => orders.filter(isActivePartial).length, [orders]);

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

  const queue = useMemo(
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
    if (counts.pagosPorRealizar === 0 && facturasEspera === 0) {
      return "Nada urgente hoy. Usa el menú para Pagos, Facturas u Órdenes.";
    }
    const bits: string[] = [];
    if (counts.pagosPorRealizar > 0) {
      bits.push(
        `${counts.pagosPorRealizar} pago${counts.pagosPorRealizar === 1 ? "" : "s"} pendiente${counts.pagosPorRealizar === 1 ? "" : "s"}`
      );
    }
    if (facturasEspera > 0) {
      bits.push(`${facturasEspera} factura${facturasEspera === 1 ? "" : "s"} sin OC`);
    }
    return bits.join(" · ");
  }, [counts.pagosPorRealizar, facturasEspera]);

  function openRegistrarPago(orderId?: string | null) {
    setPagoModalOrderId(orderId ?? payable[0]?.id ?? null);
    setPagoModalOpen(true);
  }

  return (
    <div className="home-dashboard flex w-full flex-col gap-4 pb-6 lg:gap-5">
      {/* Saludo compacto: no compite con el dinero */}
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="dash-caption">Administración</p>
          <h1 className="mt-0.5 text-xl font-bold tracking-tight text-zinc-900 sm:text-2xl">
            Hola, {userName.split(" ")[0]}
          </h1>
          <HomePulseLine>{pulse}</HomePulseLine>
        </div>
        <button
          type="button"
          className="btn-primary shrink-0"
          disabled={payable.length === 0}
          onClick={() => openRegistrarPago()}
        >
          Registrar pago
        </button>
      </header>

      {/* Fila Mercury: saldo (mitad) + 3 KPIs */}
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
            label="Por realizar"
            value={counts.pagosPorRealizar}
            sub="Listas para pago"
            href="/pagos"
            tint="orange"
          />
          <CalmKpiTile
            label="Parciales"
            value={partialsCount + counts.comprobantesPendientes}
            sub={`${partialsCount} parcial · ${counts.comprobantesPendientes} sin comprobante`}
            href="/pagos"
            tint="amber"
          />
          <CalmKpiTile
            label="Facturas espera"
            value={facturasEspera}
            sub="Proceso C"
            href="/facturas"
            tint="teal"
          />
        </div>
      </div>

      {/* Trabajo: lo más importante después del dinero */}
      <section className="dash-panel">
        <DashPanelHeader
          title="Para hoy"
          meta={
            queueTotal === 0
              ? "Cola vacía"
              : `${queueTotal} en cola · muestra ${Math.min(QUEUE_LIMIT, queueTotal)}`
          }
          action={
            <div className="flex flex-wrap items-center gap-3">
              <Link href="/facturas" className="dash-caption font-semibold text-zinc-600 hover:text-zinc-900">
                Facturas
              </Link>
              <Link href="/expedientes" className="dash-caption font-semibold text-zinc-600 hover:text-zinc-900">
                Expedientes
              </Link>
              <Link href="/pagos" className="text-sm font-semibold text-orange-700 hover:text-orange-900">
                Ver pagos →
              </Link>
            </div>
          }
        />

        {queue.length === 0 ? (
          <p className="dash-body px-4 py-12 text-center text-zinc-500 sm:px-5">
            Nada en cola. Cuando haya pagos pendientes aparecen aquí.
          </p>
        ) : (
          <ul className="divide-y divide-zinc-100">
            {queue.map((order) => {
              const status = pagosPaymentDisplayStatus(order);
              const amount =
                order.status === "awaitingPayment" ? order.amountRemaining : order.totalAmount;
              return (
                <li
                  key={order.id}
                  className="flex flex-wrap items-center gap-3 px-4 py-4 sm:px-5"
                >
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
                  <button
                    type="button"
                    onClick={() => openRegistrarPago(order.id)}
                    className="btn-primary !min-h-9 shrink-0 !px-3 !py-1.5 !text-xs"
                  >
                    Pagar
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

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
