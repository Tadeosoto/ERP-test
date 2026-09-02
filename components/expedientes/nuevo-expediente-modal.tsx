"use client";

import { useEffect, useState } from "react";
import { useFeedback } from "@/components/ui/feedback-provider";
import type { ExpedienteListItemDto, ObraDto } from "@/lib/domain/types";

const inputCls =
  "mt-1.5 block w-full min-h-11 rounded-xl border border-zinc-200 bg-white px-3 text-sm shadow-sm focus:border-orange-300 focus:outline-none focus:ring-1 focus:ring-orange-200";

export function NuevoExpedienteModal({
  open,
  onClose,
  onSaved,
  obras,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: (e: ExpedienteListItemDto) => void;
  obras: ObraDto[];
}) {
  const { showSuccess, showError } = useFeedback();
  const [name, setName] = useState("");
  const [notes, setNotes] = useState("");
  const [obraId, setObraId] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName("");
    setNotes("");
    setObraId("");
  }, [open]);

  if (!open) return null;

  async function submit() {
    if (!name.trim()) {
      showError("Indica un nombre para identificar el expediente.");
      return;
    }
    if (!obraId) {
      showError("Selecciona la obra a la que pertenece este expediente.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/expedientes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name: name.trim(), notes, obraId }),
      });
      const data = (await res.json()) as { expediente?: ExpedienteListItemDto; error?: string };
      if (!res.ok || !data.expediente) throw new Error(data.error ?? "No se pudo crear.");
      showSuccess(`Expediente ${data.expediente.folio} creado.`);
      onSaved(data.expediente);
      onClose();
    } catch (e) {
      showError(e instanceof Error ? e.message : "No se pudo crear.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[120] flex items-end justify-center sm:items-center sm:p-4">
      <button type="button" className="absolute inset-0 bg-black/45" aria-label="Cerrar" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        className="relative w-full max-w-lg rounded-t-3xl bg-white p-5 shadow-2xl sm:rounded-3xl sm:p-6"
      >
        <h2 className="text-lg font-bold text-zinc-900">Nuevo expediente</h2>
        <p className="mt-1 text-sm text-zinc-500">
          Contenedor dentro de una obra para agrupar OC y pagos Proceso C.
        </p>
        <div className="mt-4 space-y-3">
          <label className="block">
            <span className="text-xs font-medium text-zinc-700">
              Nombre <span className="text-red-500">*</span>
            </span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej. Proveedor X · Marzo 2026"
              className={inputCls}
            />
          </label>
          <label className="block">
            <span className="text-xs font-medium text-zinc-700">
              Obra <span className="text-red-500">*</span>
            </span>
            <select value={obraId} onChange={(e) => setObraId(e.target.value)} required className={inputCls}>
              <option value="">Selecciona obra…</option>
              {obras.filter((o) => o.active).map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-xs font-medium text-zinc-700">Notas</span>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className={`${inputCls} min-h-[4.5rem] resize-y py-2`}
            />
          </label>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" className="btn-secondary" disabled={busy} onClick={onClose}>
            Cancelar
          </button>
          <button type="button" className="btn-primary" disabled={busy} onClick={() => void submit()}>
            {busy ? "Creando…" : "Crear expediente"}
          </button>
        </div>
      </div>
    </div>
  );
}
