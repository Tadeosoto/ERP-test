"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState, Suspense } from "react";
import { ProveedorModal } from "@/components/compras/proveedor-modal";
import { LoadingScreen } from "@/components/ui/loading-screen";
import { useFeedback } from "@/components/ui/feedback-provider";
import { useSession } from "@/components/session-provider";
import type { ObraDto, PurchaseOrderDto, SupplierDto, PaymentType } from "@/lib/domain/types";
import { COMPRAS_PAYMENT_OPTIONS } from "@/lib/domain/solicitudes";
import { formatDateShort, formatMoney } from "@/lib/format";

const PAYMENT_TERMS = [
  "Contado",
  "15 días",
  "30 días",
  "30 días después de recibir factura",
  "45 días",
  "60 días",
];

const MAX_PDF_BYTES = 20 * 1024 * 1024;

type Step = 1 | 2 | 3;

type EngineerOption = { id: string; name: string };

function Stepper({ step }: { step: Step }) {
  const steps = [
    { n: 1, title: "Datos generales", sub: "Información básica de la OC" },
    { n: 2, title: "Documento OC", sub: "Sube el PDF generado en CONTPAQi" },
    { n: 3, title: "Revisar y enviar", sub: "Enviar a aprobación" },
  ] as const;

  return (
    <ol className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      {steps.map((s) => {
        const done = step > s.n;
        const active = step === s.n;
        return (
          <li key={s.n} className="flex flex-1 items-start gap-3">
            <span
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                done
                  ? "bg-emerald-500 text-white"
                  : active
                    ? "bg-orange-600 text-white"
                    : "bg-zinc-100 text-zinc-400"
              }`}
            >
              {done ? (
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                s.n
              )}
            </span>
            <div className="min-w-0 pt-0.5">
              <p className={`text-sm font-semibold ${active ? "text-orange-700" : "text-zinc-800"}`}>
                {s.title}
              </p>
              <p className="text-xs text-zinc-500">{s.sub}</p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function SummaryPanel({
  obraName,
  supplierLabel,
  ocDate,
  paymentTerms,
  currency,
  totalAmount,
  hasPdf,
  statusLabel,
  nextStatus,
  nextRole,
}: {
  obraName: string;
  supplierLabel: string;
  ocDate: string;
  paymentTerms: string;
  currency: string;
  totalAmount: number;
  hasPdf: boolean;
  statusLabel: string;
  nextStatus?: string;
  nextRole?: string;
}) {
  return (
    <aside className="card shrink-0 p-5 lg:w-72 xl:w-80">
      <h3 className="text-sm font-bold text-zinc-900">Resumen de la OC</h3>
      <dl className="mt-4 space-y-3 text-sm">
        <div>
          <dt className="text-xs text-zinc-500">Obra</dt>
          <dd className="font-medium text-zinc-800">{obraName || "—"}</dd>
        </div>
        <div>
          <dt className="text-xs text-zinc-500">Proveedor</dt>
          <dd className="font-medium text-zinc-800">{supplierLabel || "—"}</dd>
        </div>
        <div>
          <dt className="text-xs text-zinc-500">Fecha de la OC</dt>
          <dd className="font-medium text-zinc-800">{ocDate ? formatDateShort(ocDate) : "—"}</dd>
        </div>
        <div>
          <dt className="text-xs text-zinc-500">Condiciones de pago</dt>
          <dd className="font-medium text-zinc-800">{paymentTerms || "—"}</dd>
        </div>
        <div>
          <dt className="text-xs text-zinc-500">Moneda</dt>
          <dd className="font-medium text-zinc-800">{currency === "MXN" ? "MXN — Peso mexicano" : currency}</dd>
        </div>
      </dl>
      <div className="mt-4 rounded-xl bg-orange-50 px-4 py-3">
        <p className="text-xs text-zinc-500">Total estimado</p>
        <p className="text-2xl font-bold tabular-nums text-orange-700">
          {totalAmount > 0 ? formatMoney(totalAmount, currency) : "$0.00"}
        </p>
        {totalAmount <= 0 && (
          <p className="mt-1 text-xs text-zinc-500">Se captura al registrar el PDF en el paso 2</p>
        )}
      </div>
      <div className="mt-4 space-y-2 border-t border-orange-50 pt-4 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-zinc-600">Documento PDF</span>
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-semibold ${hasPdf ? "bg-emerald-100 text-emerald-800" : "bg-zinc-100 text-zinc-500"}`}
          >
            {hasPdf ? "Cargado" : "Pendiente"}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-zinc-600">Estado actual</span>
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">
            {statusLabel}
          </span>
        </div>
      </div>
      {nextStatus && (
        <div className="mt-4 space-y-2 rounded-xl border border-teal-100 bg-teal-50/50 p-3 text-xs">
          <p className="font-semibold text-teal-900">¿Qué sigue?</p>
          <div className="flex flex-col items-center gap-1 text-center">
            <span className="rounded-lg bg-amber-100 px-3 py-1 font-semibold text-amber-900">{statusLabel}</span>
            <span className="text-zinc-400">↓</span>
            <span className="rounded-lg bg-sky-100 px-3 py-1 font-semibold text-sky-900">{nextStatus}</span>
            {nextRole && (
              <>
                <span className="text-zinc-400">↓</span>
                <span className="rounded-lg bg-emerald-100 px-3 py-1 font-semibold text-emerald-900">
                  {nextRole}
                </span>
              </>
            )}
          </div>
        </div>
      )}
    </aside>
  );
}

export default function NuevaOrdenPage() {
  return (
    <Suspense fallback={<LoadingScreen message="Cargando formulario" />}>
      <NuevaOcWizard />
    </Suspense>
  );
}

function NuevaOcWizard() {
  const { user } = useSession();
  const { showSuccess, showError } = useFeedback();
  const router = useRouter();
  const searchParams = useSearchParams();
  const resumeOrderId = searchParams.get("orderId");
  const solicitudIdParam = searchParams.get("solicitudId");
  const initialStep = (Number(searchParams.get("step")) || 1) as Step;

  const [step, setStep] = useState<Step>(initialStep >= 1 && initialStep <= 3 ? initialStep : 1);
  const [obras, setObras] = useState<ObraDto[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierDto[]>([]);
  const [engineers, setEngineers] = useState<EngineerOption[]>([]);
  const [orderId, setOrderId] = useState<string | null>(resumeOrderId);
  const [order, setOrder] = useState<PurchaseOrderDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [proveedorOpen, setProveedorOpen] = useState(false);

  const [obraId, setObraId] = useState("");
  const [supplierId, setSupplierId] = useState("");
  const [supplierName, setSupplierName] = useState("");
  const [ocDate, setOcDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [paymentTerms, setPaymentTerms] = useState("30 días");
  const [description, setDescription] = useState("");
  const [internalReference, setInternalReference] = useState("");
  const [ocFolio, setOcFolio] = useState("");
  const [totalAmount, setTotalAmount] = useState("");
  const [currency, setCurrency] = useState("MXN");
  const [documentDate, setDocumentDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [uploadedPdf, setUploadedPdf] = useState<{ name: string; size: number; at: string } | null>(null);
  const [assignedEngineerId, setAssignedEngineerId] = useState("");
  const [paymentModality, setPaymentModality] = useState<PaymentType>("programado");
  const [materialRequestId, setMaterialRequestId] = useState<string | null>(solicitudIdParam);
  const [solicitudBanner, setSolicitudBanner] = useState("");
  const [history, setHistory] = useState<{ at: string; text: string }[]>([]);

  const obraName = useMemo(() => obras.find((o) => o.id === obraId)?.name ?? "", [obras, obraId]);
  const supplierLabel = useMemo(() => {
    const s = suppliers.find((x) => x.id === supplierId);
    if (s) return s.displayName;
    return supplierName;
  }, [suppliers, supplierId, supplierName]);

  const loadCatalogs = useCallback(async () => {
    const [oRes, sRes, uRes] = await Promise.all([
      fetch("/api/obras", { credentials: "include" }),
      fetch("/api/suppliers", { credentials: "include" }),
      fetch("/api/users?role=ingeniero", { credentials: "include" }),
    ]);
    if (oRes.ok) {
      const d = (await oRes.json()) as { obras: ObraDto[] };
      setObras(d.obras.filter((o) => o.active));
    }
    if (sRes.ok) {
      const d = (await sRes.json()) as { suppliers: SupplierDto[] };
      setSuppliers(d.suppliers);
    }
    if (uRes.ok) {
      const d = (await uRes.json()) as { users: EngineerOption[] };
      setEngineers(d.users);
      if (d.users[0] && !assignedEngineerId) setAssignedEngineerId(d.users[0].id);
    }
  }, [assignedEngineerId]);

  const hydrateFromOrder = useCallback((o: PurchaseOrderDto) => {
    setObraId(o.obraId);
    setSupplierId(o.supplierId ?? "");
    setSupplierName(o.supplierName);
    setOcDate(o.ocDate?.slice(0, 10) ?? new Date().toISOString().slice(0, 10));
    setPaymentTerms(o.paymentTerms || "30 días");
    setDescription(o.description);
    setInternalReference(o.internalReference);
    setOcFolio(o.ocFolio);
    setTotalAmount(o.totalAmount > 0 ? String(o.totalAmount) : "");
    setCurrency(o.currency);
    setDocumentDate(o.documentDate?.slice(0, 10) ?? new Date().toISOString().slice(0, 10));
    if (o.assignedEngineerUserId) setAssignedEngineerId(o.assignedEngineerUserId);
    if (o.paymentType) setPaymentModality(o.paymentType);
    if (o.materialRequestId) setMaterialRequestId(o.materialRequestId);
    const pdf = o.files.find((f) => f.kind === "oc_pdf");
    if (pdf) {
      setUploadedPdf({
        name: pdf.originalFileName,
        size: pdf.sizeBytes,
        at: pdf.createdAt,
      });
    }
    const h: { at: string; text: string }[] = [
      { at: o.createdAt, text: `${o.createdByName} creó la Orden de Compra.` },
    ];
    if (pdf) {
      h.push({ at: pdf.createdAt, text: `${o.createdByName} adjuntó el PDF de la OC.` });
    }
    setHistory(h);
  }, []);

  useEffect(() => {
    void (async () => {
      await loadCatalogs();
      if (resumeOrderId) {
        const res = await fetch(`/api/orders/${resumeOrderId}`, { credentials: "include" });
        if (res.ok) {
          const d = (await res.json()) as { order: PurchaseOrderDto };
          if (d.order.status === "draft" || d.order.status === "engineerRejected") {
            setOrder(d.order);
            setOrderId(d.order.id);
            hydrateFromOrder(d.order);
          }
        }
      } else if (solicitudIdParam) {
        const sRes = await fetch(`/api/material-requests/${solicitudIdParam}`, { credentials: "include" });
        if (sRes.ok) {
          const sd = (await sRes.json()) as {
            request: {
              id: string;
              obraId: string;
              materials: string;
              quantities: string;
              justification: string;
              costCenter: string;
              createdByUserId: string;
              createdByName: string;
              obraName: string;
            };
          };
          const s = sd.request;
          setMaterialRequestId(s.id);
          setObraId(s.obraId);
          setDescription(
            [s.materials, s.quantities ? `Cantidades: ${s.quantities}` : "", s.justification].filter(Boolean).join("\n")
          );
          setInternalReference(s.costCenter ? `CC: ${s.costCenter}` : "");
          setAssignedEngineerId(s.createdByUserId);
          setSolicitudBanner(`Solicitud de ${s.createdByName} · ${s.obraName}`);
        }
      }
      setLoading(false);
    })();
  }, [resumeOrderId, solicitudIdParam, loadCatalogs, hydrateFromOrder]);

  useEffect(() => {
    const s = Number(searchParams.get("step"));
    if (s >= 1 && s <= 3) setStep(s as Step);
    const pre = searchParams.get("obraId");
    if (pre && obras.some((o) => o.id === pre) && !obraId) setObraId(pre);
    else if (obras[0] && !obraId) setObraId(obras[0].id);
  }, [obras, obraId, searchParams]);

  if (user && user.role !== "compras") {
    return (
      <div className="card p-8">
        <p className="text-base">Solo Compras (Paty) puede crear órdenes de compra.</p>
        <Link href="/inicio" className="mt-4 inline-block text-orange-700 underline">
          Volver
        </Link>
      </div>
    );
  }

  if (loading) return <LoadingScreen message="Cargando formulario" />;

  async function ensureDraft(): Promise<string> {
    if (!obraId || !supplierName.trim()) {
      throw new Error("Obra y proveedor son requeridos.");
    }
    const payload = {
      obraId,
      supplierName: supplierLabel,
      supplierId: supplierId || null,
      ocDate,
      paymentTerms,
      description,
      internalReference,
      paymentType: paymentModality,
      materialRequestId,
      assignedEngineerUserId: assignedEngineerId || null,
      asDraft: true,
    };

    if (orderId) {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as { order?: PurchaseOrderDto; error?: string };
      if (!res.ok || !data.order) throw new Error(data.error ?? "Error al guardar borrador.");
      setOrder(data.order);
      return orderId;
    }

    const res = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(payload),
    });
    const data = (await res.json()) as { order?: PurchaseOrderDto; error?: string };
    if (!res.ok || !data.order) throw new Error(data.error ?? "Error al crear borrador.");
    setOrderId(data.order.id);
    setOrder(data.order);
    setHistory([{ at: data.order.createdAt, text: `${user?.name ?? "Paty"} creó la Orden de Compra.` }]);
    return data.order.id;
  }

  async function saveStep2(id: string) {
    const amount = Number.parseFloat(totalAmount.replace(/,/g, ""));
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new Error("El monto total de la OC es requerido.");
    }
    if (!ocFolio.trim()) throw new Error("El folio de la OC es requerido.");

    const res = await fetch(`/api/orders/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        ocFolio,
        totalAmount: amount,
        currency,
        documentDate,
        paymentType: paymentModality,
      }),
    });
    const data = (await res.json()) as { order?: PurchaseOrderDto; error?: string };
    if (!res.ok || !data.order) throw new Error(data.error ?? "Error al guardar documento.");

    if (pdfFile) {
      const fd = new FormData();
      fd.set("orderId", id);
      fd.set("kind", "oc_pdf");
      fd.set("file", pdfFile);
      const up = await fetch("/api/files/upload", { method: "POST", credentials: "include", body: fd });
      const upData = (await up.json()) as { error?: string };
      if (!up.ok) throw new Error(upData.error ?? "Error al subir el PDF.");
      setUploadedPdf({
        name: pdfFile.name,
        size: pdfFile.size,
        at: new Date().toISOString(),
      });
      setHistory((h) => [
        ...h,
        { at: new Date().toISOString(), text: `${user?.name ?? "Paty"} adjuntó el PDF de la OC.` },
      ]);
      setPdfFile(null);
    }

    if (!uploadedPdf && !pdfFile) {
      throw new Error("Debes adjuntar el PDF de la OC.");
    }

    setOrder(data.order);
  }

  async function goNext() {
    setBusy(true);
    try {
      if (step === 1) {
        if (!supplierId && !supplierName.trim()) {
          throw new Error("Selecciona o registra un proveedor.");
        }
        const id = await ensureDraft();
        router.replace(`/ordenes/nueva?orderId=${id}&step=2`);
        setStep(2);
      } else if (step === 2) {
        const id = orderId ?? (await ensureDraft());
        await saveStep2(id);
        router.replace(`/ordenes/nueva?orderId=${id}&step=3`);
        setStep(3);
      }
    } catch (ex) {
      showError(ex instanceof Error ? ex.message : "Error al continuar.");
    } finally {
      setBusy(false);
    }
  }

  async function saveDraft() {
    setBusy(true);
    try {
      const id = await ensureDraft();
      if (step >= 2 && totalAmount) {
        await saveStep2(id);
      }
      showSuccess("Borrador guardado correctamente.");
    } catch (ex) {
      showError(ex instanceof Error ? ex.message : "Error al guardar.");
    } finally {
      setBusy(false);
    }
  }

  async function sendToEngineer() {
    if (!orderId) {
      showError("Guarda la orden antes de enviar.");
      return;
    }
    if (!assignedEngineerId) {
      showError("Selecciona un ingeniero responsable.");
      return;
    }
    setBusy(true);
    try {
      await fetch(`/api/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ assignedEngineerUserId: assignedEngineerId }),
      });

      const res = await fetch(`/api/orders/${orderId}/actions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          action: "send_to_engineer",
          assignedEngineerUserId: assignedEngineerId,
        }),
      });
      const data = (await res.json()) as { order?: PurchaseOrderDto; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Error al enviar a Ingeniería.");

      showSuccess("La OC fue enviada a Ingeniería para aprobación.", () => {
        router.push(`/ordenes/${orderId}`);
      });
    } catch (ex) {
      showError(ex instanceof Error ? ex.message : "Error al enviar.");
    } finally {
      setBusy(false);
    }
  }

  function onSupplierChange(id: string) {
    setSupplierId(id);
    const s = suppliers.find((x) => x.id === id);
    if (s) setSupplierName(s.displayName);
  }

  function onPdfPick(file: File | null) {
    if (!file) return;
    if (file.type !== "application/pdf") {
      showError("Solo se permiten archivos PDF.");
      return;
    }
    if (file.size > MAX_PDF_BYTES) {
      showError("El PDF no debe superar 20 MB.");
      return;
    }
    setPdfFile(file);
  }

  const inputCls =
    "mt-1.5 block w-full min-h-11 rounded-xl border border-zinc-200 bg-white px-3 text-sm shadow-sm focus:border-orange-300 focus:outline-none focus:ring-1 focus:ring-orange-200";

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <ProveedorModal
        open={proveedorOpen}
        onClose={() => setProveedorOpen(false)}
        onSaved={(s) => {
          setSuppliers((prev) => [...prev, s].sort((a, b) => a.displayName.localeCompare(b.displayName)));
          setSupplierId(s.id);
          setSupplierName(s.displayName);
        }}
      />

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href="/inicio" className="text-sm font-medium text-orange-700 hover:underline">
            ← Inicio
          </Link>
          <h1 className="mt-1 text-2xl font-bold text-zinc-900 sm:text-3xl">Nueva OC</h1>
          <p className="mt-1 text-sm text-zinc-600">
            {step === 3
              ? "Revisa la información de la orden de compra antes de enviarla a aprobación."
              : "Crea y registra una nueva orden de compra."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/inicio" className="btn-secondary">
            Cancelar
          </Link>
          {step > 1 && (
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setStep((step - 1) as Step)}
              disabled={busy}
            >
              Atrás
            </button>
          )}
          {step < 3 ? (
            <button type="button" className="btn-primary" onClick={() => void goNext()} disabled={busy}>
              Siguiente →
            </button>
          ) : (
            <button type="button" className="btn-primary" onClick={() => void sendToEngineer()} disabled={busy}>
              Enviar a Ingeniería →
            </button>
          )}
        </div>
      </div>

      <div className="card p-4 sm:p-5">
        <Stepper step={step} />
      </div>

      {solicitudBanner && (
        <div className="rounded-xl border border-teal-200 bg-teal-50/60 px-4 py-3 text-sm text-teal-900">
          <strong>Solicitud vinculada:</strong> {solicitudBanner}. El ingeniero solicitante quedará asignado para aprobar la OC.
        </div>
      )}

      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        <div className="min-w-0 flex-1 space-y-6">
          {step === 1 && (
            <section className="card p-5 sm:p-6">
              <h2 className="text-lg font-bold text-zinc-900">Datos generales</h2>
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <label className="block sm:col-span-2">
                  <span className="text-sm font-medium text-zinc-800">
                    Obra <span className="text-red-500">*</span>
                  </span>
                  <select
                    required
                    value={obraId}
                    onChange={(e) => setObraId(e.target.value)}
                    className={inputCls}
                  >
                    {obras.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="text-sm font-medium text-zinc-800">
                    Proveedor <span className="text-red-500">*</span>
                  </span>
                  <div className="mt-1.5 flex gap-2">
                    <select
                      value={supplierId}
                      onChange={(e) => onSupplierChange(e.target.value)}
                      className={`${inputCls} mt-0 flex-1`}
                    >
                      <option value="">Seleccionar proveedor…</option>
                      {suppliers.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.displayName}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => setProveedorOpen(true)}
                      className="btn-secondary shrink-0 whitespace-nowrap text-xs"
                    >
                      + Nuevo proveedor
                    </button>
                  </div>
                </label>
                <label className="block">
                  <span className="text-sm font-medium text-zinc-800">
                    Fecha de la OC <span className="text-red-500">*</span>
                  </span>
                  <input
                    type="date"
                    required
                    value={ocDate}
                    onChange={(e) => setOcDate(e.target.value)}
                    className={inputCls}
                  />
                </label>
                <label className="block sm:col-span-2">
                  <span className="text-sm font-medium text-zinc-800">
                    Modalidad de pago acordada <span className="text-red-500">*</span>
                  </span>
                  <p className="mt-0.5 text-xs text-zinc-500">
                    Paty define si el pago será inmediato, a 30 días o por parcialidades.
                  </p>
                  <div className="mt-2 space-y-2">
                    {COMPRAS_PAYMENT_OPTIONS.map((opt) => (
                      <label
                        key={opt.value}
                        className={`flex cursor-pointer gap-3 rounded-xl border px-3 py-2.5 text-sm transition ${
                          paymentModality === opt.value
                            ? "border-orange-300 bg-orange-50"
                            : "border-zinc-200 bg-white hover:border-orange-200"
                        }`}
                      >
                        <input
                          type="radio"
                          name="paymentModality"
                          value={opt.value}
                          checked={paymentModality === opt.value}
                          onChange={() => setPaymentModality(opt.value)}
                          className="mt-1"
                        />
                        <span>
                          <span className="font-semibold text-zinc-900">{opt.label}</span>
                          <span className="mt-0.5 block text-xs text-zinc-500">{opt.hint}</span>
                        </span>
                      </label>
                    ))}
                  </div>
                </label>
                <label className="block sm:col-span-2">
                  <span className="text-sm font-medium text-zinc-800">
                    Condiciones con proveedor <span className="text-red-500">*</span>
                  </span>
                  <select
                    value={paymentTerms}
                    onChange={(e) => setPaymentTerms(e.target.value)}
                    className={inputCls}
                  >
                    {PAYMENT_TERMS.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block sm:col-span-2">
                  <span className="text-sm font-medium text-zinc-800">Comentarios / Observaciones (opcional)</span>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                    maxLength={500}
                    placeholder="Agrega comentarios o notas relevantes para esta orden de compra…"
                    className={`${inputCls} py-2`}
                  />
                  <p className="mt-1 text-right text-xs text-zinc-400">{description.length}/500</p>
                </label>
                <label className="block sm:col-span-2">
                  <span className="text-sm font-medium text-zinc-800">Referencia interna (opcional)</span>
                  <input
                    value={internalReference}
                    onChange={(e) => setInternalReference(e.target.value)}
                    placeholder="Ej. Proyecto, partida, concepto, etc."
                    className={inputCls}
                  />
                </label>
              </div>
              <div className="mt-5 rounded-xl border border-orange-200 bg-orange-50/60 px-4 py-3 text-sm text-orange-900">
                <strong>Importante:</strong> Primero guarda la información general y después sube el PDF de la OC
                generada en CONTPAQi.
              </div>
            </section>
          )}

          {step === 2 && (
            <>
              <section className="card p-5 sm:p-6">
                <h2 className="text-lg font-bold text-zinc-900">Información capturada</h2>
                <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="text-zinc-500">Obra</dt>
                    <dd className="font-medium">{obraName}</dd>
                  </div>
                  <div>
                    <dt className="text-zinc-500">Proveedor</dt>
                    <dd className="font-medium">{supplierLabel}</dd>
                  </div>
                  <div>
                    <dt className="text-zinc-500">Fecha de la OC</dt>
                    <dd className="font-medium">{formatDateShort(ocDate)}</dd>
                  </div>
                  <div>
                    <dt className="text-zinc-500">Condiciones de pago</dt>
                    <dd className="font-medium">{paymentTerms}</dd>
                  </div>
                </dl>
              </section>

              <section className="card p-5 sm:p-6">
                <h2 className="text-lg font-bold text-zinc-900">Documento de Orden de Compra (OC)</h2>
                <p className="mt-1 text-sm text-zinc-500">Sube el PDF generado en CONTPAQi.</p>
                <div className="mt-4 grid gap-4 lg:grid-cols-2">
                  <div
                    className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-zinc-200 bg-zinc-50/50 px-6 py-10 text-center"
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      onPdfPick(e.dataTransfer.files[0] ?? null);
                    }}
                  >
                    <svg className="h-10 w-10 text-zinc-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                      />
                    </svg>
                    <p className="mt-3 text-sm font-medium text-zinc-700">Arrastre su archivo PDF aquí</p>
                    <label className="btn-secondary mt-4 cursor-pointer">
                      Seleccionar archivo
                      <input
                        type="file"
                        accept="application/pdf"
                        className="sr-only"
                        onChange={(e) => onPdfPick(e.target.files?.[0] ?? null)}
                      />
                    </label>
                    <p className="mt-2 text-xs text-zinc-400">Solo archivos PDF (máx. 20 MB)</p>
                  </div>

                  {(pdfFile || uploadedPdf) && (
                    <div className="rounded-2xl border border-emerald-100 bg-emerald-50/30 p-4">
                      <p className="text-sm font-semibold text-zinc-800">Archivo cargado</p>
                      <div className="mt-3 flex items-start gap-3">
                        <span className="text-red-500">
                          <svg className="h-8 w-8" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zm-1 2l5 5h-5V4z" />
                          </svg>
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium text-zinc-900">
                            {pdfFile?.name ?? uploadedPdf?.name}
                          </p>
                          <p className="text-xs text-zinc-500">
                            Subido:{" "}
                            {formatDateShort(pdfFile ? new Date().toISOString() : uploadedPdf!.at)}
                          </p>
                          <p className="text-xs text-zinc-500">
                            Tamaño: {((pdfFile?.size ?? uploadedPdf?.size ?? 0) / 1024 / 1024).toFixed(1)} MB
                          </p>
                        </div>
                      </div>
                      {orderId && uploadedPdf && !pdfFile && (
                        <a
                          href={`/api/files/${order?.files.find((f) => f.kind === "oc_pdf")?.id}`}
                          target="_blank"
                          rel="noreferrer"
                          className="btn-secondary mt-3 text-xs"
                        >
                          Ver PDF
                        </a>
                      )}
                      <button
                        type="button"
                        className="mt-3 text-xs font-medium text-red-600 hover:underline"
                        onClick={() => {
                          setPdfFile(null);
                          setUploadedPdf(null);
                        }}
                      >
                        Reemplazar PDF
                      </button>
                    </div>
                  )}
                </div>
                <p className="mt-3 text-xs text-sky-700">
                  Puedes reemplazar el archivo antes de enviar a aprobación.
                </p>
              </section>

              <section className="card p-5 sm:p-6">
                <h2 className="text-lg font-bold text-zinc-900">
                  Datos detectados del documento (captura manual)
                </h2>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <label className="block">
                    <span className="text-sm font-medium">
                      Folio OC <span className="text-red-500">*</span>
                    </span>
                    <input
                      required
                      value={ocFolio}
                      onChange={(e) => setOcFolio(e.target.value)}
                      placeholder="OC-14023"
                      className={inputCls}
                    />
                  </label>
                  <label className="block">
                    <span className="text-sm font-medium">
                      Monto total OC <span className="text-red-500">*</span>
                    </span>
                    <input
                      required
                      inputMode="decimal"
                      value={totalAmount}
                      onChange={(e) => setTotalAmount(e.target.value)}
                      placeholder="85000.00"
                      className={inputCls}
                    />
                  </label>
                  <label className="block">
                    <span className="text-sm font-medium">Moneda</span>
                    <select value={currency} onChange={(e) => setCurrency(e.target.value)} className={inputCls}>
                      <option value="MXN">MXN — Peso mexicano</option>
                      <option value="USD">USD — Dólar</option>
                    </select>
                  </label>
                  <label className="block">
                    <span className="text-sm font-medium">
                      Fecha del documento <span className="text-red-500">*</span>
                    </span>
                    <input
                      type="date"
                      required
                      value={documentDate}
                      onChange={(e) => setDocumentDate(e.target.value)}
                      className={inputCls}
                    />
                  </label>
                </div>
              </section>
            </>
          )}

          {step === 3 && (
            <>
              <section className="card p-5 sm:p-6">
                <h2 className="text-lg font-bold text-zinc-900">Resumen de la Orden de Compra</h2>
                <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="text-zinc-500">Obra</dt>
                    <dd className="font-medium">{obraName}</dd>
                  </div>
                  <div>
                    <dt className="text-zinc-500">Proveedor</dt>
                    <dd className="font-medium">{supplierLabel}</dd>
                  </div>
                  <div>
                    <dt className="text-zinc-500">Fecha de la OC</dt>
                    <dd className="font-medium">{formatDateShort(ocDate)}</dd>
                  </div>
                  <div>
                    <dt className="text-zinc-500">Condiciones de pago</dt>
                    <dd className="font-medium">{paymentTerms}</dd>
                  </div>
                  {description && (
                    <div className="sm:col-span-2">
                      <dt className="text-zinc-500">Comentarios / Observaciones</dt>
                      <dd className="font-medium">{description}</dd>
                    </div>
                  )}
                </dl>
              </section>

              <section className="card p-5 sm:p-6">
                <h2 className="text-lg font-bold text-zinc-900">Documento adjunto (OC)</h2>
                {uploadedPdf && (
                  <div className="mt-3 flex items-center gap-3 rounded-xl border border-zinc-100 bg-zinc-50 p-3">
                    <span className="text-red-500">
                      <svg className="h-8 w-8" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zm-1 2l5 5h-5V4z" />
                      </svg>
                    </span>
                    <div>
                      <p className="font-medium">{uploadedPdf.name}</p>
                      <p className="text-xs text-zinc-500">
                        Subido: {formatDateShort(uploadedPdf.at)} ·{" "}
                        {(uploadedPdf.size / 1024 / 1024).toFixed(1)} MB
                      </p>
                    </div>
                  </div>
                )}
              </section>

              <section className="card p-5 sm:p-6">
                <h2 className="text-lg font-bold text-zinc-900">Datos de control</h2>
                <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="text-zinc-500">Folio OC</dt>
                    <dd className="font-medium">{ocFolio}</dd>
                  </div>
                  <div>
                    <dt className="text-zinc-500">Monto total OC</dt>
                    <dd className="font-medium">{formatMoney(Number(totalAmount), currency)}</dd>
                  </div>
                  <div>
                    <dt className="text-zinc-500">Moneda</dt>
                    <dd className="font-medium">{currency === "MXN" ? "MXN — Peso mexicano" : currency}</dd>
                  </div>
                  <div>
                    <dt className="text-zinc-500">Fecha del documento</dt>
                    <dd className="font-medium">{formatDateShort(documentDate)}</dd>
                  </div>
                </dl>
              </section>

              <section className="card p-5 sm:p-6">
                <label className="block">
                  <span className="text-sm font-bold text-zinc-900">
                    Enviar a <span className="text-red-500">*</span>
                  </span>
                  <select
                    required
                    value={assignedEngineerId}
                    onChange={(e) => setAssignedEngineerId(e.target.value)}
                    className={inputCls}
                  >
                    {engineers.map((eng) => (
                      <option key={eng.id} value={eng.id}>
                        {eng.name} (Ingeniería)
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-xs text-zinc-500">Responsable de revisar y aprobar esta OC.</p>
                </label>
              </section>

              <section className="rounded-2xl border border-sky-100 bg-sky-50/50 p-5">
                <h2 className="text-sm font-bold text-sky-900">¿Qué ocurrirá después de enviar?</h2>
                <ul className="mt-3 space-y-2 text-sm text-sky-900">
                  {[
                    "Se notificará a Ingeniería.",
                    'La OC cambiará a estado "Pendiente aprobación".',
                    "Ingeniería podrá aprobar o solicitar corrección.",
                    "Todas las acciones quedarán registradas en la bitácora.",
                  ].map((t) => (
                    <li key={t} className="flex items-start gap-2">
                      <span className="mt-0.5 text-emerald-600">✓</span>
                      {t}
                    </li>
                  ))}
                </ul>
              </section>

              {history.length > 0 && (
                <section className="card p-5 sm:p-6">
                  <h2 className="text-lg font-bold text-zinc-900">Historial del expediente</h2>
                  <ol className="mt-4 space-y-4 border-l-2 border-orange-100 pl-4">
                    {history.map((h, i) => (
                      <li key={i} className="relative">
                        <span className="absolute -left-[1.35rem] top-1 h-2.5 w-2.5 rounded-full bg-orange-400" />
                        <p className="text-xs text-zinc-500">{formatDateShort(h.at)}</p>
                        <p className="text-sm text-zinc-800">{h.text}</p>
                      </li>
                    ))}
                  </ol>
                </section>
              )}
            </>
          )}

          <div className="flex flex-wrap justify-between gap-3 pb-6">
            {step > 1 && (
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setStep((step - 1) as Step)}
                disabled={busy}
              >
                Atrás
              </button>
            )}
            <div className="ml-auto flex flex-wrap gap-2">
              <button type="button" className="btn-secondary" onClick={() => void saveDraft()} disabled={busy}>
                Guardar borrador
              </button>
              {step < 3 ? (
                <button type="button" className="btn-primary" onClick={() => void goNext()} disabled={busy}>
                  Siguiente →
                </button>
              ) : (
                <button type="button" className="btn-primary" onClick={() => void sendToEngineer()} disabled={busy}>
                  Enviar a Ingeniería →
                </button>
              )}
            </div>
          </div>
        </div>

        <SummaryPanel
          obraName={obraName}
          supplierLabel={supplierLabel}
          ocDate={ocDate}
          paymentTerms={paymentTerms}
          currency={currency}
          totalAmount={Number.parseFloat(totalAmount) || 0}
          hasPdf={Boolean(uploadedPdf || pdfFile)}
          statusLabel="BORRADOR"
          nextStatus={step === 3 ? "PENDIENTE APROBACIÓN" : undefined}
          nextRole={step === 3 ? "INGENIERÍA" : undefined}
        />
      </div>
    </div>
  );
}
