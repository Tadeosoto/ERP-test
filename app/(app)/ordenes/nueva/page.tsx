"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import { FilePickButton } from "@/components/file-pick-button";
import { IconSend } from "@/components/ui/action-icons";
import { LoadingScreen } from "@/components/ui/loading-screen";
import { useSession } from "@/components/session-provider";
import type { ObraDto } from "@/lib/domain/types";

export default function NuevaOrdenPage() {
  return (
    <Suspense fallback={<LoadingScreen message="Cargando Formulario" />}>
      <NuevaOrdenForm />
    </Suspense>
  );
}

function NuevaOrdenForm() {
  const { user } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedObra = searchParams.get("obraId");
  const [obras, setObras] = useState<ObraDto[]>([]);
  const [obraId, setObraId] = useState("");
  const [title, setTitle] = useState("");
  const [supplierName, setSupplierName] = useState("");
  const [totalAmount, setTotalAmount] = useState("");
  const [description, setDescription] = useState("");
  const [parcialidades, setParcialidades] = useState(false);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [loadingObras, setLoadingObras] = useState(true);

  useEffect(() => {
    fetch("/api/obras", { credentials: "include" })
      .then((r) => r.json())
      .then((d: { obras: ObraDto[] }) => {
        const active = d.obras.filter((o) => o.active);
        setObras(active);
        if (preselectedObra && active.some((o) => o.id === preselectedObra)) {
          setObraId(preselectedObra);
        } else if (active[0]) {
          setObraId(active[0].id);
        }
      })
      .finally(() => setLoadingObras(false));
  }, [preselectedObra]);

  if (user && user.role !== "compras") {
    return (
      <div className="card p-8">
        <p className="text-base">Solo Compras (Paty) puede crear órdenes de compra.</p>
        <Link href="/obras" className="mt-4 inline-block text-orange-700 underline">
          Volver
        </Link>
      </div>
    );
  }

  if (loadingObras) {
    return <LoadingScreen message="Cargando Obras" />;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (!pdfFile) {
      setErr("Debes adjuntar el PDF de la orden de compra.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          obraId,
          title,
          supplierName,
          totalAmount: Number.parseFloat(totalAmount),
          description,
          suggestedPaymentType: parcialidades ? "parcialidades" : null,
        }),
      });
      const data = (await res.json()) as { order?: { id: string }; error?: string };
      if (!res.ok || !data.order) throw new Error(data.error ?? "Error al crear");

      const fd = new FormData();
      fd.set("orderId", data.order.id);
      fd.set("kind", "oc_pdf");
      fd.set("file", pdfFile);
      const up = await fetch("/api/files/upload", { method: "POST", credentials: "include", body: fd });
      const upData = (await up.json()) as { error?: string };
      if (!up.ok) throw new Error(upData.error ?? "Error al subir PDF");

      router.push(`/ordenes/${data.order.id}`);
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : "Error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <Link href="/obras" className="text-base text-orange-700 hover:underline">
          ← Obras
        </Link>
        <h1 className="mt-2 text-3xl font-bold text-zinc-900">Nueva orden de compra</h1>
        <p className="mt-2 text-base text-zinc-600">
          Tras negociar con el proveedor, registra la OC y envía el PDF a Santiago para revisión.
        </p>
      </div>
      <form onSubmit={submit} className="card space-y-4 p-6">
        {err && (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-4" role="alert">
            <p className="font-semibold text-red-900">No se pudo guardar la orden</p>
            <p className="mt-2 text-base leading-relaxed text-red-800">{err}</p>
          </div>
        )}
        <label className="block">
          <span className="font-medium">Obra</span>
          <select
            required
            value={obraId}
            onChange={(e) => setObraId(e.target.value)}
            className="mt-2 block w-full min-h-12 rounded-2xl border border-orange-100 px-4 text-base"
          >
            {obras.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="font-medium">Título de la orden</span>
          <input
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="mt-2 block w-full min-h-12 rounded-2xl border border-orange-100 px-4 text-base"
          />
        </label>
        <label className="block">
          <span className="font-medium">Proveedor</span>
          <input
            required
            value={supplierName}
            onChange={(e) => setSupplierName(e.target.value)}
            className="mt-2 block w-full min-h-12 rounded-2xl border border-orange-100 px-4 text-base"
          />
        </label>
        <label className="block">
          <span className="font-medium">Total de la orden (MXN)</span>
          <input
            required
            inputMode="decimal"
            value={totalAmount}
            onChange={(e) => setTotalAmount(e.target.value)}
            className="mt-2 block w-full min-h-12 rounded-2xl border border-orange-100 px-4 text-base tabular-nums"
          />
        </label>
        <label className="block">
          <span className="font-medium">Descripción (opcional)</span>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="mt-2 block w-full rounded-2xl border border-orange-100 px-4 py-3 text-base"
          />
        </label>
        <label className="flex items-start gap-3 rounded-2xl border border-teal-100 bg-teal-50/50 p-4">
          <input
            type="checkbox"
            checked={parcialidades}
            onChange={(e) => setParcialidades(e.target.checked)}
            className="mt-1 h-5 w-5 rounded border-teal-400 text-teal-600"
          />
          <span className="text-base text-zinc-800">
            <strong>Pago por parcialidades</strong> — Carolina irá abonando poco a poco hasta completar
            el total.
          </span>
        </label>
        <div>
          <p className="font-medium text-zinc-800">PDF de la orden de compra</p>
          <div className="mt-3">
            <FilePickButton
              label="Elegir PDF"
              hint="busca en tu equipo el PDF que negociaste con el proveedor"
              onPick={(file) => setPdfFile(file)}
            />
          </div>
          {!pdfFile && (
            <p className="mt-2 text-sm text-zinc-500">Debes elegir un PDF antes de crear la orden.</p>
          )}
        </div>
        <button type="submit" disabled={busy} className="btn-primary w-full">
          <IconSend />
          Crear y enviar a ingeniería
        </button>
      </form>
    </div>
  );
}
