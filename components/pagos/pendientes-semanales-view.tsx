"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { LoadingScreen } from "@/components/ui/loading-screen";
import { PageBreadcrumb } from "@/components/ui/page-breadcrumb";
import { useFeedback } from "@/components/ui/feedback-provider";
import { RegistrarPagoModal } from "@/components/pagos/registrar-pago-modal";
import {
  formatMoney,
  formatDateShort,
  formatAmountInput,
  parseAmountInput,
  sanitizeAmountInput,
} from "@/lib/format";
import type { ObraDto, PurchaseOrderDto } from "@/lib/domain/types";
import type { FridayReviewItem, FridayReviewPayload } from "@/lib/pagos/friday-review-service";
import {
  DELIVERY_STATUS_LABEL,
  DELIVERY_STATUSES,
  FRIDAY_STATUS_LABEL,
  shiftWeek,
  type DeliveryStatus,
} from "@/lib/pagos/friday-review";

type View = "home" | "list" | "detail";

/** YYYY-MM-DD → etiqueta sin corrimiento de zona. */
function fmtDay(ymd: string) {
  return formatDateShort(`${ymd}T12:00:00.000Z`);
}

function StatusBadge({ status }: { status: FridayReviewItem["listStatus"] }) {
  const tone =
    status === "vencida"
      ? "bg-red-50 text-red-700 ring-red-200"
      : status === "programada"
        ? "bg-sky-50 text-sky-800 ring-sky-200"
        : "bg-amber-50 text-amber-800 ring-amber-200";
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${tone}`}>
      {FRIDAY_STATUS_LABEL[status]}
    </span>
  );
}

function KpiCard({
  label,
  amount,
  count,
  tone,
}: {
  label: string;
  amount: number;
  count?: number;
  tone: "red" | "amber" | "sky" | "emerald";
}) {
  const border =
    tone === "red"
      ? "border-l-red-400"
      : tone === "amber"
        ? "border-l-amber-400"
        : tone === "sky"
          ? "border-l-sky-400"
          : "border-l-emerald-400";
  const amountCls =
    tone === "red"
      ? "text-red-700"
      : tone === "amber"
        ? "text-amber-800"
        : tone === "sky"
          ? "text-sky-800"
          : "text-emerald-700";
  return (
    <div className={`rounded-2xl border border-zinc-100 border-l-4 bg-white p-4 shadow-sm ${border}`}>
      <p className="text-xs font-medium text-zinc-500">{label}</p>
      <p className={`mt-1 text-lg font-bold tabular-nums ${amountCls}`}>{formatMoney(amount, "MXN")}</p>
      {count != null && (
        <p className="mt-0.5 text-[11px] text-zinc-500">
          {count} {count === 1 ? "factura" : "facturas"}
        </p>
      )}
    </div>
  );
}

function DocLink({ fileId, label }: { fileId: string | null; label: string }) {
  if (!fileId) {
    return <span className="text-xs text-zinc-400">Sin PDF</span>;
  }
  return (
    <a
      href={`/api/files/${fileId}`}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-1 text-xs font-semibold text-orange-700 hover:underline"
    >
      {label}
      <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
        />
      </svg>
    </a>
  );
}

export function PendientesSemanalesView({
  onRegisterRefresh,
}: {
  onRegisterRefresh?: (fn: () => void) => void;
}) {
  const { showError, showSuccess } = useFeedback();
  const [data, setData] = useState<FridayReviewPayload | null>(null);
  const [weekMonday, setWeekMonday] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<View>("home");
  const [selected, setSelected] = useState<FridayReviewItem | null>(null);
  const [registerOpen, setRegisterOpen] = useState(false);
  const [orders, setOrders] = useState<PurchaseOrderDto[]>([]);
  const [obras, setObras] = useState<ObraDto[]>([]);
  const [busy, setBusy] = useState(false);

  const [scheduleAmount, setScheduleAmount] = useState("");
  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduleRef, setScheduleRef] = useState("");
  const [deliveryStatus, setDeliveryStatus] = useState<DeliveryStatus>("pedido");

  const load = useCallback(
    async (week?: string | null) => {
      setLoading(true);
      try {
        const q = week ? `?week=${encodeURIComponent(week)}` : "";
        const [revRes, ordersRes, obrasRes] = await Promise.all([
          fetch(`/api/pagos/friday-review${q}`, { credentials: "include" }),
          fetch("/api/orders", { credentials: "include" }),
          fetch("/api/obras", { credentials: "include" }),
        ]);
        if (!revRes.ok) {
          const err = (await revRes.json().catch(() => ({}))) as { error?: string };
          throw new Error(err.error ?? "No se pudo cargar la revisión de pagos.");
        }
        const payload = (await revRes.json()) as FridayReviewPayload;
        setData(payload);
        setWeekMonday(payload.weekMonday);
        if (ordersRes.ok) {
          const od = (await ordersRes.json()) as { orders?: PurchaseOrderDto[] };
          setOrders(od.orders ?? []);
        }
        if (obrasRes.ok) {
          const ob = (await obrasRes.json()) as { obras?: ObraDto[] };
          setObras(ob.obras ?? []);
        }
      } catch (e) {
        showError(e instanceof Error ? e.message : "Error al cargar pagos.");
      } finally {
        setLoading(false);
      }
    },
    [showError]
  );

  useEffect(() => {
    void load(weekMonday);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    onRegisterRefresh?.(() => void load(weekMonday));
  }, [onRegisterRefresh, load, weekMonday]);

  const openDetail = (item: FridayReviewItem) => {
    setSelected(item);
    setScheduleAmount(formatAmountInput(item.activeSchedule?.amount ?? item.balance));
    setScheduleDate(
      item.activeSchedule ? item.activeSchedule.plannedDate.slice(0, 10) : (data?.weekFriday ?? "")
    );
    setScheduleRef(item.activeSchedule?.reference ?? "");
    setDeliveryStatus(item.deliveryStatus);
    setView("detail");
  };

  const changeWeek = (delta: number) => {
    if (!weekMonday) return;
    const next = shiftWeek(weekMonday, delta);
    setWeekMonday(next);
    setView("list");
    void load(next);
  };

  const saveDelivery = async (orderId: string, status: DeliveryStatus) => {
    setDeliveryStatus(status);
    try {
      const res = await fetch(`/api/orders/${orderId}/delivery-status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ deliveryStatus: status }),
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(err.error ?? "No se pudo actualizar la entrega.");
      }
      showSuccess("Estado de entrega actualizado.");
      await load(weekMonday);
    } catch (e) {
      showError(e instanceof Error ? e.message : "Error al guardar entrega.");
    }
  };

  const schedulePayment = async () => {
    if (!selected) return;
    const amount = parseAmountInput(scheduleAmount);
    if (!amount || amount <= 0) {
      showError("Indica un monto válido.");
      return;
    }
    if (!scheduleDate) {
      showError("Indica la fecha de pago.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/pagos/scheduled-payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          orderId: selected.order.id,
          amount,
          plannedDate: scheduleDate,
          reference: scheduleRef,
        }),
      });
      const body = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(body.error ?? "No se pudo programar.");
      showSuccess("Pago programado. Aún no cuenta como pagado.");
      await load(weekMonday);
      setView("list");
      setSelected(null);
    } catch (e) {
      showError(e instanceof Error ? e.message : "Error al programar.");
    } finally {
      setBusy(false);
    }
  };

  const deliverySteps = useMemo(() => DELIVERY_STATUSES, []);

  if (loading && !data) {
    return <LoadingScreen message="Cargando pendientes semanales" />;
  }
  if (!data) {
    return <p className="p-6 text-sm text-zinc-600">No hay datos de pagos.</p>;
  }

  const crumb = (
    <PageBreadcrumb
      items={[
        { label: "Pagos", href: "/pagos" },
        { label: "Pendientes semanales" },
      ]}
    />
  );

  if (view === "detail" && selected) {
    const o = selected.order;
    return (
      <div className="space-y-5">
        {crumb}
        <button
          type="button"
          className="text-sm font-medium text-zinc-600 hover:text-zinc-900"
          onClick={() => {
            setView("list");
            setSelected(null);
          }}
        >
          ← Volver a la lista
        </button>

        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Revisar y programar</p>
          <h1 className="dash-page-title mt-1">{selected.supplierName}</h1>
          <p className="dash-body text-zinc-600">
            {selected.obraName} · OC {selected.ocFolio}
          </p>
        </div>

        <div className="grid gap-3 rounded-2xl border border-zinc-100 bg-white p-4 sm:grid-cols-4">
          <div>
            <p className="text-[11px] text-zinc-500">Fecha factura</p>
            <p className="text-sm font-semibold">
              {selected.invoiceDateYmd ? fmtDay(selected.invoiceDateYmd) : "—"}
            </p>
          </div>
          <div>
            <p className="text-[11px] text-zinc-500">Crédito</p>
            <p className="text-sm font-semibold">{selected.termsDays} días</p>
          </div>
          <div>
            <p className="text-[11px] text-zinc-500">Vencimiento</p>
            <p className="text-sm font-semibold text-red-700">{fmtDay(selected.dueDateYmd)}</p>
          </div>
          <div>
            <p className="text-[11px] text-zinc-500">Saldo pendiente</p>
            <p className="text-sm font-bold text-orange-700">
              {formatMoney(selected.balance, selected.currency)}
            </p>
          </div>
        </div>

        {!selected.hasInvoice && (
          <p className="rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-900 ring-1 ring-amber-100">
            Factura pendiente de validación: aparece por su fecha límite de pago, pero aún no hay PDF de
            factura.
          </p>
        )}

        <section className="dash-panel p-4">
          <h2 className="dash-section-title">Documentos</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-zinc-100 bg-zinc-50/80 p-3">
              <p className="text-xs font-semibold text-zinc-700">Orden de compra</p>
              <p className="mt-1 text-[11px] text-zinc-500">PDF firmado por Ingeniería (si existe)</p>
              <div className="mt-2 flex gap-3">
                <DocLink fileId={selected.ocFileId} label="Ver" />
                {selected.ocFileId && (
                  <a
                    className="text-xs font-semibold text-zinc-700 hover:underline"
                    href={`/api/files/${selected.ocFileId}?download=1`}
                  >
                    Descargar
                  </a>
                )}
              </div>
            </div>
            <div className="rounded-xl border border-zinc-100 bg-zinc-50/80 p-3">
              <p className="text-xs font-semibold text-zinc-700">Factura del proveedor</p>
              <div className="mt-2 flex gap-3">
                <DocLink fileId={selected.invoiceFileId} label="Ver" />
                {selected.invoiceFileId && (
                  <a
                    className="text-xs font-semibold text-zinc-700 hover:underline"
                    href={`/api/files/${selected.invoiceFileId}?download=1`}
                  >
                    Descargar
                  </a>
                )}
              </div>
            </div>
          </div>
        </section>

        <section className="dash-panel p-4">
          <h2 className="dash-section-title">Estado de entrega</h2>
          <p className="mt-1 text-xs text-zinc-500">
            Independiente de la factura: puedes tener factura con material pendiente.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {deliverySteps.map((step, idx) => {
              const activeIdx = deliverySteps.indexOf(deliveryStatus);
              const active = idx <= activeIdx;
              const current = step === deliveryStatus;
              return (
                <button
                  key={step}
                  type="button"
                  disabled={busy}
                  onClick={() => void saveDelivery(o.id, step)}
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold ring-1 ring-inset ${
                    current
                      ? "bg-orange-500 text-white ring-orange-500"
                      : active
                        ? "bg-orange-50 text-orange-800 ring-orange-200"
                        : "bg-zinc-50 text-zinc-500 ring-zinc-200"
                  }`}
                >
                  {idx + 1}. {DELIVERY_STATUS_LABEL[step]}
                </button>
              );
            })}
          </div>
          {deliveryStatus !== "surtido_completo" && (
            <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-900 ring-1 ring-amber-100">
              El material aún no está surtido por completo. Igual puedes programar el pago.
            </p>
          )}
        </section>

        <section className="dash-panel p-4">
          <h2 className="dash-section-title">Pagos y saldo</h2>
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-zinc-500">Importe factura / OC</dt>
              <dd className="font-medium tabular-nums">{formatMoney(o.totalAmount, o.currency)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-zinc-500">Pagos aplicados</dt>
              <dd className="font-medium tabular-nums">
                {formatMoney(o.amountPaidSoFar, selected.currency)}
              </dd>
            </div>
            <div className="flex justify-between gap-4 border-t border-zinc-100 pt-2">
              <dt className="font-semibold text-zinc-800">Saldo pendiente</dt>
              <dd className="font-bold tabular-nums text-orange-700">
                {formatMoney(selected.balance, selected.currency)}
              </dd>
            </div>
          </dl>
          {o.paymentRecords.length > 0 && (
            <div className="mt-4">
              <p className="text-xs font-semibold text-zinc-600">Historial de abonos</p>
              <ul className="mt-2 space-y-1.5">
                {o.paymentRecords.map((p) => (
                  <li key={p.id} className="flex justify-between text-xs text-zinc-600">
                    <span>
                      {formatDateShort(p.createdAt)} · {p.recordedByName}
                      {p.reference ? ` · ${p.reference}` : ""}
                    </span>
                    <span className="tabular-nums font-medium">
                      {formatMoney(p.amount, selected.currency)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-orange-100 bg-orange-50/40 p-4">
          <h2 className="text-sm font-bold text-zinc-900">Programar pago</h2>
          <p className="mt-1 text-xs text-zinc-600">
            No se marca como pagado hasta que Administración registre el pago con comprobante PDF.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="text-xs font-medium text-zinc-700">Monto a pagar</span>
              <input
                className="mt-1.5 block w-full min-h-11 rounded-xl border border-zinc-200 bg-white px-3 text-sm"
                value={scheduleAmount}
                onChange={(e) => setScheduleAmount(sanitizeAmountInput(e.target.value))}
              />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-zinc-700">Fecha de pago</span>
              <input
                type="date"
                className="mt-1.5 block w-full min-h-11 rounded-xl border border-zinc-200 bg-white px-3 text-sm"
                value={scheduleDate}
                onChange={(e) => setScheduleDate(e.target.value)}
              />
            </label>
            <label className="block sm:col-span-2">
              <span className="text-xs font-medium text-zinc-700">Referencia (opcional)</span>
              <input
                className="mt-1.5 block w-full min-h-11 rounded-xl border border-zinc-200 bg-white px-3 text-sm"
                value={scheduleRef}
                onChange={(e) => setScheduleRef(e.target.value)}
                placeholder="Observación o referencia bancaria"
              />
            </label>
          </div>
          <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              className="btn-secondary"
              disabled={busy}
              onClick={() => {
                setView("list");
                setSelected(null);
              }}
            >
              Cancelar
            </button>
            <button
              type="button"
              className="btn-primary"
              disabled={busy}
              onClick={() => void schedulePayment()}
            >
              {busy ? "Guardando…" : "Programar pago"}
            </button>
          </div>
        </section>

        <p className="text-center text-xs text-zinc-500">
          <Link href={`/ordenes/${o.id}`} className="font-semibold text-orange-700 hover:underline">
            Abrir ficha completa de la OC
          </Link>
        </p>
      </div>
    );
  }

  if (view === "list") {
    return (
      <div className="space-y-5">
        {crumb}
        <button
          type="button"
          className="text-sm font-medium text-zinc-600 hover:text-zinc-900"
          onClick={() => setView("home")}
        >
          ← Volver al resumen
        </button>

        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="dash-page-title">Pagos del viernes</h1>
            <p className="dash-body mt-1 text-zinc-600">
              Facturas vencidas y las que vencen en la semana seleccionada
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-2 py-1.5">
            <button
              type="button"
              className="rounded-lg px-2 py-1 text-sm hover:bg-zinc-50"
              onClick={() => changeWeek(-1)}
              aria-label="Semana anterior"
            >
              ‹
            </button>
            <span className="min-w-[9rem] text-center text-sm font-semibold text-zinc-800">
              {data.weekLabel}
            </span>
            <button
              type="button"
              className="rounded-lg px-2 py-1 text-sm hover:bg-zinc-50"
              onClick={() => changeWeek(1)}
              aria-label="Semana siguiente"
            >
              ›
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-orange-100 bg-orange-50/50 px-4 py-3 text-sm">
          <span className="font-semibold text-zinc-900">
            {formatMoney(data.totals.pendingAmount, "MXN")}
          </span>
          <span className="text-zinc-600">
            {" "}
            · {data.totals.invoiceCount} facturas · {data.totals.supplierCount} proveedores
          </span>
        </div>

        {loading ? (
          <p className="text-sm text-zinc-500">Actualizando…</p>
        ) : data.items.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-zinc-200 bg-white p-8 text-center text-sm text-zinc-500">
            No hay facturas con saldo pendiente para esta semana.
          </p>
        ) : (
          <ul className="space-y-3">
            {data.items.map((item) => (
              <li key={item.order.id} className="rounded-2xl border border-zinc-100 bg-white p-4 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-bold text-zinc-900">{item.supplierName}</p>
                    <p className="text-xs text-zinc-500">{item.obraName}</p>
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-600">
                      <span>
                        OC {item.ocFolio} · <DocLink fileId={item.ocFileId} label="Ver OC" />
                      </span>
                      <span>
                        Factura · <DocLink fileId={item.invoiceFileId} label="Ver factura" />
                      </span>
                      <span>
                        Factura:{" "}
                        {item.invoiceDateYmd ? fmtDay(item.invoiceDateYmd) : "Pendiente"}
                      </span>
                      <span>Vence: {fmtDay(item.dueDateYmd)}</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <StatusBadge status={item.listStatus} />
                    {!item.hasInvoice && (
                      <span className="text-[10px] font-semibold text-amber-700">Sin factura</span>
                    )}
                    <p className="text-sm font-bold tabular-nums text-zinc-900">
                      {formatMoney(item.balance, item.currency)}
                    </p>
                    <button type="button" className="btn-primary text-sm" onClick={() => openDetail(item)}>
                      Revisar y programar
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {crumb}
      <div>
        <h1 className="dash-page-title">Pendientes semanales</h1>
        <p className="dash-body mt-1 text-zinc-600">
          Revisa facturas de la semana y programa los pagos del viernes
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Facturas vencidas"
          amount={data.totals.overdueAmount}
          count={data.totals.overdueCount}
          tone="red"
        />
        <KpiCard
          label="Vencen esta semana"
          amount={data.totals.dueThisWeekAmount}
          count={data.totals.dueThisWeekCount}
          tone="amber"
        />
        <KpiCard
          label="Programado para pago"
          amount={data.totals.scheduledAmount}
          count={data.totals.scheduledCount}
          tone="sky"
        />
        <KpiCard
          label="Pagado este mes"
          amount={data.totals.paidThisMonthAmount}
          count={data.totals.paidThisMonthCount}
          tone="emerald"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-orange-100 bg-gradient-to-br from-orange-50 to-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-orange-700">Pagos del viernes</p>
          <p className="mt-2 text-sm text-zinc-600">Semana · {data.weekLabel}</p>
          <p className="mt-3 text-2xl font-bold tabular-nums text-zinc-900">
            {formatMoney(data.totals.pendingAmount, "MXN")}
          </p>
          <p className="mt-1 text-xs text-zinc-500">
            {data.totals.invoiceCount} facturas · {data.totals.supplierCount} proveedores
          </p>
          <button type="button" className="btn-primary mt-5 w-full sm:w-auto" onClick={() => setView("list")}>
            Ver pagos del viernes
          </button>
        </div>

        <div className="dash-panel p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Registro de pagos</p>
          <p className="mt-2 text-sm text-zinc-600">
            Registra un pago ya ejecutado y adjunta el comprobante PDF. Eso sí reduce el saldo.
          </p>
          <div className="mt-5 space-y-2">
            <button
              type="button"
              className="btn-secondary w-full justify-start"
              onClick={() => setRegisterOpen(true)}
            >
              Registrar un nuevo pago
            </button>
            <Link href="/pagos" className="btn-secondary flex w-full justify-start">
              Volver a cola de pagos
            </Link>
          </div>
        </div>
      </div>

      <RegistrarPagoModal
        open={registerOpen}
        onClose={() => setRegisterOpen(false)}
        orders={orders}
        obras={obras}
        onCompleted={() => {
          setRegisterOpen(false);
          void load(weekMonday);
        }}
      />
    </div>
  );
}
