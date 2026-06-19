"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { IconPlus } from "@/components/ui/action-icons";
import { LoadingScreen } from "@/components/ui/loading-screen";
import { computeObraFinancials } from "@/lib/dashboard/compras-dashboard";
import type { ObraDto, PurchaseOrderDto } from "@/lib/domain/types";
import { formatDateShort, formatMoney } from "@/lib/format";

function obraDisplayCode(obra: ObraDto): string {
  if (obra.code.trim()) return obra.code;
  const year = new Date(obra.createdAt).getFullYear();
  const suffix = obra.id.replace(/-/g, "").slice(-3).toUpperCase();
  return `OBR-${year}-${suffix}`;
}

export function ComprasObrasView({ onRegisterRefresh }: { onRegisterRefresh?: (fn: () => void) => void }) {
  const [obras, setObras] = useState<ObraDto[]>([]);
  const [orders, setOrders] = useState<PurchaseOrderDto[]>([]);
  const [search, setSearch] = useState("");
  const [estadoFilter, setEstadoFilter] = useState("all");
  const [managerFilter, setManagerFilter] = useState("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const pageSize = 15;

  const load = useCallback(async () => {
    const [oRes, ordRes] = await Promise.all([
      fetch("/api/obras", { credentials: "include" }),
      fetch("/api/orders", { credentials: "include" }),
    ]);
    if (oRes.ok) {
      const d = (await oRes.json()) as { obras: ObraDto[] };
      const active = d.obras.filter((o) => o.active);
      setObras(active);
      if (!selectedId && active[0]) setSelectedId(active[0].id);
    }
    if (ordRes.ok) {
      const d = (await ordRes.json()) as { orders: PurchaseOrderDto[] };
      setOrders(d.orders);
    }
    setLoading(false);
  }, [selectedId]);

  useEffect(() => {
    void load();
    onRegisterRefresh?.(() => void load());
  }, [load, onRegisterRefresh]);

  const managers = useMemo(() => {
    const set = new Set(obras.map((o) => o.managerName).filter(Boolean));
    return Array.from(set).sort();
  }, [obras]);

  const filtered = useMemo(() => {
    let list = obras.filter((o) => o.active);
    if (estadoFilter === "activas") list = list.filter((o) => o.active);
    if (managerFilter !== "all") list = list.filter((o) => o.managerName === managerFilter);
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (o) =>
          o.name.toLowerCase().includes(q) ||
          o.code.toLowerCase().includes(q) ||
          o.client.toLowerCase().includes(q) ||
          obraDisplayCode(o).toLowerCase().includes(q)
      );
    }
    return list;
  }, [obras, search, estadoFilter, managerFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageItems = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  const selected = obras.find((o) => o.id === selectedId) ?? null;
  const selectedFin = selected ? computeObraFinancials(orders, selected.id) : null;

  if (loading) return <LoadingScreen message="Cargando obras" />;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 sm:text-3xl">Obras</h1>
          <p className="mt-1 text-sm text-zinc-600">
            Consulta y administra las obras activas del consorcio.
          </p>
        </div>
        <Link href="/ordenes/nueva" className="btn-primary">
          <IconPlus />
          Nueva OC
        </Link>
      </div>

      <div className="flex flex-col gap-6 xl:grid xl:grid-cols-[1fr_320px]">
        <section className="card overflow-hidden">
          <div className="border-b border-orange-50 px-4 py-4 sm:px-5">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-lg font-bold text-zinc-900">Lista de obras activas</h2>
              <span className="text-sm text-zinc-500">{filtered.length} obras</span>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="relative sm:col-span-2">
                <input
                  type="search"
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  placeholder="Buscar por nombre de obra, código o cliente…"
                  className="h-11 w-full rounded-xl border border-zinc-200 bg-white py-2 pl-4 pr-10 text-sm shadow-sm focus:border-orange-300 focus:outline-none focus:ring-1 focus:ring-orange-200"
                />
              </div>
              <select
                value={estadoFilter}
                onChange={(e) => setEstadoFilter(e.target.value)}
                className="h-11 rounded-xl border border-zinc-200 bg-white px-3 text-sm font-medium shadow-sm"
              >
                <option value="all">Estado: Todas</option>
                <option value="activas">En ejecución</option>
              </select>
              <select
                value={managerFilter}
                onChange={(e) => setManagerFilter(e.target.value)}
                className="h-11 rounded-xl border border-zinc-200 bg-white px-3 text-sm font-medium shadow-sm"
              >
                <option value="all">Gerente: Todos</option>
                {managers.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="button"
              onClick={() => {
                setSearch("");
                setEstadoFilter("all");
                setManagerFilter("all");
                setPage(1);
              }}
              className="mt-3 text-sm font-medium text-orange-700 hover:underline"
            >
              Limpiar filtros
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="bg-orange-50/80 text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
                <tr>
                  <th className="px-3 py-2">Código</th>
                  <th className="px-3 py-2">Nombre de la obra</th>
                  <th className="px-3 py-2">Cliente</th>
                  <th className="px-3 py-2">Gerente</th>
                  <th className="px-3 py-2">Inicio</th>
                  <th className="px-3 py-2">Fin estimado</th>
                  <th className="px-3 py-2 text-right">Comprado</th>
                  <th className="px-3 py-2 text-right">Pagado</th>
                  <th className="px-3 py-2 text-right">Saldo pend.</th>
                  <th className="px-3 py-2 text-center">Fact. pend.</th>
                  <th className="px-3 py-2 w-8" />
                </tr>
              </thead>
              <tbody>
                {pageItems.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="px-4 py-12 text-center text-zinc-500">
                      No hay obras con estos filtros.
                    </td>
                  </tr>
                ) : (
                  pageItems.map((obra) => {
                    const fin = computeObraFinancials(orders, obra.id);
                    const selected_row = obra.id === selectedId;
                    return (
                      <tr
                        key={obra.id}
                        onClick={() => setSelectedId(obra.id)}
                        className={`cursor-pointer border-b border-orange-50/80 transition hover:bg-orange-50/50 ${selected_row ? "bg-orange-50/70" : ""}`}
                      >
                        <td className="px-3 py-2.5 font-medium text-zinc-800">{obraDisplayCode(obra)}</td>
                        <td className="px-3 py-2.5 font-medium text-zinc-900">{obra.name}</td>
                        <td className="px-3 py-2.5 text-zinc-600">{obra.client || "—"}</td>
                        <td className="px-3 py-2.5 text-zinc-600">{obra.managerName || "—"}</td>
                        <td className="px-3 py-2.5 tabular-nums text-zinc-600">
                          {obra.startDate ? formatDateShort(obra.startDate) : "—"}
                        </td>
                        <td className="px-3 py-2.5 tabular-nums text-zinc-600">
                          {obra.estimatedEndDate ? formatDateShort(obra.estimatedEndDate) : "—"}
                        </td>
                        <td className="px-3 py-2.5 text-right tabular-nums font-medium">
                          {formatMoney(fin.totalComprado, "MXN")}
                        </td>
                        <td className="px-3 py-2.5 text-right tabular-nums font-medium text-emerald-700">
                          {formatMoney(fin.totalPagado, "MXN")}
                        </td>
                        <td className="px-3 py-2.5 text-right tabular-nums font-bold text-orange-600">
                          {formatMoney(fin.saldoPendiente, "MXN")}
                        </td>
                        <td className="px-3 py-2.5 text-center tabular-nums font-semibold text-red-600">
                          {fin.facturasPendientes}
                        </td>
                        <td className="px-3 py-2.5 text-zinc-400">⋯</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between border-t border-orange-50 px-4 py-3 text-xs text-zinc-500">
            <span>
              {(safePage - 1) * pageSize + 1}–{Math.min(safePage * pageSize, filtered.length)} de{" "}
              {filtered.length} obras
            </span>
            <div className="flex gap-1">
              <button
                type="button"
                disabled={safePage <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="rounded-lg border border-orange-100 px-2 py-1 disabled:opacity-40"
              >
                ‹
              </button>
              <span className="px-2 tabular-nums">
                {safePage}/{totalPages}
              </span>
              <button
                type="button"
                disabled={safePage >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="rounded-lg border border-orange-100 px-2 py-1 disabled:opacity-40"
              >
                ›
              </button>
            </div>
          </div>
        </section>

        {selected && selectedFin && (
          <aside className="card h-fit p-5">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-lg font-bold text-zinc-900">Resumen de la obra</h2>
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800">
                En ejecución
              </span>
            </div>
            <p className="mt-2 text-xs text-zinc-500">{obraDisplayCode(selected)}</p>
            <p className="text-lg font-bold text-zinc-900">{selected.name}</p>
            <dl className="mt-4 space-y-2 text-sm">
              {selected.client && (
                <div className="flex gap-2">
                  <dt className="text-zinc-500">Cliente:</dt>
                  <dd className="font-medium">{selected.client}</dd>
                </div>
              )}
              {selected.managerName && (
                <div className="flex gap-2">
                  <dt className="text-zinc-500">Gerente:</dt>
                  <dd className="font-medium">{selected.managerName}</dd>
                </div>
              )}
              {selected.startDate && (
                <div className="flex gap-2">
                  <dt className="text-zinc-500">Inicio:</dt>
                  <dd>{formatDateShort(selected.startDate)}</dd>
                </div>
              )}
              {selected.estimatedEndDate && (
                <div className="flex gap-2">
                  <dt className="text-zinc-500">Fin estimado:</dt>
                  <dd>{formatDateShort(selected.estimatedEndDate)}</dd>
                </div>
              )}
            </dl>
            <ul className="mt-5 space-y-3 text-sm">
              <li className="flex justify-between">
                <span className="text-zinc-600">Comprado</span>
                <span className="font-semibold tabular-nums">{formatMoney(selectedFin.totalComprado, "MXN")}</span>
              </li>
              <li className="flex justify-between">
                <span className="text-zinc-600">Pagado</span>
                <span className="font-semibold tabular-nums text-emerald-700">
                  {formatMoney(selectedFin.totalPagado, "MXN")}
                </span>
              </li>
              <li className="flex justify-between">
                <span className="text-zinc-600">Saldo pendiente</span>
                <span className="font-bold tabular-nums text-orange-600">
                  {formatMoney(selectedFin.saldoPendiente, "MXN")}
                </span>
              </li>
              <li className="flex justify-between">
                <span className="text-zinc-600">Facturas pendientes</span>
                <span className="font-semibold tabular-nums text-violet-700">{selectedFin.facturasPendientes}</span>
              </li>
            </ul>
            <Link
              href={`/obras/${selected.id}`}
              className="btn-primary mt-6 w-full justify-center text-sm"
            >
              Ver detalles de la obra →
            </Link>
          </aside>
        )}
      </div>
    </div>
  );
}
