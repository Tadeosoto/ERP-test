"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { LoadingScreen } from "@/components/ui/loading-screen";
import { useSession } from "@/components/session-provider";
import { canCreateExpedientes } from "@/lib/domain/expedientes";
import type { ExpedienteListItemDto } from "@/lib/domain/types";
import { formatDateShort, formatMoney } from "@/lib/format";

export function ObraExpedientesPanel({ obraId, obraName }: { obraId: string; obraName: string }) {
  const { user } = useSession();
  const [items, setItems] = useState<ExpedienteListItemDto[]>([]);
  const [loading, setLoading] = useState(true);
  const canCreate = user ? canCreateExpedientes(user.role) : false;

  const load = useCallback(async () => {
    const res = await fetch(`/api/expedientes?obraId=${encodeURIComponent(obraId)}&limit=50`, {
      credentials: "include",
    });
    if (res.ok) {
      const d = (await res.json()) as { expedientes: ExpedienteListItemDto[] };
      setItems(d.expedientes);
    }
    setLoading(false);
  }, [obraId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <section className="dash-panel p-4">
        <LoadingScreen message="Cargando expedientes" />
      </section>
    );
  }

  return (
    <section className="dash-panel overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-100 bg-zinc-50/60 px-4 py-3">
        <div>
          <h2 className="text-sm font-semibold text-zinc-800">Expedientes de la obra</h2>
          <p className="dash-caption mt-0.5">
            Los expedientes viven dentro de «{obraName}» y agrupan OC y pagos Proceso C.
          </p>
        </div>
        {canCreate && (
          <Link href="/expedientes" className="btn-secondary text-xs">
            Ver en Expedientes
          </Link>
        )}
      </div>

      {items.length === 0 ? (
        <p className="px-4 py-8 text-center text-sm text-zinc-500">
          Esta obra aún no tiene expedientes.
          {canCreate ? " Créalos desde el módulo Expedientes asignando esta obra." : ""}
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-zinc-50/80 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
              <tr>
                <th className="px-4 py-2.5">Folio</th>
                <th className="px-4 py-2.5">Nombre</th>
                <th className="px-4 py-2.5">Contenido</th>
                <th className="px-4 py-2.5">Total</th>
                <th className="px-4 py-2.5">Estado</th>
                <th className="px-4 py-2.5">Actualizado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {items.map((e) => (
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
                  <td className="px-4 py-3 text-xs text-zinc-600">
                    {e.ordersCount} OC · {e.procesoCCount} C
                  </td>
                  <td className="px-4 py-3 tabular-nums">{formatMoney(e.totalAmount, e.currency)}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex rounded-full bg-sky-50 px-2 py-0.5 text-[11px] font-semibold text-sky-800 ring-1 ring-sky-100">
                      {e.statusLabel}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-zinc-500">{formatDateShort(e.updatedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
