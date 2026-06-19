"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { FilePickButton } from "@/components/file-pick-button";
import { LoadingScreen } from "@/components/ui/loading-screen";
import { useFeedback } from "@/components/ui/feedback-provider";
import { useSession } from "@/components/session-provider";
import type { MaterialRequestDto, ObraDto } from "@/lib/domain/types";

const inputCls =
  "mt-1.5 block w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm shadow-sm focus:border-orange-300 focus:outline-none focus:ring-1 focus:ring-orange-200";

export default function MaterialRequestNewPage() {
  const { user } = useSession();
  const router = useRouter();
  const { showSuccess, showError } = useFeedback();
  const [obras, setObras] = useState<ObraDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [requestId, setRequestId] = useState<string | null>(null);

  const [obraId, setObraId] = useState("");
  const [costCenter, setCostCenter] = useState("");
  const [materials, setMaterials] = useState("");
  const [quantities, setQuantities] = useState("");
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
        <p>Solo Ingeniería puede crear solicitudes de material.</p>
        <Link href="/inicio" className="mt-4 inline-block text-orange-700 underline">
          Volver
        </Link>
      </div>
    );
  }

  if (loading) return <LoadingScreen message="Cargando obras" />;

  async function saveDraft(): Promise<string> {
    const payload = { obraId, costCenter, materials, quantities, justification };
    if (requestId) {
      const res = await fetch(`/api/material-requests/${requestId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as { request?: MaterialRequestDto; error?: string };
      if (!res.ok || !data.request) throw new Error(data.error ?? "Error al guardar.");
      return requestId;
    }
    const res = await fetch("/api/material-requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(payload),
    });
    const data = (await res.json()) as { request?: MaterialRequestDto; error?: string };
    if (!res.ok || !data.request) throw new Error(data.error ?? "Error al crear.");
    setRequestId(data.request.id);
    return data.request.id;
  }

  async function onSend() {
    setBusy(true);
    try {
      const id = await saveDraft();
      const res = await fetch(`/api/material-requests/${id}/actions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ action: "send" }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "No se pudo enviar.");
      showSuccess("Solicitud enviada a Compras.");
      router.push(`/solicitudes/material/${id}`);
    } catch (e) {
      showError(e instanceof Error ? e.message : "Error al enviar.");
    } finally {
      setBusy(false);
    }
  }

  async function onAttach(file: File) {
    try {
      const id = await saveDraft();
      const fd = new FormData();
      fd.set("materialRequestId", id);
      fd.set("file", file);
      const res = await fetch("/api/solicitud-files/upload", { method: "POST", credentials: "include", body: fd });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Error al adjuntar.");
      showSuccess("Archivo adjuntado.");
    } catch (e) {
      showError(e instanceof Error ? e.message : "Error al adjuntar.");
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <header>
        <p className="text-xs font-bold uppercase text-orange-600">Proceso A</p>
        <h1 className="text-2xl font-bold text-zinc-900">Solicitud de material</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Obra, centro de costo, materiales, cantidades y justificación. Estado inicial: borrador.
        </p>
      </header>

      <section className="card space-y-4 p-5 sm:p-6">
        <label className="block">
          <span className="text-sm font-medium">Obra *</span>
          <select value={obraId} onChange={(e) => setObraId(e.target.value)} className={inputCls} required>
            {obras.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="text-sm font-medium">Centro de costo</span>
          <input value={costCenter} onChange={(e) => setCostCenter(e.target.value)} className={inputCls} placeholder="Ej. CC-14023-ELEC" />
        </label>
        <label className="block">
          <span className="text-sm font-medium">Materiales *</span>
          <textarea value={materials} onChange={(e) => setMaterials(e.target.value)} rows={3} className={inputCls} required placeholder="Cable THWN, tubería PVC…" />
        </label>
        <label className="block">
          <span className="text-sm font-medium">Cantidades</span>
          <textarea value={quantities} onChange={(e) => setQuantities(e.target.value)} rows={2} className={inputCls} placeholder="500 m cable, 120 piezas…" />
        </label>
        <label className="block">
          <span className="text-sm font-medium">Justificación</span>
          <textarea value={justification} onChange={(e) => setJustification(e.target.value)} rows={3} className={inputCls} placeholder="Por qué se necesita el material…" />
        </label>
        <div>
          <p className="text-sm font-medium">Adjuntos (opcional)</p>
          <FilePickButton disabled={busy} label="Adjuntar PDF" hint="especificaciones o planos" onPick={(f) => void onAttach(f)} />
        </div>
      </section>

      <div className="flex flex-wrap gap-3">
        <button type="button" disabled={busy} className="btn-secondary" onClick={() => void saveDraft().then(() => showSuccess("Borrador guardado.")).catch((e) => showError(String(e)))}>
          Guardar borrador
        </button>
        <button type="button" disabled={busy} className="btn-primary" onClick={() => void onSend()}>
          Enviar a Compras
        </button>
        <Link href="/inicio" className="btn-secondary">
          Cancelar
        </Link>
      </div>
    </div>
  );
}
