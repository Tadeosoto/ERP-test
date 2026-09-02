"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { CalmKpiTile } from "@/components/dashboard/calm-kpi-tile";
import { LoadingScreen } from "@/components/ui/loading-screen";
import { useSession } from "@/components/session-provider";
import { materialRequestCode } from "@/lib/dashboard/ingeniero-dashboard";
import {
  filterMaterialRequests,
  MATERIAL_REQUEST_KPI_CONFIG,
  materialRequestKpiCounts,
  materialRequestStatusTone,
  type MaterialRequestSort,
  type MaterialRequestTab,
  uniqueEngineers,
} from "@/lib/dashboard/material-requests-dashboard";
import { MATERIAL_REQUEST_STATUS_LABEL } from "@/lib/domain/solicitudes";
import { canActAsCompras } from "@/lib/domain/transitions";
import type { MaterialRequestDto, ObraDto } from "@/lib/domain/types";
import { formatDateTime } from "@/lib/format";

const PAGE_SIZES = [10, 20, 40] as const;

export function MaterialRequestsListView() {
  const { user } = useSession();
  const canManage = user ? canActAsCompras(user.role) : false;

  const [requests, setRequests] = useState<MaterialRequestDto[]>([]);
  const [obras, setObras] = useState<ObraDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<MaterialRequestTab>("pendientes");
  const [search, setSearch] = useState("");
  const [obraId, setObraId] = useState("all");
  const [engineerId, setEngineerId] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [sort, setSort] = useState<MaterialRequestSort>("sent_desc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<(typeof PAGE_SIZES)[number]>(20);

  const load = useCallback(async () => {
    const [rRes, oRes] = await Promise.all([
      fetch("/api/material-requests?all=1", { credentials: "include" }),
      fetch("/api/obras", { credentials: "include" }),
    ]);
    if (rRes.ok) {
      const d = (await rRes.json()) as { requests: MaterialRequestDto[] };
      setRequests(d.requests);
    }
    if (oRes.ok) {
      const d = (await oRes.json()) as { obras: ObraDto[] };
      setObras(d.obras);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const kpiCounts = useMemo(() => materialRequestKpiCounts(requests), [requests]);
  const engineers = useMemo(() => uniqueEngineers(requests), [requests]);

  const filtered = useMemo(
    () =>
      filterMaterialRequests({
        requests,
        tab,
        obraId,
        engineerId,
        search,
        dateFrom,
        dateTo,
        sort,
      }),
    [requests, tab, obraId, engineerId, search, dateFrom, dateTo, sort]
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageRows = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, safePage, pageSize]);

  if (!canManage && !loading) {
    return (
      <div className="card py-12 text-center text-sm text-zinc-500">
        No tienes acceso a las solicitudes de Ingeniería.
      </div>
    );
  }

  if (loading) return <LoadingScreen message="Cargando solicitudes de Ingeniería" />;

  return (
    <div className="space-y-4 lg:space-y-5">
      <div>
        <p className="text-xs font-bold uppercase tracking-wide text-orange-600">Proceso A</p>
        <h1 className="text-2xl font-bold text-zinc-900 sm:text-3xl">Solicitudes de Ingeniería</h1>
        <p className="mt-1 text-sm text-zinc-600">
          Solicitudes de material enviadas por Ingeniería. Cotiza, crea la OC y sube el PDF.
        </p>
      </div>

      <div className="dash-grid-3">
        {MATERIAL_REQUEST_KPI_CONFIG.map((cfg) => (
          <CalmKpiTile
            key={cfg.key}
            label={cfg.label}
            value={kpiCounts[cfg.key]}
            sub={cfg.sublabel}
            tint={cfg.tint}
            selected={tab === cfg.tab && (cfg.key !== "en_oc" || tab === "realizadas")}
            onClick={() => {
              setTab(cfg.tab);
              setPage(1);
            }}
          />
        ))}
      </div>

      <section className="dash-panel overflow-hidden">
        <div className="flex flex-wrap items-end gap-2 border-b border-zinc-100 bg-zinc-50/60 px-4 py-3">
          <div className="flex gap-1">
            {(
              [
                { key: "pendientes" as const, label: `Pendientes (${kpiCounts.pendientes})` },
                { key: "realizadas" as const, label: `Realizadas (${kpiCounts.realizadas})` },
                {
                  key: "todas" as const,
                  label: `Todas (${requests.filter((r) => r.status !== "draft").length})`,
                },
              ] as const
            ).map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => {
                  setTab(t.key);
                  setPage(1);
                }}
                className={`rounded-t-lg px-3 py-2 text-xs font-semibold sm:text-sm ${
                  tab === t.key ? "bg-orange-100 text-orange-900" : "text-zinc-600 hover:bg-zinc-50"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-end gap-2 border-b border-zinc-100 px-4 py-3">
          <label className="flex min-w-[12rem] flex-1 flex-col gap-1 text-xs text-zinc-500">
            Buscar
            <input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Obra, ingeniero, material, folio…"
              className="min-h-10 rounded-xl border border-zinc-200 px-3 text-sm text-zinc-900"
            />
          </label>
          <label className="flex min-w-[10rem] flex-col gap-1 text-xs text-zinc-500">
            Obra
            <select
              value={obraId}
              onChange={(e) => {
                setObraId(e.target.value);
                setPage(1);
              }}
              className="min-h-10 rounded-xl border border-zinc-200 px-3 text-sm"
            >
              <option value="all">Todas</option>
              {obras.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex min-w-[10rem] flex-col gap-1 text-xs text-zinc-500">
            Ingeniero
            <select
              value={engineerId}
              onChange={(e) => {
                setEngineerId(e.target.value);
                setPage(1);
              }}
              className="min-h-10 rounded-xl border border-zinc-200 px-3 text-sm"
            >
              <option value="all">Todos</option>
              {engineers.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs text-zinc-500">
            Desde
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => {
                setDateFrom(e.target.value);
                setPage(1);
              }}
              className="min-h-10 rounded-xl border border-zinc-200 px-3 text-sm"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-zinc-500">
            Hasta
            <input
              type="date"
              value={dateTo}
              onChange={(e) => {
                setDateTo(e.target.value);
                setPage(1);
              }}
              className="min-h-10 rounded-xl border border-zinc-200 px-3 text-sm"
            />
          </label>
          <label className="flex min-w-[10rem] flex-col gap-1 text-xs text-zinc-500">
            Ordenar
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as MaterialRequestSort)}
              className="min-h-10 rounded-xl border border-zinc-200 px-3 text-sm"
            >
              <option value="sent_desc">Fecha envío (reciente)</option>
              <option value="sent_asc">Fecha envío (antigua)</option>
              <option value="updated_desc">Última actualización</option>
              <option value="obra">Obra (A–Z)</option>
              <option value="ingeniero">Ingeniero (A–Z)</option>
            </select>
          </label>
          <button
            type="button"
            className="btn-secondary mb-0.5 text-sm"
            onClick={() => {
              setSearch("");
              setObraId("all");
              setEngineerId("all");
              setDateFrom("");
              setDateTo("");
              setSort("sent_desc");
              setPage(1);
            }}
          >
            Limpiar
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-zinc-50/80 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
              <tr>
                <th className="px-4 py-2.5">Folio</th>
                <th className="px-4 py-2.5">Obra</th>
                <th className="px-4 py-2.5">Ingeniero</th>
                <th className="px-4 py-2.5">Materiales</th>
                <th className="px-4 py-2.5">Enviada</th>
                <th className="px-4 py-2.5">Estado</th>
                <th className="px-4 py-2.5 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {pageRows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-sm text-zinc-500">
                    No hay solicitudes en esta vista.
                  </td>
                </tr>
              ) : (
                pageRows.map((r) => (
                  <tr key={r.id} className="hover:bg-zinc-50/60">
                    <td className="px-4 py-3">
                      <Link
                        href={`/solicitudes/material/${r.id}`}
                        className="font-semibold text-orange-800 hover:underline"
                      >
                        {materialRequestCode(r)}
                      </Link>
                    </td>
                    <td className="px-4 py-3 font-medium text-zinc-900">{r.obraName}</td>
                    <td className="px-4 py-3 text-zinc-700">{r.createdByName}</td>
                    <td className="max-w-[16rem] truncate px-4 py-3 text-zinc-600" title={r.materials}>
                      {r.materials}
                    </td>
                    <td className="px-4 py-3 text-xs tabular-nums text-zinc-500">
                      {r.sentAt ? formatDateTime(r.sentAt) : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ${materialRequestStatusTone(r.status)}`}
                      >
                        {MATERIAL_REQUEST_STATUS_LABEL[r.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex flex-wrap justify-end gap-1.5">
                        <Link
                          href={`/solicitudes/material/${r.id}`}
                          className="inline-flex rounded-lg border border-zinc-200 bg-white px-2 py-1 text-[11px] font-semibold text-zinc-700 hover:bg-zinc-50"
                        >
                          Ver
                        </Link>
                        {r.status === "sent" && (
                          <Link
                            href={`/ordenes/nueva?solicitudId=${r.id}`}
                            className="inline-flex rounded-lg bg-orange-600 px-2 py-1 text-[11px] font-semibold text-white hover:bg-orange-700"
                          >
                            Crear OC
                          </Link>
                        )}
                        {r.purchaseOrderId && (
                          <Link
                            href={`/ordenes/${r.purchaseOrderId}`}
                            className="inline-flex rounded-lg border border-sky-200 bg-sky-50 px-2 py-1 text-[11px] font-semibold text-sky-800 hover:bg-sky-100"
                          >
                            Ver OC
                          </Link>
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
            {filtered.length === 0
              ? "0"
              : `${(safePage - 1) * pageSize + 1}–${Math.min(safePage * pageSize, filtered.length)} de ${filtered.length}`}
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
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="rounded-lg border border-zinc-200 px-2 py-1 disabled:opacity-40"
          >
            Anterior
          </button>
          <span>
            {safePage} / {totalPages}
          </span>
          <button
            type="button"
            disabled={safePage >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            className="rounded-lg border border-zinc-200 px-2 py-1 disabled:opacity-40"
          >
            Siguiente
          </button>
        </div>
      </section>
    </div>
  );
}
