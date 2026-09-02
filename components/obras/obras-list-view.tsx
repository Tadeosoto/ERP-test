"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { IconBuilding, IconPlus } from "@/components/ui/action-icons";
import { LoadingScreen } from "@/components/ui/loading-screen";
import { useFeedback } from "@/components/ui/feedback-provider";
import { useConfirmDelete } from "@/components/ui/confirm-delete-provider";
import { useSession } from "@/components/session-provider";
import { computeObraFinancials } from "@/lib/dashboard/compras-dashboard";
import { canCreateObra, canCreateOrder } from "@/lib/domain/transitions";
import type { ObraDto, PurchaseOrderDto } from "@/lib/domain/types";
import { formatDateShort, formatMoney, parseAmountInput, sanitizeAmountInput } from "@/lib/format";
import { filterObras, sortByCreatedAtDesc } from "@/lib/list-utils";

const inputCls =
  "mt-1.5 block w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm shadow-sm focus:border-teal-300 focus:outline-none focus:ring-1 focus:ring-teal-200";

function obraDisplayCode(obra: ObraDto): string {
  if (obra.code.trim()) return obra.code;
  const year = new Date(obra.createdAt).getFullYear();
  const suffix = obra.id.replace(/-/g, "").slice(-3).toUpperCase();
  return `OBR-${year}-${suffix}`;
}

export function ObrasListView({ onRegisterRefresh }: { onRegisterRefresh?: (fn: () => void) => void }) {
  const router = useRouter();
  const { user } = useSession();
  const { showSuccess, showError } = useFeedback();
  const { confirmDelete } = useConfirmDelete();
  const [obras, setObras] = useState<ObraDto[]>([]);
  const [orders, setOrders] = useState<PurchaseOrderDto[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [showCreate, setShowCreate] = useState(false);

  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [client, setClient] = useState("");
  const [managerName, setManagerName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [estimatedEndDate, setEstimatedEndDate] = useState("");
  const [maxMaterialsBudget, setMaxMaterialsBudget] = useState("");

  const canCreate = user ? canCreateObra(user.role) : false;
  const isAdmin = user?.role === "pagos";

  const load = useCallback(async () => {
    const [oRes, ordRes] = await Promise.all([
      fetch("/api/obras", { credentials: "include" }),
      fetch("/api/orders", { credentials: "include" }),
    ]);
    if (oRes.ok) {
      const d = (await oRes.json()) as { obras: ObraDto[] };
      setObras(d.obras);
    }
    if (ordRes.ok) {
      const d = (await ordRes.json()) as { orders: PurchaseOrderDto[] };
      setOrders(d.orders);
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
      if (!res.ok || !data.obra) throw new Error(data.error ?? "Error al crear.");
      showSuccess("Obra creada.");
      setName("");
      setCode("");
      setClient("");
      setManagerName("");
      setStartDate("");
      setEstimatedEndDate("");
      setMaxMaterialsBudget("");
      setShowCreate(false);
      await load();
    } catch (err) {
      showError(err instanceof Error ? err.message : "Error.");
    } finally {
      setBusy(false);
    }
  }

  async function deleteObra(obra: ObraDto, e: React.MouseEvent) {
    e.stopPropagation();
    const message =
      orders.filter((o) => o.obraId === obra.id).length > 0
        ? `Se eliminará la obra «${obra.name}» y todas sus órdenes de compra asociadas.`
        : `Se eliminará la obra «${obra.name}» del catálogo.`;
    const ok = await confirmDelete({
      title: "Eliminar obra",
      message,
    });
    if (!ok) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/obras/${obra.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "No se pudo eliminar la obra.");
      showSuccess("Obra eliminada.");
      await load();
    } catch (err) {
      showError(err instanceof Error ? err.message : "Error al eliminar.");
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <LoadingScreen message="Cargando obras" />;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 sm:text-3xl">Obras</h1>
          <p className="mt-1 text-sm text-zinc-600">
            Todas las obras del consorcio. Haz clic en una para ver sus órdenes de compra.
          </p>
        </div>
        <div className="flex gap-2">
          {canCreate && (
            <button type="button" className="btn-secondary" onClick={() => setShowCreate((v) => !v)}>
              <IconBuilding />
              {showCreate ? "Cerrar formulario" : "Nueva obra"}
            </button>
          )}
          {user && canCreateOrder(user.role) && (
            <Link href="/ordenes/nueva" className="btn-primary">
              <IconPlus />
              Nueva OC
            </Link>
          )}
        </div>
      </div>

      {showCreate && canCreate && (
        <section className="card p-5">
          <h2 className="text-lg font-bold">Registrar nueva obra</h2>
          <form onSubmit={createObra} className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="block sm:col-span-2">
              <span className="text-sm font-medium">Nombre *</span>
              <input value={name} onChange={(e) => setName(e.target.value)} required className={inputCls} />
            </label>
            <label className="block">
              <span className="text-sm font-medium">Código</span>
              <input value={code} onChange={(e) => setCode(e.target.value)} className={inputCls} />
            </label>
            <label className="block">
              <span className="text-sm font-medium">Cliente</span>
              <input value={client} onChange={(e) => setClient(e.target.value)} className={inputCls} />
            </label>
            <label className="block sm:col-span-2">
              <span className="text-sm font-medium">Residente / gerente</span>
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
            <button type="submit" disabled={busy} className="btn-primary sm:col-span-2">
              Crear obra
            </button>
          </form>
        </section>
      )}

      <section className="card overflow-hidden">
        <div className="border-b border-orange-50 px-4 py-3">
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre, código o cliente…"
            className="h-10 w-full max-w-md rounded-xl border border-zinc-200 px-3 text-sm shadow-sm"
          />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px] text-left text-sm">
            <thead className="bg-orange-50/80 text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
              <tr>
                <th className="px-3 py-2">Código</th>
                <th className="px-3 py-2">Obra</th>
                <th className="px-3 py-2">Cliente</th>
                <th className="px-3 py-2">Estado</th>
                <th className="px-3 py-2 text-right">OC</th>
                <th className="px-3 py-2 text-right">Comprado</th>
                <th className="px-3 py-2 text-right">Pagado</th>
                {isAdmin && <th className="px-3 py-2 text-right">Acción</th>}
                <th className="px-3 py-2 w-8" />
              </tr>
            </thead>
            <tbody>
              {visible.length === 0 ? (
                <tr>
                  <td colSpan={isAdmin ? 9 : 8} className="px-4 py-12 text-center text-zinc-500">
                    No hay obras con ese criterio.
                  </td>
                </tr>
              ) : (
                visible.map((obra) => {
                  const fin = computeObraFinancials(orders, obra.id);
                  const ocCount = orders.filter((o) => o.obraId === obra.id && o.status !== "draft").length;
                  return (
                    <tr
                      key={obra.id}
                      className="cursor-pointer border-b border-orange-50/80 transition hover:bg-orange-50/50"
                      onClick={() => router.push(`/obras/${obra.id}`)}
                    >
                      <td className="px-3 py-3 font-medium text-zinc-700">{obraDisplayCode(obra)}</td>
                      <td className="px-3 py-3 font-semibold text-zinc-900">{obra.name}</td>
                      <td className="px-3 py-3 text-zinc-600">{obra.client || "—"}</td>
                      <td className="px-3 py-3">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                            obra.active ? "bg-emerald-100 text-emerald-800" : "bg-zinc-200 text-zinc-600"
                          }`}
                        >
                          {obra.active ? "Activa" : "Inactiva"}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-right tabular-nums">{ocCount}</td>
                      <td className="px-3 py-3 text-right tabular-nums font-medium">
                        {formatMoney(fin.totalComprado, "MXN")}
                      </td>
                      <td className="px-3 py-3 text-right tabular-nums font-medium text-emerald-700">
                        {formatMoney(fin.totalPagado, "MXN")}
                      </td>
                      {isAdmin && (
                        <td className="px-3 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            disabled={busy}
                            className="text-xs font-semibold text-red-700 hover:underline disabled:opacity-50"
                            onClick={(e) => void deleteObra(obra, e)}
                          >
                            Eliminar
                          </button>
                        </td>
                      )}
                      <td className="px-3 py-3 text-orange-600">→</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
