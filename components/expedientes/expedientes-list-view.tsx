"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { NuevoExpedienteModal } from "@/components/expedientes/nuevo-expediente-modal";
import { LoadingScreen } from "@/components/ui/loading-screen";
import { useSession } from "@/components/session-provider";
import { useConfirmDelete } from "@/components/ui/confirm-delete-provider";
import { useFeedback } from "@/components/ui/feedback-provider";
import { canCreateExpedientes, canDeleteExpedientes, canEditExpedientes } from "@/lib/domain/expedientes";
import type { ExpedienteListItemDto, ObraDto } from "@/lib/domain/types";
import { formatDateShort, formatMoney } from "@/lib/format";

const PAGE_SIZES = [8, 15, 25, 50] as const;

export function ExpedientesListView() {
  const { user } = useSession();
  const { showSuccess, showError } = useFeedback();
  const { confirmDelete } = useConfirmDelete();
  const [items, setItems] = useState<ExpedienteListItemDto[]>([]);
  const [obras, setObras] = useState<ObraDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<(typeof PAGE_SIZES)[number]>(15);
  const [createOpen, setCreateOpen] = useState(false);

  const canEdit = user ? canEditExpedientes(user.role) : false;
  const canCreate = user ? canCreateExpedientes(user.role) : false;
  const canDelete = user ? canDeleteExpedientes(user.role) : false;

  const load = useCallback(async () => {
    const [eRes, oRes] = await Promise.all([
      fetch(`/api/expedientes?limit=200${q ? `&q=${encodeURIComponent(q)}` : ""}`, {
        credentials: "include",
      }),
      fetch("/api/obras", { credentials: "include" }),
    ]);
    if (eRes.ok) {
      const d = (await eRes.json()) as { expedientes: ExpedienteListItemDto[] };
      setItems(d.expedientes);
    }
    if (oRes.ok) {
      const d = (await oRes.json()) as { obras: ObraDto[] };
      setObras(d.obras);
    }
    setLoading(false);
  }, [q]);

  useEffect(() => {
    const t = setTimeout(() => void load(), 200);
    return () => clearTimeout(t);
  }, [load]);

  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageItems = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return items.slice(start, start + pageSize);
  }, [items, safePage, pageSize]);

  async function remove(e: ExpedienteListItemDto) {
    const ok = await confirmDelete({
      title: "Eliminar expediente",
      message: `Se eliminará ${e.folio} — ${e.name}. Solo si no tiene elementos vinculados.`,
    });
    if (!ok) return;
    try {
      const res = await fetch(`/api/expedientes/${e.id}`, { method: "DELETE", credentials: "include" });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "No se pudo eliminar.");
      showSuccess("Expediente eliminado.");
      void load();
    } catch (err) {
      showError(err instanceof Error ? err.message : "No se pudo eliminar.");
    }
  }

  if (loading) return <LoadingScreen message="Cargando expedientes" />;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Expedientes</h1>
          <p className="mt-1 text-sm text-zinc-600">
            Contenedores dentro de una obra. Agrupan órdenes de compra y pagos Proceso C.
          </p>
        </div>
        {canCreate && (
          <button type="button" className="btn-primary" onClick={() => setCreateOpen(true)}>
            + Nuevo expediente
          </button>
        )}
      </div>

      <div className="card overflow-hidden">
        <div className="flex flex-wrap items-center gap-2 border-b border-zinc-100 px-4 py-3">
          <input
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(1);
            }}
            placeholder="Buscar folio o nombre de expediente…"
            className="min-h-10 min-w-[16rem] flex-1 rounded-xl border border-zinc-200 px-3 text-sm"
          />
          <button type="button" className="btn-secondary text-sm" onClick={() => setQ("")}>
            Limpiar
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-zinc-50/80 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
              <tr>
                <th className="px-4 py-3">Folio de expediente</th>
                <th className="px-4 py-3">Nombre</th>
                <th className="px-4 py-3">Obra</th>
                <th className="px-4 py-3">Contenido</th>
                <th className="px-4 py-3">Total</th>
                <th className="px-4 py-3">Saldo</th>
                <th className="px-4 py-3">Estatus</th>
                <th className="px-4 py-3">Actualizado</th>
                <th className="px-4 py-3 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {pageItems.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-sm text-zinc-500">
                    No hay expedientes. {canCreate ? "Crea el primero con «+ Nuevo expediente»." : ""}
                  </td>
                </tr>
              ) : (
                pageItems.map((e) => (
                  <tr key={e.id} className="hover:bg-zinc-50/60">
                    <td className="px-4 py-3">
                      <Link
                        href={`/expedientes/${e.folio}`}
                        className="font-semibold text-violet-800 hover:underline"
                      >
                        {e.folio}
                      </Link>
                    </td>
                    <td className="max-w-[14rem] truncate px-4 py-3 font-medium text-zinc-900">{e.name}</td>
                    <td className="px-4 py-3 text-zinc-600">{e.obraName ?? "—"}</td>
                    <td className="px-4 py-3 text-xs text-zinc-600">
                      {e.ordersCount} OC · {e.procesoCCount} C
                    </td>
                    <td className="px-4 py-3 tabular-nums">{formatMoney(e.totalAmount, e.currency)}</td>
                    <td className="px-4 py-3 tabular-nums text-orange-700">
                      {formatMoney(e.amountRemaining, e.currency)}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex rounded-full bg-sky-50 px-2 py-0.5 text-[11px] font-semibold text-sky-800 ring-1 ring-sky-100">
                        {e.statusLabel}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-zinc-500">{formatDateShort(e.updatedAt)}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex flex-wrap justify-end gap-1.5">
                        <Link
                          href={`/expedientes/${e.folio}`}
                          className="inline-flex rounded-lg border border-zinc-200 bg-white px-2 py-1 text-[11px] font-semibold text-zinc-700 hover:bg-zinc-50"
                        >
                          Ver
                        </Link>
                        {canDelete && (
                          <button
                            type="button"
                            className="inline-flex rounded-lg border border-red-200 bg-white px-2 py-1 text-[11px] font-semibold text-red-700 hover:bg-red-50"
                            onClick={() => void remove(e)}
                          >
                            Eliminar
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-zinc-100 px-4 py-2 text-xs text-zinc-500">
          <span className="mr-auto">
            {items.length === 0
              ? "0"
              : `${(safePage - 1) * pageSize + 1}–${Math.min(safePage * pageSize, items.length)} de ${items.length}`}
          </span>
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value) as (typeof PAGE_SIZES)[number]);
              setPage(1);
            }}
            className="h-8 rounded-lg border border-zinc-200 px-2"
          >
            {PAGE_SIZES.map((n) => (
              <option key={n} value={n}>
                {n} / pág.
              </option>
            ))}
          </select>
          <button
            type="button"
            disabled={safePage <= 1}
            className="h-8 min-w-8 rounded-lg border border-zinc-200 disabled:opacity-40"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            ‹
          </button>
          <span className="tabular-nums">
            {safePage}/{totalPages}
          </span>
          <button
            type="button"
            disabled={safePage >= totalPages}
            className="h-8 min-w-8 rounded-lg border border-zinc-200 disabled:opacity-40"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          >
            ›
          </button>
        </div>
      </div>

      <NuevoExpedienteModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSaved={() => void load()}
        obras={obras}
      />
    </div>
  );
}
