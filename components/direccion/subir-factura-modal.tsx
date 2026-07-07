"use client";

import { useEffect, useState } from "react";
import { SupplierCombobox } from "@/components/ui/supplier-combobox";
import { useFeedback } from "@/components/ui/feedback-provider";
import type { ObraDto, SupplierDto } from "@/lib/domain/types";
import { formatAmountInput, parseAmountInput, sanitizeAmountInput } from "@/lib/format";

const inputCls =
  "block w-full min-h-11 rounded-xl border border-zinc-200 bg-white px-3 text-sm shadow-sm focus:border-violet-300 focus:outline-none focus:ring-1 focus:ring-violet-200";

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

export function SubirFacturaModal({
  open,
  onClose,
  onSaved,
  suppliers,
  obras,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  suppliers: SupplierDto[];
  obras: ObraDto[];
}) {
  const { showSuccess, showError } = useFeedback();
  const [supplierId, setSupplierId] = useState("");
  const [supplierName, setSupplierName] = useState("");
  const [obraId, setObraId] = useState("");
  const [totalAmount, setTotalAmount] = useState("");
  const [invoiceDate, setInvoiceDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [comment, setComment] = useState("");
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [xmlFile, setXmlFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setSupplierId("");
    setSupplierName("");
    setObraId("");
    setTotalAmount("");
    setInvoiceDate(new Date().toISOString().slice(0, 10));
    setComment("");
    setPdfFile(null);
    setXmlFile(null);
    setError("");
  }, [open]);

  if (!open) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!supplierId && !supplierName.trim()) {
      setError("Selecciona un proveedor.");
      return;
    }
    if (!pdfFile) {
      setError("Adjunta el PDF de la factura.");
      return;
    }
    const amount = parseAmountInput(totalAmount);
    if (!(amount > 0)) {
      setError("Indica un monto total válido.");
      return;
    }

    setBusy(true);
    try {
      const res = await fetch("/api/invoice-first-commitments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          supplierId: supplierId || null,
          supplierName: supplierName.trim(),
          obraId: obraId || null,
          totalAmount: amount,
          currency: "MXN",
          invoiceDate,
          comment: comment.trim(),
        }),
      });
      const data = (await res.json()) as { commitment?: { id: string; invoiceFolio: string }; error?: string };
      if (!res.ok || !data.commitment) {
        throw new Error(data.error ?? "No se pudo registrar la factura.");
      }

      const upload = async (file: File) => {
        const fd = new FormData();
        fd.set("commitmentId", data.commitment!.id);
        fd.set("file", file);
        const up = await fetch("/api/invoice-first-files/upload", { method: "POST", credentials: "include", body: fd });
        const upData = (await up.json()) as { error?: string };
        if (!up.ok) throw new Error(upData.error ?? "Error al subir archivo.");
      };

      await upload(pdfFile);
      if (xmlFile) await upload(xmlFile);

      showSuccess(`Factura ${data.commitment.invoiceFolio} registrada. Administración fue notificada.`);
      onSaved();
      onClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error al guardar.";
      setError(msg);
      showError(msg);
    } finally {
      setBusy(false);
    }
  }

  function fileDrop(
    label: string,
    file: File | null,
    setFile: (f: File | null) => void,
    accept: string
  ) {
    return (
      <div
        className="rounded-xl border-2 border-dashed border-zinc-200 bg-zinc-50/60 px-4 py-5 text-center transition hover:border-violet-200 hover:bg-violet-50/30"
        onDragOver={(ev) => ev.preventDefault()}
        onDrop={(ev) => {
          ev.preventDefault();
          const f = ev.dataTransfer.files[0];
          if (f) setFile(f);
        }}
      >
        <input
          type="file"
          accept={accept}
          className="sr-only"
          id={`file-${label}`}
          onChange={(ev) => setFile(ev.target.files?.[0] ?? null)}
        />
        <label htmlFor={`file-${label}`} className="cursor-pointer">
          {file ? (
            <p className="text-sm font-medium text-violet-800">{file.name}</p>
          ) : (
            <>
              <p className="text-sm font-medium text-zinc-700">Arrastra o haz clic para subir {label}</p>
              <p className="mt-1 text-xs text-zinc-500">Máx. 20 MB</p>
            </>
          )}
        </label>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="subir-factura-title"
        className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white shadow-xl"
      >
        <div className="border-b border-zinc-100 px-5 py-4">
          <h2 id="subir-factura-title" className="text-lg font-bold text-zinc-900">
            Subir nueva factura
          </h2>
          <p className="mt-0.5 text-xs text-zinc-500">Proceso C — Factura primero (sin OC al inicio)</p>
        </div>

        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4 px-5 py-4">
          <Field label="Proveedor" required>
            <SupplierCombobox
              suppliers={suppliers}
              value={supplierId}
              onChange={(id, s) => {
                setSupplierId(id);
                setSupplierName(s?.displayName ?? "");
              }}
            />
          </Field>

          <Field label="Obra (opcional)">
            <select
              className={inputCls}
              value={obraId}
              onChange={(e) => setObraId(e.target.value)}
            >
              <option value="">Sin obra asignada</option>
              {obras.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </select>
          </Field>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Monto total factura" required>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-zinc-400">$</span>
                <input
                  className={`${inputCls} pl-7 tabular-nums`}
                  inputMode="decimal"
                  placeholder="0.00"
                  value={totalAmount}
                  onChange={(e) => setTotalAmount(sanitizeAmountInput(e.target.value))}
                />
              </div>
            </Field>
            <Field label="Fecha factura" required>
              <input
                type="date"
                className={inputCls}
                value={invoiceDate}
                onChange={(e) => setInvoiceDate(e.target.value)}
              />
            </Field>
          </div>

          <Field label="Adjuntar PDF" required>
            {fileDrop("PDF", pdfFile, setPdfFile, ".pdf,application/pdf")}
          </Field>

          <Field label="Adjuntar XML (opcional)">
            {fileDrop("XML", xmlFile, setXmlFile, ".xml,application/xml,text/xml")}
          </Field>

          <Field label="Comentario (opcional)">
            <textarea
              className={`${inputCls} min-h-[4.5rem] resize-y`}
              rows={3}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Notas para Administración o Compras…"
            />
          </Field>

          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
              {error}
            </p>
          )}

          <div className="flex flex-col-reverse gap-2 border-t border-zinc-100 pt-4 sm:flex-row sm:justify-end">
            <button type="button" className="btn-secondary min-h-11" onClick={onClose} disabled={busy}>
              Cancelar
            </button>
            <button type="submit" className="btn-primary min-h-11 bg-violet-700 hover:bg-violet-800" disabled={busy}>
              {busy ? "Guardando…" : "Guardar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
