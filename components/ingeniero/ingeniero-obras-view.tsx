"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { IconBuilding, IconPlus } from "@/components/ui/action-icons";
import { LoadingScreen } from "@/components/ui/loading-screen";
import { useFeedback } from "@/components/ui/feedback-provider";
import { ObraCard } from "@/components/obra-card";
import type { ObraDto } from "@/lib/domain/types";
import { filterObras, sortByCreatedAtDesc } from "@/lib/list-utils";
import { parseAmountInput, sanitizeAmountInput } from "@/lib/format";

const inputCls =
  "mt-1.5 block w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm shadow-sm focus:border-teal-300 focus:outline-none focus:ring-1 focus:ring-teal-200";

export function IngenieroObrasView({ onRegisterRefresh }: { onRegisterRefresh?: (fn: () => void) => void }) {
  const { showSuccess, showError } = useFeedback();
  const [obras, setObras] = useState<ObraDto[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [client, setClient] = useState("");
  const [managerName, setManagerName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [estimatedEndDate, setEstimatedEndDate] = useState("");
  const [maxMaterialsBudget, setMaxMaterialsBudget] = useState("");

  const load = useCallback(async () => {
    const res = await fetch("/api/obras", { credentials: "include" });
    if (res.ok) {
      const d = (await res.json()) as { obras: ObraDto[] };
      setObras(d.obras.filter((o) => o.active));
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
    onRegisterRefresh?.(() => void load());
  }, [load, onRegisterRefresh]);

  const sorted = useMemo(() => sortByCreatedAtDesc(obras), [obras]);
  const visible = useMemo(() => filterObras(sorted, search), [sorted, search]);

  async function createObra(e: React.FormEvent) {
    e.preventDefault();
    if (!parseAmountInput(maxMaterialsBudget)) {
      showError("Indica el monto máximo de materiales (debe ser mayor a cero).");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/obras", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name,
          code,
          client,
          managerName,
          startDate: startDate || null,
          estimatedEndDate: estimatedEndDate || null,
          maxMaterialsBudget: parseAmountInput(maxMaterialsBudget),
        }),
      });
      const data = (await res.json()) as { obra?: ObraDto; error?: string };
      if (!res.ok || !data.obra) throw new Error(data.error ?? "No se pudo crear la obra.");
      showSuccess("Obra creada. Ya puedes vincular solicitudes A o B.");
      setName("");
      setCode("");
      setClient("");
      setManagerName("");
      setStartDate("");
      setEstimatedEndDate("");
      setMaxMaterialsBudget("");
      await load();
    } catch (err) {
      showError(err instanceof Error ? err.message : "Error al crear obra.");
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <LoadingScreen message="Cargando obras" />;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 sm:text-3xl">Obras</h1>
          <p className="mt-1 text-sm text-zinc-600">
            Crea obras para vincular solicitudes de material (A) y gastos directos (B).
          </p>
        </div>
        <Link href="/solicitudes/nueva" className="btn-primary">
          <IconPlus />
          Nueva solicitud
        </Link>
      </div>

      <section className="card p-5 sm:p-6">
        <h2 className="text-lg font-bold text-zinc-900">Nueva obra</h2>
        <p className="mt-1 text-sm text-zinc-500">
          Registra el proyecto antes de enviar solicitudes a Compras o Administración.
        </p>
        <form onSubmit={createObra} className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="block sm:col-span-2">
            <span className="text-sm font-medium">Nombre *</span>
            <input value={name} onChange={(e) => setName(e.target.value)} required className={inputCls} placeholder="Ej. Torre Residencial Aurora" />
          </label>
          <label className="block">
            <span className="text-sm font-medium">Código</span>
            <input value={code} onChange={(e) => setCode(e.target.value)} className={inputCls} placeholder="OBR-2026-001" />
          </label>
          <label className="block">
            <span className="text-sm font-medium">Cliente</span>
            <input value={client} onChange={(e) => setClient(e.target.value)} className={inputCls} />
          </label>
          <label className="block sm:col-span-2">
            <span className="text-sm font-medium">Residente / responsable</span>
            <input value={managerName} onChange={(e) => setManagerName(e.target.value)} className={inputCls} />
          </label>
          <label className="block">
            <span className="text-sm font-medium">Inicio</span>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={inputCls} />
          </label>
          <label className="block">
            <span className="text-sm font-medium">Fin estimado</span>
            <input type="date" value={estimatedEndDate} onChange={(e) => setEstimatedEndDate(e.target.value)} className={inputCls} />
          </label>
          <label className="block sm:col-span-2">
            <span className="text-sm font-medium">
              Monto máximo de materiales (MXN) <span className="text-red-500">*</span>
            </span>
            <input
              value={maxMaterialsBudget}
              onChange={(e) => setMaxMaterialsBudget(sanitizeAmountInput(e.target.value))}
              inputMode="decimal"
              placeholder="Ej. 800000"
              required
              className={inputCls}
            />
            <span className="mt-1 block text-xs text-zinc-500">
              Tope acordado con el mandante por materiales. Superarlo implica pérdida; los pagos de OC y gastos
              directos se acumulan contra este límite.
            </span>
          </label>
          <div className="sm:col-span-2">
            <button type="submit" disabled={busy} className="btn-secondary">
              <IconBuilding />
              Crear obra
            </button>
          </div>
        </form>
      </section>

      <section className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 className="text-xl font-semibold text-zinc-900">Obras activas</h2>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar obra…"
            className="h-10 w-full max-w-xs rounded-xl border border-zinc-200 px-3 text-sm"
          />
        </div>
        {visible.length === 0 ? (
          <p className="card py-10 text-center text-sm text-zinc-500">No hay obras. Crea la primera arriba.</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {visible.map((o) => (
              <ObraCard key={o.id} obra={o} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
