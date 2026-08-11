"use client";

import { useEffect, useState } from "react";
import { useFeedback } from "@/components/ui/feedback-provider";
import type { SupplierDto } from "@/lib/domain/types";

export type ProveedorFormData = {
  legalName: string;
  rfc: string;
  commercialName: string;
  taxRegime: string;
  giro: string;
  phone: string;
  altPhone: string;
  email: string;
  website: string;
  street: string;
  neighborhood: string;
  zipCode: string;
  city: string;
  state: string;
  country: string;
  addressReferences: string;
  primaryContact: string;
  paymentTerms: string;
  preferredCurrency: string;
  notes: string;
};

const EMPTY: ProveedorFormData = {
  legalName: "",
  rfc: "",
  commercialName: "",
  taxRegime: "",
  giro: "",
  phone: "",
  altPhone: "",
  email: "",
  website: "",
  street: "",
  neighborhood: "",
  zipCode: "",
  city: "",
  state: "",
  country: "México",
  addressReferences: "",
  primaryContact: "",
  paymentTerms: "",
  preferredCurrency: "",
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

const TAX_REGIMES = [
  "601 - General de Ley Personas Morales",
  "603 - Personas Morales con Fines no Lucrativos",
  "605 - Sueldos y Salarios e Ingresos Asimilados a Salarios",
  "606 - Arrendamiento",
  "612 - Personas Físicas con Actividades Empresariales y Profesionales",
  "616 - Sin obligaciones fiscales",
  "626 - Régimen Simplificado de Confianza",
];

const PAYMENT_TERMS = ["Contado", "15 días", "30 días", "45 días", "60 días", "90 días", "Indefinida"];

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

function buildNotes(form: ProveedorFormData): string {
  const lines: string[] = [];
  if (form.giro.trim()) lines.push(`Giro: ${form.giro.trim()}`);
  if (form.altPhone.trim()) lines.push(`Teléfono alterno: ${form.altPhone.trim()}`);
  if (form.paymentTerms.trim()) lines.push(`Condiciones de pago: ${form.paymentTerms.trim()}`);
  if (form.preferredCurrency.trim()) lines.push(`Moneda preferida: ${form.preferredCurrency.trim()}`);
  if (form.addressReferences.trim()) lines.push(`Referencias: ${form.addressReferences.trim()}`);
  if (form.notes.trim()) lines.push(form.notes.trim());
  return lines.join("\n");
}

function toApiPayload(form: ProveedorFormData, active?: boolean) {
  const payload: Record<string, string | boolean> = {
    legalName: form.legalName,
    rfc: form.rfc,
    commercialName: form.commercialName,
    taxRegime: form.taxRegime,
    phone: form.phone,
    email: form.email,
    website: form.website,
    street: form.street,
    neighborhood: form.neighborhood,
    zipCode: form.zipCode,
    city: form.city,
    state: form.state,
    country: form.country,
    primaryContact: form.primaryContact,
    notes: buildNotes(form),
  };
  if (active !== undefined) payload.active = active;
  return payload;
}

function supplierToForm(s: SupplierDto): { form: ProveedorFormData; active: boolean } {
  const form: ProveedorFormData = {
    ...EMPTY,
    legalName: s.legalName,
    rfc: s.rfc,
    commercialName: s.commercialName,
    taxRegime: s.taxRegime,
    phone: s.phone,
    email: s.email,
    website: s.website,
    street: s.street,
    neighborhood: s.neighborhood,
    zipCode: s.zipCode,
    city: s.city,
    state: s.state,
    country: s.country || "México",
    primaryContact: s.primaryContact,
    notes: "",
  };

  const freeNotes: string[] = [];
  for (const line of s.notes.split("\n")) {
    if (line.startsWith("Giro: ")) form.giro = line.slice(6);
    else if (line.startsWith("Teléfono alterno: ")) form.altPhone = line.slice(19);
    else if (line.startsWith("Condiciones de pago: ")) form.paymentTerms = line.slice(21);
    else if (line.startsWith("Moneda preferida: ")) form.preferredCurrency = line.slice(18);
    else if (line.startsWith("Referencias: ")) form.addressReferences = line.slice(13);
    else if (line.trim()) freeNotes.push(line);
  }
  form.notes = freeNotes.join("\n");

  return { form, active: s.active };
}

export function ProveedorModal({
  open,
  onClose,
  onSaved,
  initialSupplier = null,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: (supplier: SupplierDto) => void;
  initialSupplier?: SupplierDto | null;
}) {
  const { showSuccess } = useFeedback();
  const [form, setForm] = useState<ProveedorFormData>(EMPTY);
  const [active, setActive] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const isEdit = Boolean(initialSupplier);

  useEffect(() => {
    if (open) {
      if (initialSupplier) {
        const loaded = supplierToForm(initialSupplier);
        setForm(loaded.form);
        setActive(loaded.active);
      } else {
        setForm(EMPTY);
        setActive(true);
      }
      setError("");
    }
  }, [open, initialSupplier]);

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

  function set<K extends keyof ProveedorFormData>(key: K, value: ProveedorFormData[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const url = isEdit ? `/api/suppliers/${initialSupplier!.id}` : "/api/suppliers";
      const method = isEdit ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(toApiPayload(form, isEdit ? active : undefined)),
      });
      const data = (await res.json()) as { supplier?: SupplierDto; error?: string };
      if (!res.ok || !data.supplier) throw new Error(data.error ?? "Error al guardar proveedor.");
      showSuccess(isEdit ? "Proveedor actualizado." : "Proveedor registrado en el catálogo.");
      onSaved(data.supplier);
      setForm(EMPTY);
      setActive(true);
      onClose();
    } catch (ex) {
      setError(ex instanceof Error ? ex.message : "Error al guardar proveedor.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/45 p-0 sm:items-center sm:p-4">
      <div
        className="flex max-h-[94dvh] w-full max-w-4xl flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="proveedor-modal-title"
      >
        <div className="flex shrink-0 items-start justify-between border-b border-zinc-100 px-5 py-4 sm:px-6">
          <div className="flex min-w-0 items-start gap-3">
            <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
                />
              </svg>
            </span>
            <div>
              <h2 id="proveedor-modal-title" className="text-lg font-bold text-zinc-900 sm:text-xl">
                {isEdit ? "Editar proveedor" : "Nuevo proveedor"}
              </h2>
              <p className="mt-0.5 text-sm text-zinc-500">
                {isEdit
                  ? "Actualiza los datos del proveedor en el catálogo."
                  : "Registra un nuevo proveedor en el catálogo."}
              </p>
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
            <section className="mb-6">
              <SectionTitle n={1} title="Información general" />
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Razón social" required className="sm:col-span-2">
                  <input
                    required
                    value={form.legalName}
                    onChange={(e) => set("legalName", e.target.value)}
                    placeholder="Nombre o razón social del proveedor"
                    className={inputCls}
                  />
                </Field>
                <Field label="Nombre comercial" className="sm:col-span-2">
                  <input
                    value={form.commercialName}
                    onChange={(e) => set("commercialName", e.target.value)}
                    placeholder="Nombre comercial (opcional)"
                    className={inputCls}
                  />
                </Field>
                <Field label="R.F.C." required>
                  <input
                    required
                    value={form.rfc}
                    onChange={(e) => set("rfc", e.target.value.toUpperCase())}
                    placeholder="Ej. XAXX010101000"
                    className={inputCls}
                  />
                </Field>
                <Field label="Régimen fiscal" required>
                  <select
                    required
                    value={form.taxRegime}
                    onChange={(e) => set("taxRegime", e.target.value)}
                    className={inputCls}
                  >
                    <option value="">Selecciona un régimen fiscal</option>
                    {TAX_REGIMES.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Giro o actividad" required className="sm:col-span-2">
                  <input
                    required
                    value={form.giro}
                    onChange={(e) => set("giro", e.target.value)}
                    placeholder="Ej. Materiales eléctricos"
                    className={inputCls}
                  />
                </Field>
              </div>
            </section>

            <div className="grid gap-6 lg:grid-cols-2">
              <div className="space-y-6">
                <section>
                  <SectionTitle n={2} title="Datos de contacto" />
                  <div className="grid gap-3">
                    <Field label="Contacto principal">
                      <input
                        value={form.primaryContact}
                        onChange={(e) => set("primaryContact", e.target.value)}
                        placeholder="Nombre de la persona de contacto"
                        className={inputCls}
                      />
                    </Field>
                    <Field label="Correo electrónico">
                      <input
                        type="email"
                        value={form.email}
                        onChange={(e) => set("email", e.target.value)}
                        placeholder="correo@proveedor.com"
                        className={inputCls}
                      />
                    </Field>
                    <Field label="Teléfono">
                      <input
                        value={form.phone}
                        onChange={(e) => set("phone", e.target.value)}
                        placeholder="Ej. 33 1234 5678"
                        className={inputCls}
                      />
                    </Field>
                    <Field label="Teléfono alterno">
                      <input
                        value={form.altPhone}
                        onChange={(e) => set("altPhone", e.target.value)}
                        placeholder="Ej. 33 8765 4321"
                        className={inputCls}
                      />
                    </Field>
                  </div>
                </section>

                <section>
                  <SectionTitle n={4} title="Información adicional" />
                  <div className="grid gap-3">
                    <Field label="Condiciones de pago">
                      <select
                        value={form.paymentTerms}
                        onChange={(e) => set("paymentTerms", e.target.value)}
                        className={inputCls}
                      >
                        <option value="">Selecciona condiciones de pago</option>
                        {PAYMENT_TERMS.map((t) => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Moneda preferida">
                      <select
                        value={form.preferredCurrency}
                        onChange={(e) => set("preferredCurrency", e.target.value)}
                        className={inputCls}
                      >
                        <option value="">Selecciona moneda</option>
                        <option value="MXN">MXN - Peso mexicano</option>
                        <option value="USD">USD - Dólar estadounidense</option>
                      </select>
                    </Field>
                    <Field label="Notas">
                      <textarea
                        value={form.notes}
                        onChange={(e) => set("notes", e.target.value)}
                        rows={3}
                        placeholder="Notas adicionales sobre el proveedor (opcional)"
                        className={`${inputCls} min-h-[5rem] resize-y py-2.5`}
                      />
                    </Field>
                  </div>
                </section>
              </div>

              <section>
                <SectionTitle n={3} title="Dirección fiscal" />
                <div className="grid gap-3">
                  <Field label="Código postal" required>
                    <div className="flex gap-2">
                      <input
                        required
                        value={form.zipCode}
                        onChange={(e) => set("zipCode", e.target.value.replace(/\D/g, "").slice(0, 5))}
                        placeholder="Ej. 44100"
                        className={inputCls}
                        inputMode="numeric"
                      />
                      <button
                        type="button"
                        className="shrink-0 rounded-xl border border-zinc-200 bg-zinc-50 px-3 text-xs font-semibold text-zinc-700 hover:bg-zinc-100"
                        onClick={() => {
                          if (form.zipCode.length !== 5) {
                            setError("Ingresa un código postal de 5 dígitos.");
                            return;
                          }
                          setError("");
                        }}
                      >
                        Buscar C.P.
                      </button>
                    </div>
                  </Field>
                  <Field label="Estado">
                    <select
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
                  <Field label="Municipio / Alcaldía">
                    <input
                      value={form.city}
                      onChange={(e) => set("city", e.target.value)}
                      placeholder="Selecciona un municipio"
                      className={inputCls}
                    />
                  </Field>
                  <Field label="Colonia">
                    <input
                      value={form.neighborhood}
                      onChange={(e) => set("neighborhood", e.target.value)}
                      placeholder="Selecciona una colonia"
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
                  <Field label="Referencias">
                    <input
                      value={form.addressReferences}
                      onChange={(e) => set("addressReferences", e.target.value)}
                      placeholder="Entre calles, puntos de referencia, etc. (opcional)"
                      className={inputCls}
                    />
                  </Field>
                </div>
              </section>
            </div>

            {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

            {isEdit && (
              <label className="mt-4 flex items-center gap-2 text-sm text-zinc-700">
                <input
                  type="checkbox"
                  checked={active}
                  onChange={(e) => setActive(e.target.checked)}
                  className="h-4 w-4 rounded border-zinc-300 text-orange-600 focus:ring-orange-200"
                />
                Proveedor activo en el catálogo
              </label>
            )}
          </div>

          <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-zinc-100 px-5 py-4 sm:px-6">
            <button type="button" onClick={onClose} disabled={busy} className="btn-ghost min-h-11 px-5 text-sm">
              Cancelar
            </button>
            <button type="submit" disabled={busy} className="btn-primary min-h-11 px-6 text-sm">
              {busy ? "Guardando…" : "Guardar proveedor"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
