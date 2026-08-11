"use client";

import { useEffect, useMemo, useState } from "react";
import { SupplierCombobox } from "@/components/ui/supplier-combobox";
import { FilePickButton } from "@/components/file-pick-button";
import { useFeedback } from "@/components/ui/feedback-provider";
import {
  COMMITMENT_FREQUENCIES,
  COMMITMENT_WORKFLOW_LABEL,
  toDateInputValue,
  type CommitmentFrequency,
  type CommitmentWorkflowStatus,
} from "@/lib/domain/recurring-commitments";
import { FILE_KIND_LABEL } from "@/lib/domain/labels";
import type { RecurringCommitmentDto, SupplierDto } from "@/lib/domain/types";
import { formatAmountInput, formatDateShort, parseAmountInput, sanitizeAmountInput } from "@/lib/format";

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
  dueDate: string;
  currency: string;
  estimatedAmount: string;
  workflowStatus: CommitmentWorkflowStatus;
  notes: string;
};

const EMPTY: FormState = {
  supplierId: "",
  concept: "",
  frequency: "",
  dueDate: "",
  currency: "MXN",
  estimatedAmount: "",
  workflowStatus: "pending",
  notes: "",
};

function commitmentToForm(c: RecurringCommitmentDto): FormState {
  return {
    supplierId: c.supplierId ?? "",
    concept: c.concept,
    frequency: c.frequency as CommitmentFrequency,
    dueDate: toDateInputValue(new Date(c.dueDate)),
    currency: c.currency,
    estimatedAmount: c.estimatedAmount != null ? formatAmountInput(c.estimatedAmount) : "",
    workflowStatus: c.workflowStatus as CommitmentWorkflowStatus,
    notes: c.notes,
  };
}

export function CompromisoRecurrenteModal({
  open,
  onClose,
  onSaved,
  suppliers,
  editing,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  suppliers: SupplierDto[];
  editing?: RecurringCommitmentDto | null;
}) {
  const { showSuccess, showError } = useFeedback();
  const [form, setForm] = useState<FormState>(EMPTY);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [files, setFiles] = useState(editing?.files ?? []);

  const isEdit = Boolean(editing);

  useEffect(() => {
    if (!open) return;
    setForm(editing ? commitmentToForm(editing) : EMPTY);
    setFiles(editing?.files ?? []);
    setError("");
  }, [open, editing]);

  const selectedSupplier = useMemo(
    () => suppliers.find((s) => s.id === form.supplierId) ?? null,
    [suppliers, form.supplierId]
  );

  async function uploadDoc(kind: "factura" | "comprobante_pago", file: File) {
    if (!editing) return;
    setBusy(true);
    try {
      const fd = new FormData();
      fd.set("commitmentId", editing.id);
      fd.set("kind", kind);
      fd.set("file", file);
      const res = await fetch("/api/recurring-commitment-files/upload", {
        method: "POST",
        credentials: "include",
        body: fd,
      });
      const data = (await res.json()) as { commitment?: RecurringCommitmentDto; error?: string };
      if (!res.ok || !data.commitment) throw new Error(data.error ?? "No se pudo subir.");
      setFiles(data.commitment.files);
      showSuccess(kind === "factura" ? "Factura subida." : "Comprobante de pago subido.");
      onSaved();
    } catch (e) {
      showError(e instanceof Error ? e.message : "No se pudo subir.");
    } finally {
      setBusy(false);
    }
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
    if (!form.dueDate) {
      setError("Indica la fecha límite de pago.");
      return;
    }

    const payload = {
      supplierId: form.supplierId,
      supplierName: selectedSupplier?.displayName ?? "",
      concept: form.concept.trim(),
      frequency: form.frequency,
      dueDate: form.dueDate,
      currency: form.currency,
      estimatedAmount: form.estimatedAmount ? parseAmountInput(form.estimatedAmount) : null,
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
              Programa servicios o gastos recurrentes. Administración recibirá avisos desde 3 días
              antes de la fecha límite.
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
              <Field label="Fecha límite de pago" required>
                <input
                  type="date"
                  value={form.dueDate}
                  onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))}
                  className={inputCls}
                />
              </Field>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
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

            {isEdit && (
              <section className="rounded-2xl border border-zinc-200 p-4">
                <h3 className="text-sm font-bold text-zinc-900">Documentos (factura y pago)</h3>
                <p className="mt-1 text-xs text-zinc-500">
                  Contabilidad, Recepción y Administración pueden consultarlos y descargarlos.
                </p>
                <ul className="mt-3 space-y-2">
                  {files.length === 0 ? (
                    <li className="text-xs text-zinc-400">Sin documentos aún.</li>
                  ) : (
                    files.map((f) => (
                      <li
                        key={f.id}
                        className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-zinc-100 px-3 py-2 text-sm"
                      >
                        <span className="min-w-0">
                          <span className="font-semibold text-zinc-800">
                            {FILE_KIND_LABEL[f.kind] ?? f.kind}
                          </span>
                          <span className="mt-0.5 block truncate text-xs text-zinc-500">
                            {f.originalFileName} · {formatDateShort(f.createdAt)}
                          </span>
                        </span>
                        <span className="flex gap-2">
                          <a
                            href={`/api/recurring-commitment-files/${f.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs font-semibold text-orange-700 hover:underline"
                          >
                            Ver
                          </a>
                          <a
                            href={`/api/recurring-commitment-files/${f.id}?download=1`}
                            className="text-xs font-semibold text-teal-700 hover:underline"
                          >
                            Descargar
                          </a>
                        </span>
                      </li>
                    ))
                  )}
                </ul>
                <div className="mt-3 flex flex-wrap gap-2">
                  <FilePickButton
                    label="Subir factura"
                    hint="PDF del proveedor"
                    accept="application/pdf,.pdf"
                    disabled={busy}
                    onPick={(file) => void uploadDoc("factura", file)}
                  />
                  <FilePickButton
                    label="Subir comprobante de pago"
                    hint="PDF del banco"
                    accept="application/pdf,.pdf"
                    disabled={busy}
                    onPick={(file) => void uploadDoc("comprobante_pago", file)}
                  />
                </div>
              </section>
            )}

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
