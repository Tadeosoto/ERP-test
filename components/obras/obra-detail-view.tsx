"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { ObraOrdersPanel } from "@/components/obras/obra-orders-panel";
import { ObraMaterialsBudgetPanel } from "@/components/obras/obra-materials-budget-panel";
import { ObraExpedientesPanel } from "@/components/obras/obra-expedientes-panel";
import { IconPlus, IconSave } from "@/components/ui/action-icons";
import { LoadingScreen } from "@/components/ui/loading-screen";
import { useFeedback } from "@/components/ui/feedback-provider";
import { useConfirmDelete } from "@/components/ui/confirm-delete-provider";
import { useSession } from "@/components/session-provider";
import { computeObraFinancials } from "@/lib/dashboard/compras-dashboard";
import { canCreateOrder, canConfigureObra } from "@/lib/domain/transitions";
import {
  computeMaterialsBudgetStats,
  computeMaterialsSpent,
} from "@/lib/obras/materials-budget";
import type { DirectExpenseDto, ObraDto, PurchaseOrderDto } from "@/lib/domain/types";
import {
  formatAmountInput,
  formatDateShort,
  formatMoney,
  parseAmountInput,
  sanitizeAmountInput,
} from "@/lib/format";
import { PagosProcesoBListPanel } from "@/components/dashboard/pagos-direct-expenses-panel";

function obraDisplayCode(obra: ObraDto): string {
  if (obra.code.trim()) return obra.code;
  const year = new Date(obra.createdAt).getFullYear();
  const suffix = obra.id.replace(/-/g, "").slice(-3).toUpperCase();
  return `OBR-${year}-${suffix}`;
}

export function ObraDetailView({ obraId }: { obraId: string }) {
  const router = useRouter();
  const { user } = useSession();
  const { showSuccess, showError } = useFeedback();
  const { confirmDelete } = useConfirmDelete();
  const [obra, setObra] = useState<ObraDto | null>(null);
  const [orders, setOrders] = useState<PurchaseOrderDto[]>([]);
  const [expenses, setExpenses] = useState<DirectExpenseDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [busy, setBusy] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [editCode, setEditCode] = useState("");
  const [editClient, setEditClient] = useState("");
  const [editManager, setEditManager] = useState("");
  const [editActive, setEditActive] = useState(true);
  const [editMaxMaterialsBudget, setEditMaxMaterialsBudget] = useState("");

  const load = useCallback(async () => {
    const [oRes, ordRes, expRes] = await Promise.all([
      fetch(`/api/obras/${obraId}`, { credentials: "include" }),
      fetch(`/api/orders?obraId=${obraId}`, { credentials: "include" }),
      fetch(`/api/direct-expenses?obraId=${obraId}&includeCompleted=1`, { credentials: "include" }),
    ]);
    if (oRes.ok) {
      const d = (await oRes.json()) as { obra: ObraDto };
      setObra(d.obra);
      setEditName(d.obra.name);
      setEditCode(d.obra.code);
      setEditClient(d.obra.client);
      setEditManager(d.obra.managerName);
      setEditActive(d.obra.active);
      setEditMaxMaterialsBudget(
        d.obra.maxMaterialsBudget > 0 ? formatAmountInput(d.obra.maxMaterialsBudget) : ""
      );
      setNotFound(false);
    } else {
      setObra(null);
      setNotFound(true);
    }
    if (ordRes.ok) {
      const d = (await ordRes.json()) as { orders: PurchaseOrderDto[] };
      setOrders(d.orders);
    }
    if (expRes.ok) {
      const d = (await expRes.json()) as { expenses: DirectExpenseDto[] };
      setExpenses(d.expenses);
    }
    setLoading(false);
  }, [obraId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) return <LoadingScreen message="Cargando obra" />;

  if (notFound || !obra) {
    return (
      <div className="card p-8 text-center">
        <p className="text-base text-zinc-600">Obra no encontrada.</p>
        <Link href="/obras" className="mt-4 inline-block text-orange-700 underline">
          Volver a obras
        </Link>
      </div>
    );
  }

  const fin = computeObraFinancials(orders, obra.id);
  const materialsSpent = computeMaterialsSpent(orders, expenses, obra.id);
  const budgetStats = computeMaterialsBudgetStats(obra.maxMaterialsBudget, materialsSpent);
  const pctPagado = fin.totalComprado > 0 ? Math.round((fin.totalPagado / fin.totalComprado) * 100) : 0;
  const pctPendiente = 100 - pctPagado;
  const canEditObra = user ? canConfigureObra(user.role) : false;
  const canDelete = user?.role === "pagos";

  async function saveObra(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await fetch(`/api/obras/${obraId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: editName,
          code: editCode,
          client: editClient,
          managerName: editManager,
          active: editActive,
          maxMaterialsBudget: parseAmountInput(editMaxMaterialsBudget),
        }),
      });
      const data = (await res.json()) as { obra?: ObraDto; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Error al guardar.");
      setObra(data.obra ?? null);
      setEditOpen(false);
      showSuccess("Obra actualizada.");
    } catch (err) {
      showError(err instanceof Error ? err.message : "Error al guardar.");
    } finally {
      setBusy(false);
    }
  }

  async function deleteObra() {
    if (!obra) return;
    const message =
      orders.length > 0
        ? `Se eliminará la obra «${obra.name}» y sus ${orders.length} orden(es) de compra asociadas.`
        : `Se eliminará la obra «${obra.name}» del catálogo.`;
    const ok = await confirmDelete({
      title: "Eliminar obra",
      message,
    });
    if (!ok) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/obras/${obraId}`, {
        method: "DELETE",
        credentials: "include",
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "No se pudo eliminar la obra.");
      showSuccess("Obra eliminada.");
      router.push("/obras");
      router.refresh();
    } catch (err) {
      showError(err instanceof Error ? err.message : "Error al eliminar.");
    } finally {
      setBusy(false);
    }
  }

  const kpis = [
    {
      label: "Órdenes de compra",
      value: String(orders.filter((o) => o.status !== "draft").length),
      sub: "Total de OC en la obra",
      accent: "border-l-sky-400 bg-sky-50/40",
    },
    {
      label: "Comprado (OC)",
      value: formatMoney(fin.totalComprado, "MXN"),
      sub: "Monto total de OC",
      accent: "border-l-emerald-400 bg-emerald-50/35",
    },
    {
      label: "Pagado",
      value: formatMoney(fin.totalPagado, "MXN"),
      sub: `${pctPagado}% del comprado`,
      accent: "border-l-violet-400 bg-violet-50/35",
    },
    {
      label: "Pendiente de pago",
      value: formatMoney(fin.saldoPendiente, "MXN"),
      sub: `${pctPendiente}% del comprado`,
      accent: "border-l-orange-400 bg-orange-50/40",
    },
    {
      label: "Facturas pendientes",
      value: String(fin.facturasPendientes),
      sub: "Por recibir o validar",
      accent: "border-l-teal-400 bg-teal-50/35",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <Link href="/obras" className="text-sm font-medium text-orange-700 hover:underline">
          ← Todas las obras
        </Link>
        <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-bold text-zinc-900 sm:text-3xl">{obra.name}</h1>
              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                  obra.active ? "bg-emerald-100 text-emerald-800" : "bg-zinc-200 text-zinc-600"
                }`}
              >
                {obra.active ? "Obra activa" : "Obra inactiva"}
              </span>
            </div>
            <p className="mt-1 text-sm text-zinc-500">{obraDisplayCode(obra)}</p>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-zinc-600">
              {obra.client && <span>Cliente: {obra.client}</span>}
              {obra.startDate && <span>Inicio: {formatDateShort(obra.startDate)}</span>}
              {obra.estimatedEndDate && <span>Fin estimado: {formatDateShort(obra.estimatedEndDate)}</span>}
              {obra.managerName && <span>Residente: {obra.managerName}</span>}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {user && canCreateOrder(user.role) && obra.active && (
              <Link href={`/ordenes/nueva?obraId=${obra.id}`} className="btn-primary text-sm">
                <IconPlus />
                Nueva orden en esta obra
              </Link>
            )}
            {canEditObra && (
              <button type="button" className="btn-secondary text-sm" onClick={() => setEditOpen((v) => !v)}>
                Editar obra
              </button>
            )}
            {canDelete && (
              <button type="button" disabled={busy} className="btn-danger text-sm" onClick={() => void deleteObra()}>
                Eliminar obra
              </button>
            )}
          </div>
        </div>
      </div>

      <ObraMaterialsBudgetPanel stats={budgetStats} />

      <ObraExpedientesPanel obraId={obra.id} obraName={obra.name} />

      {editOpen && canEditObra && (
        <section className="card p-5">
          <h2 className="text-lg font-bold text-zinc-900">Editar obra</h2>
          <form onSubmit={saveObra} className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="block sm:col-span-2">
              <span className="text-sm font-medium">Nombre</span>
              <input value={editName} onChange={(e) => setEditName(e.target.value)} required className="mt-1 w-full rounded-xl border px-3 py-2 text-sm" />
            </label>
            <label className="block">
              <span className="text-sm font-medium">Código</span>
              <input value={editCode} onChange={(e) => setEditCode(e.target.value)} className="mt-1 w-full rounded-xl border px-3 py-2 text-sm" />
            </label>
            <label className="block">
              <span className="text-sm font-medium">Cliente</span>
              <input value={editClient} onChange={(e) => setEditClient(e.target.value)} className="mt-1 w-full rounded-xl border px-3 py-2 text-sm" />
            </label>
            <label className="block sm:col-span-2">
              <span className="text-sm font-medium">Residente / gerente</span>
              <input value={editManager} onChange={(e) => setEditManager(e.target.value)} className="mt-1 w-full rounded-xl border px-3 py-2 text-sm" />
            </label>
            <label className="block sm:col-span-2">
              <span className="text-sm font-medium">Monto máximo de materiales (MXN)</span>
              <input
                value={editMaxMaterialsBudget}
                onChange={(e) => setEditMaxMaterialsBudget(sanitizeAmountInput(e.target.value))}
                inputMode="decimal"
                placeholder="Ej. 800000"
                className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
              />
              <span className="mt-1 block text-xs text-zinc-500">
                Límite acordado con el mandante; superarlo implica pérdida para la obra.
              </span>
            </label>
            <label className="flex items-center gap-2 sm:col-span-2">
              <input type="checkbox" checked={editActive} onChange={(e) => setEditActive(e.target.checked)} />
              <span className="text-sm">Obra activa</span>
            </label>
            <button type="submit" disabled={busy} className="btn-secondary sm:col-span-2">
              <IconSave />
              Guardar cambios
            </button>
          </form>
        </section>
      )}

      <div className="grid grid-cols-2 gap-2 lg:grid-cols-5 lg:gap-3">
        {kpis.map((k) => (
          <div
            key={k.label}
            className={`rounded-2xl border border-orange-100/80 border-l-4 p-3 shadow-sm ${k.accent}`}
          >
            <p className="text-[11px] font-medium text-zinc-600 lg:text-xs">{k.label}</p>
            <p className="mt-1 text-lg font-bold tabular-nums text-zinc-900 xl:text-xl">{k.value}</p>
            <p className="mt-0.5 text-[10px] text-zinc-500">{k.sub}</p>
          </div>
        ))}
      </div>

      <ObraOrdersPanel orders={orders} onOrderMutated={() => void load()} />

      {expenses.length > 0 && (
        <PagosProcesoBListPanel
          expenses={expenses}
          role={user?.role}
          title="Gastos directos de esta obra (Proceso B)"
          subtitle="Sin OC — visibles aunque no haya orden de compra"
          emptyMessage="Esta obra no tiene gastos directos."
        />
      )}
    </div>
  );
}
