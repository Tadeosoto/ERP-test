"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { FilePickButton } from "@/components/file-pick-button";
import { LoadingScreen } from "@/components/ui/loading-screen";
import { useFeedback } from "@/components/ui/feedback-provider";
import { useSession } from "@/components/session-provider";
import type { DirectExpenseDto, ObraDto } from "@/lib/domain/types";

const inputCls =
  "mt-1.5 block w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm shadow-sm focus:border-teal-300 focus:outline-none focus:ring-1 focus:ring-teal-200";

const CATEGORIES = ["Servicios", "Fletes", "Herramienta", "Consumibles", "Viáticos", "Otro"];

export default function DirectExpenseNewPage() {
  const { user } = useSession();
  const router = useRouter();
  const { showSuccess, showError } = useFeedback();
  const [obras, setObras] = useState<ObraDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [expenseId, setExpenseId] = useState<string | null>(null);

  const [obraId, setObraId] = useState("");
  const [costCenter, setCostCenter] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [supplierName, setSupplierName] = useState("");
  const [estimatedAmount, setEstimatedAmount] = useState("");
  const [justification, setJustification] = useState("");

  const loadObras = useCallback(async () => {
    const res = await fetch("/api/obras", { credentials: "include" });
    if (res.ok) {
      const d = (await res.json()) as { obras: ObraDto[] };
      setObras(d.obras.filter((o) => o.active));
      if (d.obras[0]) setObraId(d.obras[0].id);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadObras();
  }, [loadObras]);

  if (user && user.role !== "ingeniero") {
    return (
      <div className="card p-8">
        <p>Solo Ingeniería puede crear gastos directos.</p>
        <Link href="/inicio" className="mt-4 inline-block text-teal-700 underline">
          Volver
        </Link>
      </div>
    );
  }

  if (loading) return <LoadingScreen message="Cargando obras" />;

  async function saveDraft(): Promise<string> {
    const payload = {
      obraId,
      costCenter,
      category,
      supplierName,
      estimatedAmount: Number.parseFloat(estimatedAmount.replace(/,/g, "")) || 0,
      justification,
    };
    if (expenseId) {
      const res = await fetch(`/api/direct-expenses/${expenseId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as { expense?: DirectExpenseDto; error?: string };
      if (!res.ok || !data.expense) throw new Error(data.error ?? "Error al guardar.");
      return expenseId;
    }
    const res = await fetch("/api/direct-expenses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(payload),
    });
    const data = (await res.json()) as { expense?: DirectExpenseDto; error?: string };
    if (!res.ok || !data.expense) throw new Error(data.error ?? "Error al crear.");
    setExpenseId(data.expense.id);
    return data.expense.id;
  }

  async function onSend() {
    setBusy(true);
    try {
      const id = await saveDraft();
      const res = await fetch(`/api/direct-expenses/${id}/actions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ action: "send" }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "No se pudo enviar.");
      showSuccess("Gasto directo enviado a Administración.");
      router.push(`/solicitudes/gasto/${id}`);
    } catch (e) {
      showError(e instanceof Error ? e.message : "Error al enviar.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <header>
        <p className="text-xs font-bold uppercase text-teal-600">Proceso B</p>
        <h1 className="text-2xl font-bold text-zinc-900">Gasto directo</h1>
        <p className="mt-1 text-sm text-zinc-500">Sin OC. Administración paga y registra la factura.</p>
      </header>

      <section className="card space-y-4 p-5 sm:p-6">
        <label className="block">
          <span className="text-sm font-medium">Obra *</span>
          <select value={obraId} onChange={(e) => setObraId(e.target.value)} className={inputCls}>
            {obras.map((o) => (
              <option key={o.id} value={o.id}>{o.name}</option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="text-sm font-medium">Centro de costo</span>
          <input value={costCenter} onChange={(e) => setCostCenter(e.target.value)} className={inputCls} />
        </label>
        <label className="block">
          <span className="text-sm font-medium">Categoría</span>
          <select value={category} onChange={(e) => setCategory(e.target.value)} className={inputCls}>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="text-sm font-medium">Proveedor (opcional)</span>
          <input value={supplierName} onChange={(e) => setSupplierName(e.target.value)} className={inputCls} />
        </label>
        <label className="block">
          <span className="text-sm font-medium">Monto estimado (MXN)</span>
          <input value={estimatedAmount} onChange={(e) => setEstimatedAmount(e.target.value)} className={inputCls} inputMode="decimal" />
        </label>
        <label className="block">
          <span className="text-sm font-medium">Justificación *</span>
          <textarea value={justification} onChange={(e) => setJustification(e.target.value)} rows={4} className={inputCls} required />
        </label>
        <FilePickButton disabled={busy} label="Adjuntar PDF" hint="cotización o soporte" onPick={async (f) => {
          try {
            const id = await saveDraft();
            const fd = new FormData();
            fd.set("directExpenseId", id);
            fd.set("file", f);
            const res = await fetch("/api/solicitud-files/upload", { method: "POST", credentials: "include", body: fd });
            if (!res.ok) throw new Error("Error al adjuntar.");
            showSuccess("Archivo adjuntado.");
          } catch (e) {
            showError(e instanceof Error ? e.message : "Error.");
          }
        }} />
      </section>

      <div className="flex flex-wrap gap-3">
        <button type="button" disabled={busy} className="btn-secondary" onClick={() => void saveDraft().then(() => showSuccess("Borrador guardado.")).catch((e) => showError(String(e)))}>
          Guardar borrador
        </button>
        <button type="button" disabled={busy} className="btn-primary" onClick={() => void onSend()}>
          Enviar a Administración
        </button>
        <Link href="/inicio" className="btn-secondary">Cancelar</Link>
      </div>
    </div>
  );
}
