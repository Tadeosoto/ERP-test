"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useSession } from "@/components/session-provider";
import { createDraftCase, upsertCase } from "@/lib/data/repository";
import { submitDraftToEngineer } from "@/lib/domain/transitions";

export default function NewCasePage() {
  const { session } = useSession();
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [supplierName, setSupplierName] = useState("");
  const [amountOc, setAmountOc] = useState("");
  const [description, setDescription] = useState("");
  const [err, setErr] = useState<string | null>(null);

  if (session && session.role !== "costos") {
    return (
      <div className="rounded-3xl border border-orange-100 bg-white p-8 shadow-sm">
        <h1 className="text-xl font-semibold text-zinc-900">Nueva OC</h1>
        <p className="mt-2 text-sm text-zinc-600">Solo el área Costos crea la orden.</p>
        <Link href="/dashboard" className="mt-4 inline-block text-orange-700 underline">
          Volver al panel
        </Link>
      </div>
    );
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (!session) return;
    const amount = Number.parseFloat(amountOc.replace(",", "."));
    if (Number.isNaN(amount) || amount <= 0) {
      setErr("Importe válido requerido.");
      return;
    }
    const draft = createDraftCase({
      title,
      supplierName,
      amountOc: amount,
      currency: "MXN",
      description,
      createdByUserId: session.userId,
    });
    const now = new Date().toISOString();
    try {
      const sent = submitDraftToEngineer(draft, now);
      upsertCase(sent);
      router.push(`/cases/${sent.id}`);
    } catch (er) {
      setErr(er instanceof Error ? er.message : "Error");
    }
  }

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">Nueva orden de compra</h1>
        <p className="mt-1 text-sm text-zinc-600">Se envía a Ingeniero para visto bueno.</p>
      </div>
      <form
        onSubmit={handleSubmit}
        className="space-y-4 rounded-3xl border border-orange-100 bg-white p-6 shadow-sm"
      >
        {err && <p className="rounded-2xl bg-red-50 px-3 py-2 text-sm text-red-700">{err}</p>}
        <div>
          <label className="text-sm font-medium text-zinc-700">Título</label>
          <input
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="mt-1 w-full rounded-2xl border border-orange-100 px-4 py-3 outline-none ring-orange-200 focus:ring-2"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-zinc-700">Proveedor</label>
          <input
            required
            value={supplierName}
            onChange={(e) => setSupplierName(e.target.value)}
            className="mt-1 w-full rounded-2xl border border-orange-100 px-4 py-3 outline-none ring-orange-200 focus:ring-2"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-zinc-700">Importe OC (MXN)</label>
          <input
            required
            value={amountOc}
            onChange={(e) => setAmountOc(e.target.value)}
            className="mt-1 w-full rounded-2xl border border-orange-100 px-4 py-3 tabular-nums outline-none ring-orange-200 focus:ring-2"
            inputMode="decimal"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-zinc-700">Descripción</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="mt-1 w-full rounded-2xl border border-orange-100 px-4 py-3 outline-none ring-orange-200 focus:ring-2"
          />
        </div>
        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            className="rounded-full bg-orange-600 px-6 py-3 font-semibold text-white hover:bg-orange-700"
          >
            Crear y enviar
          </button>
          <Link
            href="/dashboard"
            className="rounded-full border border-orange-200 px-6 py-3 text-sm font-medium text-orange-900 hover:bg-orange-50"
          >
            Cancelar
          </Link>
        </div>
      </form>
    </div>
  );
}
