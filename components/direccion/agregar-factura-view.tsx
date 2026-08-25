"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AgregarFacturaCommitmentsList } from "@/components/direccion/agregar-factura-commitments-list";
import { ExpedienteCombobox } from "@/components/expedientes/expediente-combobox";
import { NuevoExpedienteModal } from "@/components/expedientes/nuevo-expediente-modal";
import { SupplierCombobox } from "@/components/ui/supplier-combobox";
import { DireccionHomeSidebar } from "@/components/dashboard/direccion-home-sidebar";
import { LoadingScreen } from "@/components/ui/loading-screen";
import { useFeedback } from "@/components/ui/feedback-provider";
import { usePageRefreshRegister } from "@/components/app-shell";
import {
  agregarFacturaKpis,
  invoiceFirstAlerts,
  type AgregarFacturaKpiKey,
} from "@/lib/dashboard/direccion-proceso-c-dashboard";
import type {
  InvoiceFirstCommitmentDto,
  MovementDto,
  ObraDto,
  PendingMovementDto,
  PurchaseOrderDto,
  SupplierDto,
} from "@/lib/domain/types";
import { parseAmountInput, sanitizeAmountInput } from "@/lib/format";

const inputCls =
  "block w-full min-h-11 rounded-xl border border-zinc-200 bg-white px-3 text-sm shadow-sm focus:border-violet-300 focus:outline-none focus:ring-1 focus:ring-violet-200";

const CURRENCIES = ["MXN", "USD"] as const;

const EMPTY_FORM = {
  supplierId: "",
  supplierName: "",
  obraId: "",
  invoiceFolio: "",
  invoiceDate: "",
  totalAmount: "",
  currency: "MXN",
  comment: "",
};

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

function SummaryCard({
  label,
  value,
  accent,
  iconBg,
  active,
  onClick,
}: {
  label: string;
  value: number;
  accent: string;
  iconBg: string;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full rounded-2xl border border-l-4 p-4 text-left shadow-sm transition hover:shadow-md ${accent} ${
        active ? "ring-2 ring-violet-400 ring-offset-1" : "border-zinc-200/80"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <span className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${iconBg}`}>
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
        </span>
        <span className="text-2xl font-bold tabular-nums text-zinc-900">{value}</span>
      </div>
      <p className="mt-2 text-xs font-semibold leading-snug text-zinc-800">{label}</p>
      <p className="mt-1 text-[11px] font-medium text-violet-700">Ver listado →</p>
    </button>
  );
}

export function AgregarFacturaView() {
  const register = usePageRefreshRegister();
  const { showSuccess, showError } = useFeedback();
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState(EMPTY_FORM);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [expedienteId, setExpedienteId] = useState("");
  const [nuevoExpedienteOpen, setNuevoExpedienteOpen] = useState(false);
  const [obras, setObras] = useState<ObraDto[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierDto[]>([]);
  const [orders, setOrders] = useState<PurchaseOrderDto[]>([]);
  const [commitments, setCommitments] = useState<InvoiceFirstCommitmentDto[]>([]);
  const [recentMovements, setRecentMovements] = useState<MovementDto[]>([]);
  const [pendingMovements, setPendingMovements] = useState<PendingMovementDto[]>([]);
  const [activeKpi, setActiveKpi] = useState<AgregarFacturaKpiKey | null>("pendientes");

  const load = useCallback(async () => {
    const [oRes, sRes, ordRes, invRes, recentRes, pendingRes] = await Promise.all([
      fetch("/api/obras", { credentials: "include" }),
      fetch("/api/suppliers", { credentials: "include" }),
      fetch("/api/orders", { credentials: "include" }),
      fetch("/api/invoice-first-commitments?includeAll=1", { credentials: "include" }),
      fetch("/api/movimientos?vista=recientes&limit=5", { credentials: "include" }),
      fetch("/api/movimientos?vista=pendientes&limit=5", { credentials: "include" }),
    ]);
    if (oRes.ok) {
      const d = (await oRes.json()) as { obras: ObraDto[] };
      setObras(d.obras.filter((o) => o.active));
    }
    if (sRes.ok) {
      const d = (await sRes.json()) as { suppliers: SupplierDto[] };
      setSuppliers(d.suppliers);
    }
    if (ordRes.ok) {
      const d = (await ordRes.json()) as { orders: PurchaseOrderDto[] };
      setOrders(d.orders);
    }
    if (invRes.ok) {
      const d = (await invRes.json()) as { commitments: InvoiceFirstCommitmentDto[] };
      setCommitments(d.commitments);
    }
    if (recentRes.ok) {
      const d = (await recentRes.json()) as { recent: MovementDto[] };
      setRecentMovements(d.recent);
    }
    if (pendingRes.ok) {
      const d = (await pendingRes.json()) as { pending: PendingMovementDto[] };
      setPendingMovements(d.pending);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
    register(() => void load());
  }, [load, register]);

  const kpis = useMemo(() => agregarFacturaKpis(commitments), [commitments]);
  const extraAlerts = useMemo(() => invoiceFirstAlerts(commitments), [commitments]);

  function selectKpi(key: AgregarFacturaKpiKey) {
    const next = activeKpi === key ? null : key;
    setActiveKpi(next);
    if (next) {
      window.setTimeout(() => {
        document.getElementById("agregar-factura-lista")?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 50);
    }
  }

  function resetForm(keepExpediente = false) {
    setForm({ ...EMPTY_FORM, invoiceDate: new Date().toISOString().slice(0, 10) });
    setPdfFile(null);
    if (!keepExpediente) setExpedienteId("");
    setError("");
  }

  useEffect(() => {
    resetForm();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!form.supplierId && !form.supplierName.trim()) {
      setError("Selecciona un proveedor.");
      return;
    }
    if (!form.invoiceFolio.trim()) {
      setError("Indica el número de factura.");
      return;
    }
    if (!form.invoiceDate) {
      setError("Indica la fecha de factura.");
      return;
    }
    if (!pdfFile) {
      setError("Adjunta el PDF de la factura.");
      return;
    }
    if (!expedienteId) {
      setError("Selecciona o crea el expediente donde se guardará esta factura.");
      return;
    }
    const amount = parseAmountInput(form.totalAmount);
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
          supplierId: form.supplierId || null,
          supplierName: form.supplierName.trim(),
          obraId: form.obraId || null,
          invoiceFolio: form.invoiceFolio.trim(),
          totalAmount: amount,
          currency: form.currency,
          invoiceDate: form.invoiceDate,
          comment: form.comment.trim(),
          expedienteId: expedienteId || null,
        }),
      });
      const data = (await res.json()) as { commitment?: { id: string; invoiceFolio: string }; error?: string };
      if (!res.ok || !data.commitment) {
        throw new Error(data.error ?? "No se pudo registrar la solicitud.");
      }

      const fd = new FormData();
      fd.set("commitmentId", data.commitment.id);
      fd.set("file", pdfFile);
      const up = await fetch("/api/invoice-first-files/upload", { method: "POST", credentials: "include", body: fd });
      const upData = (await up.json()) as { error?: string };
      if (!up.ok) throw new Error(upData.error ?? "Error al subir el PDF.");

      showSuccess(
        `Solicitud ${data.commitment.invoiceFolio} registrada en el expediente. Puedes agregar otra factura al mismo expediente abajo.`
      );
      resetForm(true);
      setActiveKpi("pendientes");
      await load();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error al guardar.";
      setError(msg);
      showError(msg);
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <LoadingScreen message="Cargando Agregar Factura" />;

  return (
    <div className="flex flex-col gap-4 pb-6">
      <NuevoExpedienteModal
        open={nuevoExpedienteOpen}
        onClose={() => setNuevoExpedienteOpen(false)}
        obras={obras}
        onSaved={(e) => {
          setExpedienteId(e.id);
          setNuevoExpedienteOpen(false);
        }}
      />
      <header>
        <h1 className="text-2xl font-bold text-zinc-900 sm:text-3xl">Agregar Factura</h1>
        <p className="mt-1 text-sm text-zinc-600">
          Solicita la apertura de un expediente a partir de una factura cuando no existe Orden de Compra.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <SummaryCard
          label="Facturas pendientes de abrir expediente"
          value={kpis.pendientesExpediente}
          accent="border-l-violet-400 bg-violet-50/35"
          iconBg="bg-violet-100 text-violet-800"
          active={activeKpi === "pendientes"}
          onClick={() => selectKpi("pendientes")}
        />
        <SummaryCard
          label="Solicitudes registradas este mes"
          value={kpis.aprobadasMes}
          accent="border-l-orange-400 bg-orange-50/40"
          iconBg="bg-orange-100 text-orange-700"
          active={activeKpi === "mes"}
          onClick={() => selectKpi("mes")}
        />
        <SummaryCard
          label="Facturas rechazadas"
          value={kpis.rechazadas}
          accent="border-l-sky-400 bg-sky-50/35"
          iconBg="bg-sky-100 text-sky-800"
          active={activeKpi === "rechazadas"}
          onClick={() => selectKpi("rechazadas")}
        />
      </div>

      {activeKpi && (
        <AgregarFacturaCommitmentsList
          kpiKey={activeKpi}
          commitments={commitments}
          onClose={() => setActiveKpi(null)}
          onMutated={() => void load()}
        />
      )}

      <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-[minmax(0,1fr)_17.5rem] 2xl:grid-cols-[minmax(0,1fr)_19rem]">
        <section className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm sm:p-5">
          <h2 className="text-base font-bold text-zinc-900">Nueva solicitud de factura</h2>

          <form onSubmit={(e) => void handleSubmit(e)} className="mt-4 grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,14rem)_1fr]">
            <div
              className="flex min-h-[12rem] flex-col items-center justify-center rounded-2xl border-2 border-dashed border-zinc-200 bg-zinc-50/60 px-4 py-6 text-center"
              onDragOver={(ev) => ev.preventDefault()}
              onDrop={(ev) => {
                ev.preventDefault();
                const f = ev.dataTransfer.files[0];
                if (f) setPdfFile(f);
              }}
            >
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-violet-100 text-violet-700">
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              </span>
              <p className="mt-3 text-sm font-semibold text-zinc-800">Subir factura (PDF)</p>
              <p className="mt-1 text-xs text-zinc-500">Arrastra tu archivo aquí o selecciona</p>
              <input
                type="file"
                accept=".pdf,application/pdf"
                className="sr-only"
                id="agregar-factura-pdf"
                onChange={(ev) => setPdfFile(ev.target.files?.[0] ?? null)}
              />
              <label
                htmlFor="agregar-factura-pdf"
                className="mt-3 cursor-pointer rounded-lg border border-violet-200 bg-violet-50 px-3 py-1.5 text-xs font-semibold text-violet-800 hover:bg-violet-100"
              >
                Seleccionar archivo
              </label>
              {pdfFile && <p className="mt-2 text-xs font-medium text-violet-800">{pdfFile.name}</p>}
            </div>

            <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Proveedor" required>
                <SupplierCombobox
                  suppliers={suppliers}
                  value={form.supplierId}
                  onChange={(id, s) =>
                    setForm((f) => ({ ...f, supplierId: id, supplierName: s?.displayName ?? "" }))
                  }
                  placeholder="Selecciona un proveedor"
                />
              </Field>
              <Field label="Obra">
                <select
                  className={inputCls}
                  value={form.obraId}
                  onChange={(e) => setForm((f) => ({ ...f, obraId: e.target.value }))}
                >
                  <option value="">Selecciona una obra</option>
                  {obras.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Número de factura" required>
                <input
                  className={inputCls}
                  placeholder="Ej: FACT-1258"
                  value={form.invoiceFolio}
                  onChange={(e) => setForm((f) => ({ ...f, invoiceFolio: e.target.value }))}
                />
              </Field>
              <Field label="Fecha de factura" required>
                <input
                  type="date"
                  className={inputCls}
                  value={form.invoiceDate}
                  onChange={(e) => setForm((f) => ({ ...f, invoiceDate: e.target.value }))}
                />
              </Field>
              <Field label="Monto total" required>
                <input
                  className={`${inputCls} tabular-nums`}
                  inputMode="decimal"
                  placeholder="Ej: 0.00"
                  value={form.totalAmount}
                  onChange={(e) => setForm((f) => ({ ...f, totalAmount: sanitizeAmountInput(e.target.value) }))}
                />
              </Field>
              <Field label="Moneda" required>
                <select
                  className={inputCls}
                  value={form.currency}
                  onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value }))}
                >
                  {CURRENCIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </Field>
              <div className="sm:col-span-2">
                <ExpedienteCombobox
                  value={expedienteId}
                  onChange={(id) => setExpedienteId(id)}
                  required
                  allowCreate
                  onCreateClick={() => setNuevoExpedienteOpen(true)}
                  label="Expediente (contenedor)"
                />
                <p className="mt-1 text-xs text-zinc-500">
                  La factura quedará visible en la página individual de este expediente.
                </p>
              </div>
              <div className="sm:col-span-2">
                <Field label="Comentarios">
                  <textarea
                    className={`${inputCls} min-h-[5rem] resize-y`}
                    rows={3}
                    placeholder="Información adicional (opcional)"
                    value={form.comment}
                    onChange={(e) => setForm((f) => ({ ...f, comment: e.target.value }))}
                  />
                </Field>
              </div>
            </div>

            {error && (
              <p className="lg:col-span-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
                {error}
              </p>
            )}

            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end lg:col-span-2">
              <button type="button" className="btn-secondary min-h-11" onClick={resetForm} disabled={busy}>
                Limpiar
              </button>
              <button
                type="submit"
                className="btn-primary min-h-11 bg-violet-700 hover:bg-violet-800"
                disabled={busy}
              >
                {busy ? "Enviando…" : "Solicitar apertura"}
              </button>
            </div>
          </form>
        </section>

        <DireccionHomeSidebar
          orders={orders}
          recentMovements={recentMovements}
          pendingMovements={pendingMovements}
          sticky
          extraAlerts={extraAlerts}
        />
      </div>
    </div>
  );
}
