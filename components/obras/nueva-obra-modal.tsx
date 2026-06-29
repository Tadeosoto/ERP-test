"use client";

import { useEffect, useState } from "react";
import { useFeedback } from "@/components/ui/feedback-provider";
import {
  MEXICAN_STATES,
  nuevaObraToApiPayload,
  OBRA_TYPES,
  suggestedObraCode,
  type NuevaObraForm,
} from "@/lib/obras/nueva-obra-form";
import type { ObraDto } from "@/lib/domain/types";

const EMPTY: NuevaObraForm = {
  name: "",
  code: "",
  obraType: "",
  startDate: "",
  estimatedEndDate: "",
  description: "",
  state: "",
  city: "",
  street: "",
  neighborhood: "",
  zipCode: "",
};

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

const inputCls =
  "block w-full min-h-11 rounded-xl border border-zinc-200 bg-white px-3 text-sm shadow-sm focus:border-orange-300 focus:outline-none focus:ring-1 focus:ring-orange-200";

function SectionTitle({ n, title }: { n: number; title: string }) {
  return (
    <h3 className="mb-3 text-sm font-bold text-zinc-900">
      {n}. {title}
    </h3>
  );
}

export function NuevaObraModal({
  open,
  onClose,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: (obra: ObraDto) => void;
}) {
  const { showSuccess } = useFeedback();
  const [form, setForm] = useState<NuevaObraForm>(EMPTY);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setForm({ ...EMPTY, code: suggestedObraCode() });
      setError("");
    }
  }, [open]);

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

  if (!open) return null;

  function set<K extends keyof NuevaObraForm>(key: K, value: NuevaObraForm[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/obras", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(nuevaObraToApiPayload(form)),
      });
      const data = (await res.json()) as { obra?: ObraDto; error?: string };
      if (!res.ok || !data.obra) throw new Error(data.error ?? "Error al guardar la obra.");
      showSuccess("Obra registrada en el catálogo.");
      onSaved(data.obra);
      setForm(EMPTY);
      onClose();
    } catch (ex) {
      setError(ex instanceof Error ? ex.message : "Error al guardar la obra.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/45 p-0 sm:items-center sm:p-4">
      <div
        className="flex max-h-[94dvh] w-full max-w-3xl flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="nueva-obra-title"
      >
        <div className="flex shrink-0 items-start justify-between border-b border-zinc-100 px-5 py-4 sm:px-6">
          <div className="flex min-w-0 items-start gap-3">
            <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-violet-600 text-white">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                />
              </svg>
            </span>
            <div>
              <h2 id="nueva-obra-title" className="text-lg font-bold text-zinc-900 sm:text-xl">
                Nueva obra
              </h2>
              <p className="mt-0.5 text-sm text-zinc-500">Registra una nueva obra en el catálogo.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="rounded-xl p-2 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
            aria-label="Cerrar"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 sm:px-6">
            <div className="grid gap-6 lg:grid-cols-2">
              <section>
                <SectionTitle n={1} title="Información general" />
                <div className="grid gap-3">
                  <Field label="Nombre de la obra" required>
                    <input
                      required
                      value={form.name}
                      onChange={(e) => set("name", e.target.value)}
                      placeholder="Ej. Edificio Corporativo GDL"
                      className={inputCls}
                    />
                  </Field>
                  <Field label="Clave / Código interno" required>
                    <input
                      required
                      value={form.code}
                      onChange={(e) => set("code", e.target.value.toUpperCase())}
                      placeholder="Ej. OBR-2026-017"
                      className={inputCls}
                    />
                  </Field>
                  <Field label="Tipo de obra" required>
                    <select
                      required
                      value={form.obraType}
                      onChange={(e) => set("obraType", e.target.value)}
                      className={inputCls}
                    >
                      <option value="">Selecciona un tipo de obra</option>
                      {OBRA_TYPES.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="Fecha de inicio">
                      <input
                        type="date"
                        value={form.startDate}
                        onChange={(e) => set("startDate", e.target.value)}
                        className={inputCls}
                      />
                    </Field>
                    <Field label="Fecha estimada de término">
                      <input
                        type="date"
                        value={form.estimatedEndDate}
                        onChange={(e) => set("estimatedEndDate", e.target.value)}
                        className={inputCls}
                      />
                    </Field>
                  </div>
                  <Field label="Descripción (opcional)">
                    <textarea
                      rows={3}
                      value={form.description}
                      onChange={(e) => set("description", e.target.value)}
                      placeholder="Agrega una descripción general de la obra…"
                      className={`${inputCls} min-h-[5rem] resize-y py-2.5`}
                    />
                  </Field>
                </div>
              </section>

              <section>
                <SectionTitle n={2} title="Ubicación" />
                <div className="grid gap-3">
                  <Field label="Estado" required>
                    <select
                      required
                      value={form.state}
                      onChange={(e) => set("state", e.target.value)}
                      className={inputCls}
                    >
                      <option value="">Selecciona un estado</option>
                      {MEXICAN_STATES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Municipio" required>
                    <input
                      required
                      value={form.city}
                      onChange={(e) => set("city", e.target.value)}
                      placeholder="Selecciona un municipio"
                      className={inputCls}
                    />
                  </Field>
                  <Field label="Dirección" required>
                    <input
                      required
                      value={form.street}
                      onChange={(e) => set("street", e.target.value)}
                      placeholder="Calle, número exterior e interior"
                      className={inputCls}
                    />
                  </Field>
                  <Field label="Colonia (opcional)">
                    <input
                      value={form.neighborhood}
                      onChange={(e) => set("neighborhood", e.target.value)}
                      placeholder="Selecciona una colonia"
                      className={inputCls}
                    />
                  </Field>
                  <Field label="Código postal (opcional)">
                    <input
                      value={form.zipCode}
                      onChange={(e) => set("zipCode", e.target.value.replace(/\D/g, "").slice(0, 5))}
                      placeholder="Ej. 44100"
                      className={inputCls}
                      inputMode="numeric"
                    />
                  </Field>
                </div>
              </section>
            </div>

            {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
          </div>

          <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-zinc-100 px-5 py-4 sm:px-6">
            <button type="button" onClick={onClose} disabled={busy} className="btn-ghost min-h-11 px-5 text-sm">
              Cancelar
            </button>
            <button type="submit" disabled={busy} className="btn-primary min-h-11 px-6 text-sm">
              {busy ? "Guardando…" : "Guardar obra"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
