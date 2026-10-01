"use client";

import { useEffect, useMemo, useState } from "react";
import { SupplierCombobox } from "@/components/ui/supplier-combobox";
import { FilePickButton } from "@/components/file-pick-button";
import { useFeedback } from "@/components/ui/feedback-provider";
import { ADMIN_EXPENSE_CATEGORIES, ADMIN_PAYMENT_METHODS } from "@/lib/domain/admin-expenses";
import {
  COMMITMENT_FREQUENCIES,
  toDateInputValue,
  type CommitmentFrequency,
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

type FormState = {
  supplierId: string;
  concept: string;
  category: string;
  frequency: CommitmentFrequency | "";
  occurredOn: string;
  dueDate: string;
  amount: string;
  paymentMethod: string;
  paid: boolean;
  notes: string;
};

function emptyForm(recurring: boolean): FormState {
  return {
    supplierId: "",
    concept: "",
    category: "",
    frequency: recurring ? "mensual" : "unico",
    occurredOn: toDateInputValue(new Date()),
    dueDate: "",
    amount: "",
    paymentMethod: "",
    paid: false,
    notes: "",
  };
}

function commitmentToForm(c: RecurringCommitmentDto): FormState {
  return {
    supplierId: c.supplierId ?? "",
    concept: c.concept,
    category: c.category || "otro",
    frequency: c.frequency as CommitmentFrequency,
    occurredOn: toDateInputValue(new Date(c.occurredOn)),
    dueDate: toDateInputValue(new Date(c.dueDate)),
    amount: c.amount > 0 ? formatAmountInput(c.amount) : "",
    paymentMethod: c.paymentMethod,
    paid: c.workflowStatus === "paid",
    notes: c.notes,
  };
}

export function CompromisoRecurrenteModal({
  open,
  onClose,
  onSaved,
  suppliers,
  editing,
  recurring = false,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  suppliers: SupplierDto[];
  editing?: RecurringCommitmentDto | null;
  recurring?: boolean;
}) {
  const { showSuccess, showError } = useFeedback();
  const [form, setForm] = useState<FormState>(emptyForm(recurring));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [files, setFiles] = useState(editing?.files ?? []);
  const [receipt, setReceipt] = useState<File | null>(null);
  const [invoice, setInvoice] = useState<File | null>(null);

  const isEdit = Boolean(editing);
  const frequencies = COMMITMENT_FREQUENCIES.filter((item) => (recurring && !isEdit ? item.value !== "unico" : true));

  useEffect(() => {
    if (!open) return;
    setForm(editing ? commitmentToForm(editing) : emptyForm(recurring));
    setFiles(editing?.files ?? []);
    setReceipt(null);
    setInvoice(null);
    setError("");
  }, [open, editing, recurring]);

  const selectedSupplier = useMemo(
    () => suppliers.find((s) => s.id === form.supplierId) ?? null,
    [suppliers, form.supplierId]
  );

  async function uploadDoc(commitmentId: string, file: File, kind: "comprobante_pago" | "factura") {
    const fd = new FormData();
    fd.set("commitmentId", commitmentId);
    fd.set("kind", kind);
    fd.set("file", file);
    const res = await fetch("/api/recurring-commitment-files/upload", {
      method: "POST",
      credentials: "include",
      body: fd,
    });
    const data = (await res.json()) as { commitment?: RecurringCommitmentDto; error?: string };
    if (!res.ok || !data.commitment) throw new Error(data.error ?? "No se pudo subir el documento.");
    setFiles(data.commitment.files);
  }

  async function submit() {
    setError("");
    if (!form.supplierId) return setError("Selecciona un proveedor.");
    if (!form.concept.trim()) return setError("Indica el concepto.");
    if (!form.category) return setError("Selecciona la categoría.");
    if (!form.frequency) return setError("Selecciona la periodicidad.");
    if (recurring && !isEdit && form.frequency === "unico") return setError("Un gasto recurrente no puede ser único.");
    if (!form.occurredOn) return setError("Indica la fecha del gasto.");
    if (!form.dueDate) return setError("Indica la fecha de vencimiento.");
    if (!form.paymentMethod) return setError("Selecciona la forma de pago.");
    const amount = parseAmountInput(form.amount);
    if (!Number.isFinite(amount) || amount <= 0) return setError("El importe es obligatorio.");

    const payload = {
      supplierId: form.supplierId,
      supplierName: selectedSupplier?.displayName ?? "",
      concept: form.concept.trim(),
      category: form.category,
      frequency: form.frequency,
      occurredOn: form.occurredOn,
      dueDate: form.dueDate,
      amount,
      paymentMethod: form.paymentMethod,
      notes: form.notes.slice(0, 400),
      ...(isEdit ? { workflowStatus: form.paid ? "paid" : "pending" } : {}),
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
      const data = (await res.json()) as { error?: string; commitment?: RecurringCommitmentDto };
      if (!res.ok || !data.commitment) throw new Error(data.error ?? "No se pudo guardar.");
      if (receipt) await uploadDoc(data.commitment.id, receipt, "comprobante_pago");
      if (invoice) await uploadDoc(data.commitment.id, invoice, "factura");
      showSuccess(isEdit ? "Gasto actualizado." : "Gasto registrado.");
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

  const title = isEdit ? "Editar gasto" : recurring ? "Gasto recurrente" : "Nuevo gasto";

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center sm:p-4">
      <button type="button" className="absolute inset-0 bg-black/45" aria-label="Cerrar" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="gasto-admin-title"
        className="relative flex max-h-[92dvh] w-full max-w-2xl flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl"
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-zinc-100 px-5 py-4 sm:px-6">
          <div>
            <h2 id="gasto-admin-title" className="text-lg font-bold text-zinc-900 sm:text-xl">{title}</h2>
            <p className="mt-0.5 text-sm text-zinc-500">
              Gasto general de la empresa, sin obra. El aviso de pago sigue llegando desde 3 días antes del vencimiento.
            </p>
          </div>
          <button type="button" onClick={onClose} className="rounded-xl p-2 text-zinc-400 hover:bg-zinc-100" aria-label="Cerrar modal">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 sm:px-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Fecha" required>
              <input type="date" value={form.occurredOn} onChange={(e) => setForm((f) => ({ ...f, occurredOn: e.target.value }))} className={inputCls} />
            </Field>
            <Field label="Fecha de vencimiento" required>
              <input type="date" value={form.dueDate} onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))} className={inputCls} />
            </Field>
            <Field label="Concepto" required>
              <input value={form.concept} onChange={(e) => setForm((f) => ({ ...f, concept: e.target.value }))} placeholder="CFE oficina, renta, IMSS…" className={inputCls} />
            </Field>
            <Field label="Proveedor" required>
              <SupplierCombobox
                suppliers={suppliers}
                value={form.supplierId}
                onChange={(id) => setForm((f) => ({ ...f, supplierId: id }))}
                placeholder="Buscar proveedor…"
                className={inputCls}
              />
            </Field>
            <Field label="Categoría" required>
              <select value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} className={inputCls}>
                <option value="">Seleccionar…</option>
                {ADMIN_EXPENSE_CATEGORIES.map((item) => (
                  <option key={item.value} value={item.value}>{item.label}</option>
                ))}
              </select>
            </Field>
            <Field label="Importe" required>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-zinc-400">$</span>
                <input
                  value={form.amount}
                  onChange={(e) => setForm((f) => ({ ...f, amount: sanitizeAmountInput(e.target.value) }))}
                  onBlur={() =>
                    setForm((f) => ({
                      ...f,
                      amount: f.amount && parseAmountInput(f.amount) > 0 ? formatAmountInput(parseAmountInput(f.amount)) : f.amount.trim(),
                    }))
                  }
                  inputMode="decimal"
                  placeholder="0.00"
                  className={`${inputCls} pl-7 tabular-nums`}
                />
              </div>
            </Field>
            <Field label="Periodicidad" required>
              <select
                value={form.frequency}
                onChange={(e) => setForm((f) => ({ ...f, frequency: e.target.value as CommitmentFrequency | "" }))}
                className={inputCls}
              >
                {frequencies.map((item) => (
                  <option key={item.value} value={item.value}>{item.label}</option>
                ))}
              </select>
            </Field>
            <Field label="Forma de pago" required>
              <select value={form.paymentMethod} onChange={(e) => setForm((f) => ({ ...f, paymentMethod: e.target.value }))} className={inputCls}>
                <option value="">Seleccionar…</option>
                {ADMIN_PAYMENT_METHODS.map((item) => (
                  <option key={item.value} value={item.value}>{item.label}</option>
                ))}
              </select>
            </Field>
            {isEdit && (
              <Field label="Estatus">
                <select
                  value={form.paid ? "paid" : "pending"}
                  onChange={(e) => setForm((f) => ({ ...f, paid: e.target.value === "paid" }))}
                  className={inputCls}
                >
                  <option value="pending">Sin pagar</option>
                  <option value="paid">Pagado</option>
                </select>
              </Field>
            )}
            <div className="sm:col-span-2">
              <Field label="Observaciones">
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value.slice(0, 400) }))}
                  rows={3}
                  className={`${inputCls} min-h-[5rem] resize-y py-2.5`}
                />
              </Field>
            </div>
            <div className="sm:col-span-2 grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-xs font-medium text-zinc-700">Comprobante de pago (PDF)</p>
                <p className="mt-0.5 text-xs text-zinc-500">Opcional. Si no va ahora, el gasto queda en pendiente de pago.</p>
                <div className="mt-1.5">
                  <FilePickButton accept="application/pdf,.pdf" label="Subir comprobante de pago" hint="PDF" onPick={setReceipt} />
                </div>
              </div>
              <div>
                <p className="text-xs font-medium text-zinc-700">Factura (PDF)</p>
                <p className="mt-0.5 text-xs text-zinc-500">Opcional. Se puede agregar después; si falta, queda pendiente de factura.</p>
                <div className="mt-1.5">
                  <FilePickButton accept="application/pdf,.pdf" label="Subir factura" hint="PDF" onPick={setInvoice} />
                </div>
              </div>
            </div>
            {files.length > 0 && (
              <ul className="sm:col-span-2 space-y-1 text-sm">
                {files.map((file) => (
                  <li key={file.id} className="flex items-center justify-between gap-2">
                    <span className="truncate text-zinc-600">
                      {FILE_KIND_LABEL[file.kind] ?? "Documento"} · {file.originalFileName}
                      <span className="text-zinc-400"> · {formatDateShort(file.createdAt)}</span>
                    </span>
                    <a href={`/api/recurring-commitment-files/${file.id}`} target="_blank" rel="noreferrer" className="shrink-0 font-semibold text-orange-700">
                      Ver
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>
          {error && <p className="mt-3 text-sm font-medium text-red-700">{error}</p>}
        </div>

        <div className="flex shrink-0 flex-col-reverse gap-2 border-t border-zinc-100 px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
          <button type="button" onClick={onClose} disabled={busy} className="btn-secondary min-h-11">Cancelar</button>
          <button type="button" disabled={busy} onClick={() => void submit()} className="btn-primary min-h-11">
            {busy ? "Guardando…" : isEdit ? "Guardar cambios" : "Registrar gasto"}
          </button>
        </div>
      </div>
    </div>
  );
}
