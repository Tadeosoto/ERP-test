"use client";

import { useEffect, useMemo, useState } from "react";
import { SupplierCombobox } from "@/components/ui/supplier-combobox";
import { useFeedback } from "@/components/ui/feedback-provider";
import {
  COMMITMENT_DAYS,
  COMMITMENT_FREQUENCIES,
  COMMITMENT_LIFECYCLE_LABEL,
  COMMITMENT_WORKFLOW_LABEL,
  defaultDueFromReception,
  nextReceptionFromDay,
  toDateInputValue,
  type CommitmentFrequency,
  type CommitmentLifecycleStatus,
  type CommitmentWorkflowStatus,
} from "@/lib/domain/recurring-commitments";
import type { ObraDto, RecurringCommitmentDto, SupplierDto } from "@/lib/domain/types";
import { formatAmountInput, parseAmountInput, sanitizeAmountInput } from "@/lib/format";

const inputCls =
  "block w-full min-h-11 rounded-xl border border-zinc-200 bg-white px-3 text-sm shadow-sm focus:border-orange-300 focus:outline-none focus:ring-1 focus:ring-orange-200";

function Field({
  label,
  required,
  children,
  className = "",
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={`block min-w-0 ${className}`}>
      <span className="text-xs font-medium text-zinc-700">
        {label}
        {required && <span className="text-red-500"> *</span>}
      </span>
      <div className="mt-1.5">{children}</div>
    </label>
  );
}

type FormState = {
  supplierId: string;
  concept: string;
  frequency: CommitmentFrequency | "";
  expectedReceptionDay: string;
  dueDate: string;
  obraId: string;
  costCenter: string;
  currency: string;
  estimatedAmount: string;
  lifecycleStatus: CommitmentLifecycleStatus;
  workflowStatus: CommitmentWorkflowStatus;
  notes: string;
};

const EMPTY: FormState = {
  supplierId: "",
  concept: "",
  frequency: "",
  expectedReceptionDay: "",
  dueDate: "",
  obraId: "",
  costCenter: "",
  currency: "MXN",
  estimatedAmount: "",
  lifecycleStatus: "active",
  workflowStatus: "pending",
  notes: "",
};

function commitmentToForm(c: RecurringCommitmentDto): FormState {
  return {
    supplierId: c.supplierId ?? "",
    concept: c.concept,
    frequency: c.frequency as CommitmentFrequency,
    expectedReceptionDay: String(c.expectedReceptionDay),
    dueDate: toDateInputValue(new Date(c.dueDate)),
    obraId: c.obraId ?? "",
    costCenter: c.costCenter,
    currency: c.currency,
    estimatedAmount: c.estimatedAmount != null ? formatAmountInput(c.estimatedAmount) : "",
    lifecycleStatus: c.lifecycleStatus as CommitmentLifecycleStatus,
    workflowStatus: c.workflowStatus as CommitmentWorkflowStatus,
    notes: c.notes,
  };
}

export function CompromisoRecurrenteModal({
  open,
  onClose,
  onSaved,
  suppliers,
  obras,
  editing,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  suppliers: SupplierDto[];
  obras: ObraDto[];
  editing?: RecurringCommitmentDto | null;
}) {
  const { showSuccess, showError } = useFeedback();
  const [form, setForm] = useState<FormState>(EMPTY);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const isEdit = Boolean(editing);

  useEffect(() => {
    if (!open) return;
    setForm(editing ? commitmentToForm(editing) : EMPTY);
    setError("");
  }, [open, editing]);

  const selectedSupplier = useMemo(
    () => suppliers.find((s) => s.id === form.supplierId) ?? null,
    [suppliers, form.supplierId]
  );

  function setDay(day: string) {
    setForm((f) => {
      const next = { ...f, expectedReceptionDay: day };
      if (day && !f.dueDate) {
        const reception = nextReceptionFromDay(Number(day));
        next.dueDate = toDateInputValue(defaultDueFromReception(reception));
      }
      return next;
    });
  }

  async function submit() {
    setError("");
    if (!form.supplierId) {
      setError("Selecciona un proveedor.");
      return;
    }
    if (!form.concept.trim()) {
      setError("Indica el concepto.");
      return;
    }
    if (!form.frequency) {
      setError("Selecciona la frecuencia.");
      return;
    }
    if (!form.expectedReceptionDay) {
      setError("Selecciona el día esperado de recepción.");
      return;
    }

    const payload = {
      supplierId: form.supplierId,
      supplierName: selectedSupplier?.displayName ?? "",
      concept: form.concept.trim(),
      frequency: form.frequency,
      expectedReceptionDay: Number(form.expectedReceptionDay),
      dueDate: form.dueDate || null,
      obraId: form.obraId || null,
      costCenter: form.costCenter,
      currency: form.currency,
      estimatedAmount: form.estimatedAmount ? parseAmountInput(form.estimatedAmount) : null,
      lifecycleStatus: form.lifecycleStatus,
      workflowStatus: form.workflowStatus,
      notes: form.notes.slice(0, 200),
    };

    setBusy(true);
    try {
      const url = isEdit ? `/api/recurring-commitments/${editing!.id}` : "/api/recurring-commitments";
      const res = await fetch(url, {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "No se pudo guardar.");
      showSuccess(isEdit ? "Compromiso actualizado." : "Compromiso registrado.");
      onSaved();
      onClose();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "No se pudo guardar.";
      setError(msg);
      showError(msg);
    } finally {
      setBusy(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center sm:p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/45"
        aria-label="Cerrar"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="compromiso-modal-title"
        className="relative flex max-h-[92dvh] w-full max-w-2xl flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl"
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-zinc-100 px-5 py-4 sm:px-6">
          <div>
            <h2 id="compromiso-modal-title" className="text-lg font-bold text-zinc-900 sm:text-xl">
              {isEdit ? "Editar compromiso recurrente" : "Nuevo compromiso recurrente"}
            </h2>
            <p className="mt-0.5 text-sm text-zinc-500">
              Programa servicios o gastos recurrentes para llevar un mejor control.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
            aria-label="Cerrar modal"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 sm:px-6">
          <div className="space-y-4">
            <Field label="Proveedor" required>
              <SupplierCombobox
                suppliers={suppliers}
                value={form.supplierId}
                onChange={(id) => setForm((f) => ({ ...f, supplierId: id }))}
                placeholder="Buscar proveedor…"
                className={inputCls}
              />
            </Field>

            <Field label="Concepto" required>
              <input
                value={form.concept}
                onChange={(e) => setForm((f) => ({ ...f, concept: e.target.value }))}
                placeholder="Ej. Planes celulares, Internet, Renta…"
                className={inputCls}
              />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Frecuencia" required>
                <select
                  value={form.frequency}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, frequency: e.target.value as CommitmentFrequency | "" }))
                  }
                  className={inputCls}
                >
                  <option value="">Seleccionar…</option>
                  {COMMITMENT_FREQUENCIES.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Día esperado de recepción" required>
                <select
                  value={form.expectedReceptionDay}
                  onChange={(e) => setDay(e.target.value)}
                  className={inputCls}
                >
                  <option value="">Seleccionar día…</option>
                  {COMMITMENT_DAYS.map((d) => (
                    <option key={d} value={d}>
                      Día {d}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Fecha límite de pago">
                <input
                  type="date"
                  value={form.dueDate}
                  onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))}
                  className={inputCls}
                />
              </Field>
              <Field label="Centro de costo / Obra">
                <select
                  value={form.obraId}
                  onChange={(e) => setForm((f) => ({ ...f, obraId: e.target.value }))}
                  className={inputCls}
                >
                  <option value="">Seleccionar…</option>
                  {obras.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.name}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            <div>
              <p className="text-xs font-semibold text-zinc-800">Detalles adicionales</p>
              <div className="mt-3 grid gap-4 sm:grid-cols-3">
                <Field label="Moneda">
                  <select
                    value={form.currency}
                    onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value }))}
                    className={inputCls}
                  >
                    <option value="MXN">MXN — Peso mexicano</option>
                    <option value="USD">USD — Dólar</option>
                  </select>
                </Field>
                <Field label="Monto estimado">
                  <div className="relative">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-zinc-400">
                      $
                    </span>
                    <input
                      value={form.estimatedAmount}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, estimatedAmount: sanitizeAmountInput(e.target.value) }))
                      }
                      onBlur={() =>
                        setForm((f) => ({
                          ...f,
                          estimatedAmount:
                            f.estimatedAmount && parseAmountInput(f.estimatedAmount) > 0
                              ? formatAmountInput(parseAmountInput(f.estimatedAmount))
                              : f.estimatedAmount.trim(),
                        }))
                      }
                      placeholder="Opcional"
                      inputMode="decimal"
                      className={`${inputCls} pl-7 tabular-nums`}
                    />
                  </div>
                </Field>
                <Field label="Estado">
                  <select
                    value={form.lifecycleStatus}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        lifecycleStatus: e.target.value as CommitmentLifecycleStatus,
                      }))
                    }
                    className={inputCls}
                  >
                    {(Object.keys(COMMITMENT_LIFECYCLE_LABEL) as CommitmentLifecycleStatus[]).map((k) => (
                      <option key={k} value={k}>
                        {COMMITMENT_LIFECYCLE_LABEL[k]}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
            </div>

            {isEdit && (
              <Field label="Estatus del ciclo">
                <select
                  value={form.workflowStatus}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      workflowStatus: e.target.value as CommitmentWorkflowStatus,
                    }))
                  }
                  className={inputCls}
                >
                  {(Object.keys(COMMITMENT_WORKFLOW_LABEL) as CommitmentWorkflowStatus[]).map((k) => (
                    <option key={k} value={k}>
                      {COMMITMENT_WORKFLOW_LABEL[k]}
                    </option>
                  ))}
                </select>
              </Field>
            )}

            <Field label="Notas (opcional)">
              <textarea
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value.slice(0, 200) }))}
                rows={3}
                placeholder="Agrega alguna nota o referencia…"
                className={`${inputCls} min-h-[5rem] resize-y py-2.5`}
              />
              <p className="mt-1 text-right text-[11px] text-zinc-400">{form.notes.length}/200</p>
            </Field>

            <div className="rounded-2xl border border-violet-100 bg-violet-50/80 px-4 py-3 text-sm text-violet-900">
              <p className="font-semibold">¿Cómo funciona?</p>
              <p className="mt-1 text-violet-800/90">
                El compromiso aparecerá en tu panel de compromisos recurrentes. Cuando recibas la
                factura, podrás adjuntarla y el sistema creará el expediente correspondiente.
              </p>
            </div>

            {error && <p className="text-sm font-medium text-red-700">{error}</p>}
          </div>
        </div>

        <div className="flex shrink-0 flex-col-reverse gap-2 border-t border-zinc-100 px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
          <button type="button" onClick={onClose} disabled={busy} className="btn-secondary min-h-11">
            Cancelar
          </button>
          <button type="button" disabled={busy} onClick={() => void submit()} className="btn-primary min-h-11">
            {busy ? "Guardando…" : isEdit ? "Guardar cambios" : "Guardar compromiso"}
          </button>
        </div>
      </div>
    </div>
  );
}
