"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useFeedback } from "@/components/ui/feedback-provider";
import {
  buildPaymentNotes,
  buildPaymentReference,
  currencyLabel,
  defaultAmount,
  defaultConcept,
  formatAmountInput,
  formatDisplayDate,
  obraForOrder,
  parseAmountInput,
  payableOrders,
  PAYMENT_METHODS,
  remainingAfterPayment,
  todayMxInput,
  type RegistrarPagoForm,
} from "@/lib/pagos/registrar-pago-form";
import type { ObraDto, PurchaseOrderDto } from "@/lib/domain/types";
import { formatMoney, sanitizeAmountInput } from "@/lib/format";
import { actionSuccessMessage } from "@/lib/process-feedback";

const MAX_RECEIPT_BYTES = 20 * 1024 * 1024;
const inputCls =
  "block w-full min-h-11 rounded-xl border border-zinc-200 bg-white px-3 text-sm shadow-sm focus:border-orange-300 focus:outline-none focus:ring-1 focus:ring-orange-200";
const readOnlyCls =
  "block w-full min-h-11 rounded-xl border border-zinc-100 bg-zinc-50 px-3 text-sm text-zinc-700";

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block min-w-0">
      <span className="text-xs font-medium text-zinc-700">
        {label}
        {required && <span className="text-red-500"> *</span>}
      </span>
      <div className="mt-1.5">{children}</div>
    </label>
  );
}

function Stepper({ step }: { step: 1 | 2 | 3 }) {
  const steps = [
    { n: 1 as const, label: "Detalle del pago" },
    { n: 2 as const, label: "Subir comprobante" },
    { n: 3 as const, label: "Confirmar" },
  ];

  return (
    <div className="flex items-center gap-0 px-1">
      {steps.map((s, i) => {
        const done = step > s.n;
        const active = step === s.n;
        return (
          <div key={s.n} className={`flex min-w-0 flex-1 items-center ${i < steps.length - 1 ? "" : ""}`}>
            <div className="flex min-w-0 flex-col items-center gap-1 sm:flex-row sm:gap-2">
              <span
                className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                  done
                    ? "bg-emerald-500 text-white"
                    : active
                      ? "bg-orange-500 text-white"
                      : "bg-zinc-100 text-zinc-400"
                }`}
              >
                {done ? (
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  s.n
                )}
              </span>
              <span
                className={`max-w-[5.5rem] text-center text-[10px] font-semibold leading-tight sm:max-w-none sm:text-left sm:text-xs ${
                  active ? "text-orange-700" : done ? "text-emerald-700" : "text-zinc-400"
                }`}
              >
                {s.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div className={`mx-1 hidden h-px flex-1 sm:block ${done ? "bg-emerald-300" : "bg-zinc-200"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

function SummaryRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-zinc-100 py-2 last:border-0">
      <span className="text-xs text-zinc-500">{label}</span>
      <span className={`text-right text-xs font-semibold text-zinc-900 ${highlight ? "text-orange-600" : ""}`}>
        {value}
      </span>
    </div>
  );
}

export function RegistrarPagoModal({
  open,
  onClose,
  orders,
  obras,
  initialOrderId,
  onCompleted,
}: {
  open: boolean;
  onClose: () => void;
  orders: PurchaseOrderDto[];
  obras: ObraDto[];
  initialOrderId?: string | null;
  onCompleted?: () => void;
}) {
  const { showSuccess, showError } = useFeedback();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [busy, setBusy] = useState(false);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const candidates = useMemo(() => payableOrders(orders), [orders]);

  const [form, setForm] = useState<RegistrarPagoForm>(() => ({
    orderId: "",
    amount: "",
    paymentDate: todayMxInput(),
    paymentMethod: "Transferencia bancaria",
    currency: "MXN",
    concept: "",
    notes: "",
    receiptComments: "",
  }));

  const order = useMemo(
    () => candidates.find((o) => o.id === form.orderId) ?? candidates[0],
    [candidates, form.orderId]
  );

  const obra = order ? obraForOrder(obras, order) : undefined;
  const payAmount = parseAmountInput(form.amount);

  const resetForOpen = useCallback(() => {
    const first =
      candidates.find((o) => o.id === initialOrderId) ?? candidates[0];
    if (!first) {
      setForm((f) => ({ ...f, orderId: "", paymentDate: todayMxInput() }));
      setStep(1);
      setReceiptFile(null);
      return;
    }
    setForm({
      orderId: first.id,
      amount: defaultAmount(first),
      paymentDate: todayMxInput(),
      paymentMethod: "Transferencia bancaria",
      currency: first.currency || "MXN",
      concept: defaultConcept(first),
      notes: "",
      receiptComments: "",
    });
    setStep(1);
    setReceiptFile(null);
  }, [candidates, initialOrderId]);

  useEffect(() => {
    if (open) resetForOpen();
  }, [open, resetForOpen]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !busy) onClose();
    }
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, busy, onClose]);

  function setOrderId(orderId: string) {
    const next = candidates.find((o) => o.id === orderId);
    if (!next) return;
    setForm((f) => ({
      ...f,
      orderId,
      amount: defaultAmount(next),
      currency: next.currency || "MXN",
      concept: defaultConcept(next),
    }));
  }

  function pickReceipt(file: File) {
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      showError("Solo se permiten archivos PDF.");
      return;
    }
    if (file.size > MAX_RECEIPT_BYTES) {
      showError("El archivo supera el límite de 20 MB.");
      return;
    }
    setReceiptFile(file);
  }

  function validateStep1(): string | null {
    if (!order) return "No hay órdenes pendientes de pago.";
    if (payAmount <= 0) return "Indica un monto válido.";
    if (!form.paymentDate) return "Indica la fecha de pago.";
    if (!form.concept.trim()) return "Indica el concepto del pago.";
    if (payAmount > order.amountRemaining + 0.01) {
      return "El monto supera el saldo pendiente de la orden.";
    }
    return null;
  }

  async function submitPayment() {
    if (!order || !receiptFile) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/orders/${order.id}/actions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          action: "register_payment",
          amount: payAmount,
          reference: buildPaymentReference(form),
          notes: buildPaymentNotes(form),
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "No se pudo registrar el pago.");

      const fd = new FormData();
      fd.set("orderId", order.id);
      fd.set("kind", "comprobante_pago");
      fd.set("file", receiptFile);
      const up = await fetch("/api/files/upload", { method: "POST", credentials: "include", body: fd });
      const upData = (await up.json()) as { error?: string };
      if (!up.ok) throw new Error(upData.error ?? "Pago registrado, pero falló la subida del comprobante.");

      showSuccess(actionSuccessMessage("register_payment"));
      onCompleted?.();
      onClose();
    } catch (e) {
      showError(e instanceof Error ? e.message : "No se pudo completar el registro.");
    } finally {
      setBusy(false);
    }
  }

  if (!open) return null;

  const folio = order?.ocFolio || order?.title || "—";
  const saldoRestante = order ? remainingAfterPayment(order, payAmount) : 0;

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/45 p-0 sm:items-center sm:p-4">
      <div
        className="flex max-h-[94dvh] w-full max-w-4xl flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="registrar-pago-title"
      >
        {/* Header */}
        <div className="shrink-0 border-b border-zinc-100 px-5 py-4 sm:px-6">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-start gap-3">
              <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-orange-500 text-white">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8V6m0 12v-2m9-4a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </span>
              <div className="min-w-0">
                <h2 id="registrar-pago-title" className="text-lg font-bold text-zinc-900 sm:text-xl">
                  Registrar pago
                </h2>
                <p className="mt-0.5 text-sm text-zinc-500">
                  Registra el pago y sube el comprobante para el expediente.
                </p>
              </div>
            </div>
            <button
              type="button"
              disabled={busy}
              onClick={onClose}
              className="rounded-xl p-2 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
              aria-label="Cerrar"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="mt-4 border-t border-zinc-50 pt-4">
            <Stepper step={step} />
          </div>
        </div>

        {/* Body */}
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 sm:px-6">
          {!order ? (
            <p className="py-12 text-center text-sm text-zinc-500">
              No hay órdenes en estado «Pendiente pago» para registrar.
            </p>
          ) : step === 1 ? (
            <div className="space-y-4">
              {candidates.length > 1 && (
                <Field label="Orden de compra" required>
                  <select
                    value={form.orderId}
                    onChange={(e) => setOrderId(e.target.value)}
                    className={inputCls}
                  >
                    {candidates.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.ocFolio || o.title} · {o.supplierName} · {formatMoney(o.amountRemaining, o.currency)}
                      </option>
                    ))}
                  </select>
                </Field>
              )}

              <div className="grid gap-4 lg:grid-cols-[1fr_1fr_auto] lg:items-end">
                <Field label="OC / Folio">
                  <input readOnly value={folio} className={readOnlyCls} />
                </Field>
                <Field label="Proveedor">
                  <input readOnly value={order.supplierName} className={readOnlyCls} />
                </Field>
                <div className="rounded-2xl border border-orange-100 bg-orange-50/80 px-4 py-3 lg:min-w-[11rem]">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-orange-700/80">
                    Monto autorizado
                  </p>
                  <p className="mt-1 text-lg font-bold tabular-nums text-zinc-900">
                    {formatMoney(order.totalAmount, order.currency)}
                  </p>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Monto a pagar" required>
                  <div className="relative">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-zinc-400">
                      $
                    </span>
                    <input
                      value={form.amount}
                      onChange={(e) => setForm((f) => ({ ...f, amount: sanitizeAmountInput(e.target.value) }))}
                      onBlur={() =>
                        setForm((f) => ({ ...f, amount: formatAmountInput(parseAmountInput(f.amount)) }))
                      }
                      className={`${inputCls} pl-7 tabular-nums`}
                      inputMode="decimal"
                    />
                  </div>
                </Field>
                <Field label="Fecha de pago" required>
                  <input
                    type="date"
                    value={form.paymentDate}
                    onChange={(e) => setForm((f) => ({ ...f, paymentDate: e.target.value }))}
                    className={inputCls}
                  />
                </Field>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Forma de pago" required>
                  <select
                    value={form.paymentMethod}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        paymentMethod: e.target.value as RegistrarPagoForm["paymentMethod"],
                      }))
                    }
                    className={inputCls}
                  >
                    {PAYMENT_METHODS.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Moneda">
                  <select
                    value={form.currency}
                    onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value }))}
                    className={inputCls}
                  >
                    <option value="MXN">{currencyLabel("MXN")}</option>
                    <option value="USD">{currencyLabel("USD")}</option>
                  </select>
                </Field>
              </div>

              <Field label="Concepto / Descripción" required>
                <input
                  value={form.concept}
                  onChange={(e) => setForm((f) => ({ ...f, concept: e.target.value }))}
                  className={inputCls}
                />
              </Field>

              <Field label="Notas (opcional)">
                <textarea
                  rows={2}
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  placeholder="Agregar notas adicionales…"
                  className={`${inputCls} min-h-[4.5rem] resize-y py-2.5`}
                />
              </Field>

              <div className="rounded-2xl border border-violet-100 bg-violet-50/70 px-4 py-3 text-sm text-violet-900">
                <span className="font-semibold">Importante:</span> Después de registrar el pago podrás subir el
                comprobante bancario en el siguiente paso.
              </div>
            </div>
          ) : step === 2 ? (
            <div className="grid gap-5 lg:grid-cols-2">
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-zinc-900">2. Subir comprobante de pago</h3>
                <div
                  role="button"
                  tabIndex={0}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragOver(true);
                  }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDragOver(false);
                    const file = e.dataTransfer.files[0];
                    if (file) pickReceipt(file);
                  }}
                  onClick={() => fileInputRef.current?.click()}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") fileInputRef.current?.click();
                  }}
                  className={`flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-4 py-10 text-center transition ${
                    dragOver ? "border-orange-400 bg-orange-50/50" : "border-zinc-200 bg-zinc-50/50 hover:border-orange-200"
                  }`}
                >
                  <svg className="h-10 w-10 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                    />
                  </svg>
                  <p className="mt-3 text-sm font-medium text-zinc-700">
                    Arrastra tu archivo aquí o selecciona desde tu dispositivo
                  </p>
                  <p className="mt-1 text-xs text-zinc-500">Formatos permitidos: PDF (máx. 20 MB)</p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="application/pdf,.pdf"
                    className="sr-only"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      e.target.value = "";
                      if (file) pickReceipt(file);
                    }}
                  />
                </div>

                {receiptFile && (
                  <div className="flex items-center gap-3 rounded-xl border border-zinc-200 bg-white px-3 py-2.5">
                    <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-red-50 text-red-600">
                      PDF
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-zinc-800">{receiptFile.name}</p>
                      <p className="text-xs text-zinc-500">
                        {(receiptFile.size / (1024 * 1024)).toFixed(1)} MB
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setReceiptFile(null)}
                      className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
                      aria-label="Quitar archivo"
                    >
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                )}

                <Field label="Comentarios (opcional)">
                  <textarea
                    rows={3}
                    value={form.receiptComments}
                    onChange={(e) => setForm((f) => ({ ...f, receiptComments: e.target.value }))}
                    placeholder="Agrega algún comentario sobre este pago…"
                    className={`${inputCls} min-h-[5rem] resize-y py-2.5`}
                  />
                </Field>
              </div>

              <div className="space-y-4">
                <div className="rounded-2xl border border-zinc-100 bg-zinc-50/50 p-4">
                  <h4 className="text-sm font-bold text-zinc-900">Resumen del pago</h4>
                  <dl className="mt-3 space-y-2 text-sm">
                    <div className="flex justify-between gap-2">
                      <dt className="text-zinc-500">OC / Folio</dt>
                      <dd className="font-semibold text-zinc-900">{folio}</dd>
                    </div>
                    <div className="flex justify-between gap-2">
                      <dt className="text-zinc-500">Proveedor</dt>
                      <dd className="text-right font-medium text-zinc-800">{order.supplierName}</dd>
                    </div>
                    <div className="flex justify-between gap-2">
                      <dt className="text-zinc-500">Obra</dt>
                      <dd className="text-right font-medium text-zinc-800">{order.obraName}</dd>
                    </div>
                    <div className="flex justify-between gap-2">
                      <dt className="text-zinc-500">Monto de este pago</dt>
                      <dd className="font-bold tabular-nums text-zinc-900">
                        {formatMoney(payAmount, order.currency)}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-2">
                      <dt className="text-zinc-500">Fecha de pago</dt>
                      <dd className="tabular-nums text-zinc-800">{formatDisplayDate(form.paymentDate)}</dd>
                    </div>
                  </dl>

                  <div className="mt-4 rounded-xl border border-orange-100 bg-orange-50/60 p-3 text-sm">
                    <div className="flex justify-between gap-2">
                      <span className="text-zinc-600">Monto autorizado</span>
                      <span className="font-medium tabular-nums">{formatMoney(order.totalAmount, order.currency)}</span>
                    </div>
                    <div className="mt-1 flex justify-between gap-2">
                      <span className="text-zinc-600">Pagado anteriormente</span>
                      <span className="tabular-nums">{formatMoney(order.amountPaidSoFar, order.currency)}</span>
                    </div>
                    <div className="mt-2 flex justify-between gap-2 border-t border-orange-100/80 pt-2">
                      <span className="font-semibold text-orange-800">Monto de este pago</span>
                      <span className="font-bold tabular-nums text-orange-700">
                        {formatMoney(payAmount, order.currency)}
                      </span>
                    </div>
                    <div className="mt-1 flex justify-between gap-2">
                      <span className="font-semibold text-emerald-800">Saldo restante</span>
                      <span className="font-bold tabular-nums text-emerald-700">
                        {formatMoney(saldoRestante, order.currency)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-zinc-100 p-4">
                  <h4 className="text-sm font-bold text-zinc-900">Asociar este pago a una obra</h4>
                  <p className="mt-1 text-xs text-zinc-500">La obra ya está definida en la orden de compra.</p>
                  <Field label="Obra">
                    <select disabled value={order.obraId} className={`${inputCls} bg-zinc-50 text-zinc-700`}>
                      <option value={order.obraId}>
                        {order.obraName}
                        {obra?.code ? ` (${obra.code})` : ""}
                      </option>
                    </select>
                  </Field>
                  <div className="mt-3 rounded-xl border border-emerald-100 bg-emerald-50/70 px-3 py-2.5 text-xs text-emerald-900">
                    Este pago quedará asociado a todos los expedientes de esta obra.
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="grid gap-5 lg:grid-cols-2">
              <div className="space-y-4">
                <div className="rounded-2xl border border-zinc-100 p-4">
                  <h4 className="text-sm font-bold text-zinc-900">Resumen del pago</h4>
                  <div className="mt-2">
                    <SummaryRow label="OC / Folio" value={folio} />
                    <SummaryRow label="Proveedor" value={order.supplierName} />
                    <SummaryRow label="Monto autorizado" value={formatMoney(order.totalAmount, order.currency)} />
                    <SummaryRow
                      label="Monto de este pago"
                      value={formatMoney(payAmount, order.currency)}
                      highlight
                    />
                    <SummaryRow label="Fecha de pago" value={formatDisplayDate(form.paymentDate)} />
                    <SummaryRow label="Forma de pago" value={form.paymentMethod} />
                    <SummaryRow label="Moneda" value={currencyLabel(form.currency)} />
                    <SummaryRow label="Concepto / Descripción" value={form.concept} />
                  </div>
                </div>

                {receiptFile && (
                  <div className="rounded-2xl border border-zinc-100 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Archivo comprobante</p>
                    <div className="mt-2 flex items-center gap-3">
                      <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-red-50 text-xs font-bold text-red-600">
                        PDF
                      </span>
                      <div>
                        <p className="text-sm font-semibold text-zinc-900">{receiptFile.name}</p>
                        <p className="text-xs text-zinc-500">
                          {(receiptFile.size / (1024 * 1024)).toFixed(1)} MB
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="rounded-2xl border border-emerald-100 bg-emerald-50/70 px-4 py-3 text-sm text-emerald-900">
                  <span className="font-semibold">Todo está listo</span> — Revisa que la información sea correcta
                  antes de registrar el pago.
                </div>
              </div>

              <div className="space-y-4">
                <div className="rounded-2xl border border-zinc-200 bg-gradient-to-b from-zinc-50 to-white p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                    Vista previa del comprobante
                  </p>
                  <div className="mt-3 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
                    <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
                      <span className="text-lg font-black tracking-tight text-[#004481]">BBVA</span>
                      <span className="text-xs text-zinc-500">Comprobante de transferencia</span>
                    </div>
                    <dl className="mt-3 space-y-2 text-xs">
                      <div className="flex justify-between gap-2">
                        <dt className="text-zinc-500">Fecha</dt>
                        <dd>{formatDisplayDate(form.paymentDate)}</dd>
                      </div>
                      <div className="flex justify-between gap-2">
                        <dt className="text-zinc-500">Beneficiario</dt>
                        <dd className="text-right font-medium">{order.supplierName}</dd>
                      </div>
                      <div className="flex justify-between gap-2">
                        <dt className="text-zinc-500">Referencia</dt>
                        <dd>{folio}</dd>
                      </div>
                      <div className="flex justify-between gap-2 border-t border-zinc-100 pt-2">
                        <dt className="font-semibold text-zinc-700">Importe</dt>
                        <dd className="text-base font-bold tabular-nums text-zinc-900">
                          {formatMoney(payAmount, order.currency)}
                        </dd>
                      </div>
                    </dl>
                    <p className="mt-4 text-center text-[10px] text-zinc-400">
                      Este documento es solo una vista previa
                    </p>
                  </div>
                </div>

                <div className="rounded-2xl border border-violet-100 bg-violet-50/40 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-violet-700/80">
                    Asociado a la obra
                  </p>
                  <div className="mt-2 flex items-start gap-3">
                    <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-700">
                      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                        />
                      </svg>
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-zinc-900">
                        {order.obraName}
                        {obra?.code ? ` (${obra.code})` : ""}
                      </p>
                      {obra?.managerName && (
                        <p className="mt-0.5 text-xs text-zinc-500">Responsable: {obra.managerName}</p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-sky-100 bg-sky-50/60 px-3 py-2.5 text-xs text-sky-900">
                  Este pago quedará asociado a todos los expedientes (OC, factura, etc.) de esta obra.
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-zinc-100 px-5 py-4 sm:px-6">
          {step === 1 ? (
            <>
              <button type="button" disabled={busy} onClick={onClose} className="btn-ghost min-h-11 px-5 text-sm">
                Cancelar
              </button>
              <button
                type="button"
                disabled={busy || !order}
                className="btn-primary min-h-11 px-6 text-sm"
                onClick={() => {
                  const err = validateStep1();
                  if (err) {
                    showError(err);
                    return;
                  }
                  setStep(2);
                }}
              >
                Continuar →
              </button>
            </>
          ) : step === 2 ? (
            <>
              <button
                type="button"
                disabled={busy}
                onClick={() => setStep(1)}
                className="btn-ghost min-h-11 px-5 text-sm"
              >
                ← Volver
              </button>
              <button
                type="button"
                disabled={busy || !receiptFile}
                className="btn-primary min-h-11 px-6 text-sm"
                onClick={() => setStep(3)}
              >
                Continuar →
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                disabled={busy}
                onClick={() => setStep(2)}
                className="btn-ghost min-h-11 px-5 text-sm"
              >
                ← Volver
              </button>
              <button
                type="button"
                disabled={busy || !receiptFile}
                className="btn-primary min-h-11 px-6 text-sm"
                onClick={() => void submitPayment()}
              >
                {busy ? "Registrando…" : "Confirmar y registrar"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
