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
  isPagosActiveOrder,
  PAGOS_PAYMENT_STATUS_LABEL,
  PAGOS_PAYMENT_STATUS_TONE,
  pagosHomeKpiCounts,
  pagosPaymentDisplayStatus,
} from "@/lib/dashboard/pagos-dashboard";
import { isActivePartial, isPendingAuthorization } from "@/lib/dashboard/direccion-dashboard";
import { canUploadInvoice } from "@/lib/domain/transitions";
import { formatFxBanner, orderTracksPaymentsInMxn, paymentProgressPct } from "@/lib/domain/order-fx";
import { payableOrders } from "@/lib/pagos/registrar-pago-form";
import type {
  InvoiceFirstCommitmentDto,
  ObraDto,
  PurchaseOrderDto,
  SupplierDto,
} from "@/lib/domain/types";
import { formatMoney } from "@/lib/format";

const AUTH_LIMIT = 12;

type PagosHomeTab = "activas" | "autorizar" | "parciales" | "compromisos" | "mapa";

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
  const [tab, setTab] = useState<PagosHomeTab>("activas");
  const [pagoModalOpen, setPagoModalOpen] = useState(false);
  const [pagoModalOrderId, setPagoModalOrderId] = useState<string | null>(null);

  const counts = useMemo(
    () => pagosHomeKpiCounts({ orders, suppliers, obras }),
    [orders, suppliers, obras]
  );

  const partials = useMemo(() => orders.filter(isActivePartial), [orders]);
  const authorizeQueue = useMemo(
    () => orders.filter(isPendingAuthorization).slice(0, AUTH_LIMIT),
    [orders]
  );

  const facturasEspera = useMemo(
    () =>
      invoiceCommitments.filter(
        (c) => c.status === "awaiting_oc" || c.status === "oc_requested"
      ).length,
    [invoiceCommitments]
  );

  const activeOrders = useMemo(
    () =>
      orders
        .filter(isPagosActiveOrder)
        .sort((a, b) => {
          const rank = (o: PurchaseOrderDto) => {
            if (o.status === "awaitingPayment") return 0;
            if (o.status === "paid" || o.status === "awaitingInvoice") return 1;
            if (o.status === "awaitingPatyDeadline") return 2;
            return 3;
          };
          const ra = rank(a);
          const rb = rank(b);
          if (ra !== rb) return ra - rb;
          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
        }),
    [orders]
  );

  const saldoPendiente = useMemo(
    () =>
      orders
        .filter((o) => o.status === "awaitingPayment")
        .reduce((s, o) => s + o.amountRemaining, 0),
    [orders]
  );

  const payable = useMemo(() => payableOrders(orders), [orders]);

  const pulse = useMemo(() => {
    if (counts.pagosPorRealizar === 0 && authorizeQueue.length === 0 && activeOrders.length === 0) {
      return "Nada urgente. Autoriza OC, registra pagos o revisa compromisos.";
    }
    const bits: string[] = [];
    if (authorizeQueue.length > 0) {
      bits.push(`${authorizeQueue.length} por autorizar (tú o Dirección)`);
    }
    if (counts.pagosPorRealizar > 0) {
      bits.push(
        `${counts.pagosPorRealizar} lista${counts.pagosPorRealizar === 1 ? "" : "s"} para pagar`
      );
    }
    return bits.join(" · ") || `${activeOrders.length} órdenes activas`;
  }, [counts.pagosPorRealizar, authorizeQueue.length, activeOrders.length]);

  const tabs = useMemo(
    () => [
      { id: "activas", label: "Órdenes activas", count: activeOrders.length },
      { id: "autorizar", label: "Autorizar", count: authorizeQueue.length },
      { id: "parciales", label: "Parciales", count: partials.length },
      { id: "compromisos", label: "Compromisos" },
      { id: "mapa", label: "Mapa" },
    ],
    [activeOrders.length, authorizeQueue.length, partials.length]
  );

  function openRegistrarPago(orderId?: string | null) {
    setPagoModalOrderId(orderId ?? payable[0]?.id ?? null);
    setPagoModalOpen(true);
  }

  function renderActiveRow(order: PurchaseOrderDto) {
    const status = pagosPaymentDisplayStatus(order);
    const canPay = order.status === "awaitingPayment" && Boolean(order.paymentType);
    const canInvoice = canUploadInvoice(order.status, "pagos");
    const pct = paymentProgressPct(order);
    const payCurrency = orderTracksPaymentsInMxn(order) ? "MXN" : order.currency;
    const amount =
      order.status === "awaitingPayment" || order.amountRemaining > 0
        ? order.amountRemaining
        : orderTracksPaymentsInMxn(order)
          ? (order.totalAmountMxn ?? order.totalAmount)
          : order.totalAmount;
    const fx = formatFxBanner(order);

    return (
      <li key={order.id} className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:flex-wrap sm:items-center sm:px-5">
        <div className="min-w-0 flex-1">
          <OcLink order={order} showPdfIcon className="text-sm" />
          <p className="dash-caption mt-0.5 truncate">
            {order.obraName} · {order.supplierName}
          </p>
          {fx ? <p className="mt-1 text-[11px] text-sky-800">{fx}</p> : null}
          {(canPay || order.amountPaidSoFar > 0) && (
            <div className="mt-2 max-w-xs">
              <div className="flex items-center justify-between text-[11px] text-zinc-500">
                <span>Pagado en pesos</span>
                <span className="font-semibold tabular-nums text-zinc-700">{pct}%</span>
              </div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-zinc-100">
                <div className="h-full rounded-full bg-orange-500" style={{ width: `${pct}%` }} />
              </div>
            </div>
          )}
        </div>
        <span
          className={`inline-flex shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${PAGOS_PAYMENT_STATUS_TONE[status]}`}
        >
          {order.status === "awaitingInvoice"
            ? "Esperando factura"
            : order.status === "paid"
              ? "Saldada · factura"
              : PAGOS_PAYMENT_STATUS_LABEL[status]}
        </span>
        <span className="shrink-0 text-base font-bold tabular-nums text-zinc-900">
          {formatMoney(amount, payCurrency)}
          {order.currency === "USD" && orderTracksPaymentsInMxn(order) ? (
            <span className="ml-1 text-xs font-medium text-zinc-500">
              ({formatMoney(order.totalAmount, "USD")})
            </span>
          ) : null}
        </span>
        <div className="flex shrink-0 flex-wrap gap-2">
          {canPay ? (
            <button
              type="button"
              onClick={() => openRegistrarPago(order.id)}
              className="btn-primary !min-h-9 !px-3 !py-1.5 !text-xs"
            >
              Abonar / Pagar
            </button>
          ) : null}
          {canInvoice ? (
            <Link
              href={`/ordenes/${order.id}#tarea`}
              className="btn-secondary !min-h-9 !px-3 !py-1.5 !text-xs"
            >
              Subir factura
            </Link>
          ) : null}
          {!canPay && !canInvoice ? (
            <Link
              href={`/ordenes/${order.id}`}
              className="btn-secondary !min-h-9 !px-3 !py-1.5 !text-xs"
            >
              Abrir
            </Link>
          ) : null}
        </div>
      </li>
    );
  }

  function renderSimpleRow(order: PurchaseOrderDto, action: "pagar" | "revisar") {
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
          {formatMoney(amount, orderTracksPaymentsInMxn(order) ? "MXN" : order.currency)}
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
            label="Saldo por pagar (MXN)"
            value={formatMoney(saldoPendiente, "MXN")}
            hint={
              counts.pagosPorRealizar > 0
                ? `${counts.pagosPorRealizar} OC en cola`
                : "Sin montos pendientes"
            }
          />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 lg:col-span-6">
          <CalmKpiTile
            label="Órdenes activas"
            value={activeOrders.length}
            sub="Para abonar o factura"
            tint="orange"
            selected={tab === "activas"}
            onClick={() => setTab("activas")}
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
        <HomeLauncherLink href="/ordenes" label="Órdenes" />
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
              tab === "activas"
                ? "Órdenes de compra activas"
                : tab === "autorizar"
                  ? "Autorizar OC"
                  : "Pagos parciales"
            }
            meta={
              tab === "activas"
                ? activeOrders.length === 0
                  ? "Sin órdenes activas"
                  : `${activeOrders.length} activas · abona o sube factura desde aquí`
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
                {authorizeQueue.map((o) => renderSimpleRow(o, "revisar"))}
              </ul>
            )
          ) : tab === "parciales" ? (
            partials.length === 0 ? (
              <p className="dash-body px-4 py-12 text-center text-zinc-500 sm:px-5">
                No hay parcialidades activas.
              </p>
            ) : (
              <ul className="divide-y divide-zinc-100">
                {partials.map((o) => renderSimpleRow(o, "pagar"))}
              </ul>
            )
          ) : activeOrders.length === 0 ? (
            <p className="dash-body px-4 py-12 text-center text-zinc-500 sm:px-5">
              No hay órdenes activas. Cuando una OC esté autorizada aparece aquí para abonar.
            </p>
          ) : (
            <ul className="divide-y divide-zinc-100">{activeOrders.map(renderActiveRow)}</ul>
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
