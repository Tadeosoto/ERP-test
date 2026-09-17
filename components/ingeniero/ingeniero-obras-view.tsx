"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ObraEngineerPicker } from "@/components/obras/obra-engineer-picker";
import { IconBuilding, IconPlus } from "@/components/ui/action-icons";
import { LoadingScreen } from "@/components/ui/loading-screen";
import { useFeedback } from "@/components/ui/feedback-provider";
import { useSession } from "@/components/session-provider";
import { ObraCard } from "@/components/obra-card";
import type { ObraDto } from "@/lib/domain/types";
import { filterObras, sortByCreatedAtDesc } from "@/lib/list-utils";
import { parseAmountInput, sanitizeAmountInput } from "@/lib/format";

const inputCls =
  "mt-1.5 block w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm shadow-sm focus:border-teal-300 focus:outline-none focus:ring-1 focus:ring-teal-200";

export function IngenieroObrasView({ onRegisterRefresh }: { onRegisterRefresh?: (fn: () => void) => void }) {
  const { user } = useSession();
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
  const [engineerUserIds, setEngineerUserIds] = useState<string[]>([]);

  useEffect(() => {
    if (user?.id && user.role === "ingeniero" && engineerUserIds.length === 0) {
      setEngineerUserIds([user.id]);
    }
  }, [user?.id, user?.role, engineerUserIds.length]);

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
    const ids =
      user?.id && !engineerUserIds.includes(user.id)
        ? [...engineerUserIds, user.id]
        : engineerUserIds;
    if (ids.length === 0) {
      showError("Designa al menos un ingeniero involucrado en la obra.");
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
          engineerUserIds: ids,
        }),
      });
      const data = (await res.json()) as { obra?: ObraDto; error?: string };
      if (!res.ok || !data.obra) throw new Error(data.error ?? "No se pudo crear la obra.");
      showSuccess("Obra creada con equipo de ingenieros.");
      setName("");
      setCode("");
      setClient("");
      setManagerName("");
      setStartDate("");
      setEstimatedEndDate("");
      setMaxMaterialsBudget("");
      setEngineerUserIds(user?.id ? [user.id] : []);
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
            Crea la obra, designa el equipo y pide material a Compras.
          </p>
        </div>
        <Link href="/solicitudes/nueva" className="btn-primary">
          <IconPlus />
          Pedir material
        </Link>
      </div>

      <section className="card p-5 sm:p-6">
        <h2 className="text-lg font-bold text-zinc-900">Nueva obra</h2>
        <p className="mt-1 text-sm text-zinc-500">
          Quien crea la obra designa a los ingenieros involucrados.
        </p>
        <form onSubmit={createObra} className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="block sm:col-span-2">
            <span className="text-sm font-medium">Nombre *</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className={inputCls}
              placeholder="Ej. Torre Residencial Aurora"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium">Código</span>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className={inputCls}
              placeholder="OBR-2026-001"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium">Cliente</span>
            <input value={client} onChange={(e) => setClient(e.target.value)} className={inputCls} />
          </label>
          <label className="block sm:col-span-2">
            <span className="text-sm font-medium">Residente / responsable</span>
            <input
              value={managerName}
              onChange={(e) => setManagerName(e.target.value)}
              className={inputCls}
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium">Inicio</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className={inputCls}
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium">Fin estimado</span>
            <input
              type="date"
              value={estimatedEndDate}
              onChange={(e) => setEstimatedEndDate(e.target.value)}
              className={inputCls}
            />
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
              Tope acordado con el mandante. Superarlo implica pérdida.
            </span>
          </label>
          <div className="sm:col-span-2">
            <span className="text-sm font-medium">
              Ingenieros involucrados <span className="text-red-500">*</span>
            </span>
            <ObraEngineerPicker
              value={engineerUserIds}
              onChange={setEngineerUserIds}
              lockedIds={user?.id ? [user.id] : []}
            />
          </div>
          <div className="sm:col-span-2">
            <button type="submit" disabled={busy} className="btn-secondary">
              <IconBuilding />
              Crear obra
            </button>
          </div>
        </form>
      </section>

      <div>
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar obras…"
          className="mb-4 h-10 w-full max-w-md rounded-xl border border-zinc-200 px-3 text-sm"
        />
        {visible.length === 0 ? (
          <p className="card py-10 text-center text-zinc-500">No hay obras en tu equipo.</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {visible.map((o) => (
              <ObraCard key={o.id} obra={o} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
