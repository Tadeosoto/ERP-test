"use client";

import { useState } from "react";
import type { SupplierDto } from "@/lib/domain/types";

export type ProveedorFormData = {
  legalName: string;
  rfc: string;
  commercialName: string;
  taxRegime: string;
  phone: string;
  email: string;
  website: string;
  street: string;
  neighborhood: string;
  zipCode: string;
  city: string;
  state: string;
  country: string;
  primaryContact: string;
  notes: string;
};

const EMPTY: ProveedorFormData = {
  legalName: "",
  rfc: "",
  commercialName: "",
  taxRegime: "",
  phone: "",
  email: "",
  website: "",
  street: "",
  neighborhood: "",
  zipCode: "",
  city: "",
  state: "",
  country: "México",
  primaryContact: "",
  notes: "",
};

const MEXICAN_STATES = [
  "Aguascalientes",
  "Baja California",
  "Baja California Sur",
  "Campeche",
  "Chiapas",
  "Chihuahua",
  "Ciudad de México",
  "Coahuila",
  "Colima",
  "Durango",
  "Estado de México",
  "Guanajuato",
  "Guerrero",
  "Hidalgo",
  "Jalisco",
  "Michoacán",
  "Morelos",
  "Nayarit",
  "Nuevo León",
  "Oaxaca",
  "Puebla",
  "Querétaro",
  "Quintana Roo",
  "San Luis Potosí",
  "Sinaloa",
  "Sonora",
  "Tabasco",
  "Tamaulipas",
  "Tlaxcala",
  "Veracruz",
  "Yucatán",
  "Zacatecas",
];

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
    <label className="block">
      <span className="text-sm font-medium text-zinc-800">
        {label}
        {required && <span className="text-red-500"> *</span>}
      </span>
      <div className="mt-1.5">{children}</div>
    </label>
  );
}

const inputCls =
  "block w-full min-h-11 rounded-xl border border-zinc-200 bg-white px-3 text-sm shadow-sm focus:border-orange-300 focus:outline-none focus:ring-1 focus:ring-orange-200";

export function ProveedorModal({
  open,
  onClose,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: (supplier: SupplierDto) => void;
}) {
  const [form, setForm] = useState<ProveedorFormData>(EMPTY);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  if (!open) return null;

  function set<K extends keyof ProveedorFormData>(key: K, value: ProveedorFormData[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/suppliers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(form),
      });
      const data = (await res.json()) as { supplier?: SupplierDto; error?: string };
      if (!res.ok || !data.supplier) throw new Error(data.error ?? "Error al guardar proveedor.");
      onSaved(data.supplier);
      setForm(EMPTY);
      onClose();
    } catch (ex) {
      setError(ex instanceof Error ? ex.message : "Error al guardar proveedor.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
      <div
        className="flex max-h-[90dvh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="proveedor-modal-title"
      >
        <div className="flex shrink-0 items-start justify-between border-b border-zinc-100 px-5 py-4">
          <div>
            <h2 id="proveedor-modal-title" className="text-lg font-bold text-zinc-900">
              Nuevo proveedor
            </h2>
            <p className="mt-0.5 text-sm text-zinc-500">Registra la información del proveedor.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
            aria-label="Cerrar"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={submit} className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          <div className="space-y-6">
            <section>
              <h3 className="mb-3 text-sm font-semibold text-zinc-900">Información general</h3>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Nombre o razón social" required>
                  <input
                    required
                    value={form.legalName}
                    onChange={(e) => set("legalName", e.target.value)}
                    placeholder="Ej. Inalum S.A. de C.V."
                    className={inputCls}
                  />
                </Field>
                <Field label="RFC" required>
                  <input
                    required
                    value={form.rfc}
                    onChange={(e) => set("rfc", e.target.value.toUpperCase())}
                    placeholder="Ej. INA123456B12"
                    className={inputCls}
                  />
                </Field>
                <Field label="Nombre comercial (opcional)">
                  <input
                    value={form.commercialName}
                    onChange={(e) => set("commercialName", e.target.value)}
                    placeholder="Ej. Inalum"
                    className={inputCls}
                  />
                </Field>
                <Field label="Régimen fiscal">
                  <input
                    value={form.taxRegime}
                    onChange={(e) => set("taxRegime", e.target.value)}
                    placeholder="Selecciona un régimen"
                    className={inputCls}
                  />
                </Field>
                <Field label="Teléfono">
                  <input
                    value={form.phone}
                    onChange={(e) => set("phone", e.target.value)}
                    placeholder="Ej. 55 1234 5678"
                    className={inputCls}
                  />
                </Field>
                <Field label="Correo electrónico">
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => set("email", e.target.value)}
                    placeholder="Ej. contacto@inalum.com"
                    className={inputCls}
                  />
                </Field>
                <Field label="Sitio web (opcional)">
                  <input
                    value={form.website}
                    onChange={(e) => set("website", e.target.value)}
                    placeholder="Ej. www.inalum.com"
                    className={`${inputCls} sm:col-span-2`}
                  />
                </Field>
              </div>
            </section>

            <section>
              <h3 className="mb-3 text-sm font-semibold text-zinc-900">Dirección fiscal</h3>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Calle y número" required>
                  <input
                    required
                    value={form.street}
                    onChange={(e) => set("street", e.target.value)}
                    placeholder="Ej. Av. Insurgentes Sur 1234"
                    className={`${inputCls} sm:col-span-2`}
                  />
                </Field>
                <Field label="Colonia" required>
                  <input
                    required
                    value={form.neighborhood}
                    onChange={(e) => set("neighborhood", e.target.value)}
                    placeholder="Ej. Del Valle"
                    className={inputCls}
                  />
                </Field>
                <Field label="Código postal" required>
                  <input
                    required
                    value={form.zipCode}
                    onChange={(e) => set("zipCode", e.target.value)}
                    placeholder="Ej. 03100"
                    className={inputCls}
                  />
                </Field>
                <Field label="Ciudad" required>
                  <input
                    required
                    value={form.city}
                    onChange={(e) => set("city", e.target.value)}
                    placeholder="Ej. Benito Juárez"
                    className={inputCls}
                  />
                </Field>
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
                <Field label="País" required>
                  <select
                    value={form.country}
                    onChange={(e) => set("country", e.target.value)}
                    className={inputCls}
                  >
                    <option value="México">México</option>
                  </select>
                </Field>
              </div>
            </section>

            <section>
              <h3 className="mb-3 text-sm font-semibold text-zinc-900">
                Información adicional (opcional)
              </h3>
              <div className="grid gap-3">
                <Field label="Contacto principal">
                  <input
                    value={form.primaryContact}
                    onChange={(e) => set("primaryContact", e.target.value)}
                    placeholder="Ej. Juan Pérez"
                    className={inputCls}
                  />
                </Field>
                <Field label="Notas">
                  <textarea
                    value={form.notes}
                    onChange={(e) => set("notes", e.target.value)}
                    rows={3}
                    placeholder="Notas adicionales sobre el proveedor…"
                    className={`${inputCls} py-2`}
                  />
                </Field>
              </div>
            </section>
          </div>

          {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

          <div className="mt-6 flex justify-end gap-3 border-t border-zinc-100 pt-4">
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancelar
            </button>
            <button type="submit" disabled={busy} className="btn-primary">
              Guardar proveedor
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
