"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { IconPlus } from "@/components/ui/action-icons";
import { LoadingScreen } from "@/components/ui/loading-screen";
import { useFeedback } from "@/components/ui/feedback-provider";
import { useSession } from "@/components/session-provider";
import { ProveedorModal } from "@/components/compras/proveedor-modal";
import { canManageSuppliers } from "@/lib/domain/transitions";
import type { PurchaseOrderDto, SupplierDto, SupplierListItemDto } from "@/lib/domain/types";
import {
  buildSupplierListItems,
  filterSuppliers,
  paginateItems,
  supplierKpiCounts,
  totalPages,
} from "@/lib/suppliers/supplier-utils";

const PAGE_SIZE_OPTIONS = [8, 15, 25, 50] as const;

const KPI_CONFIG = [
  {
    key: "activos" as const,
    label: "Proveedores activos",
    accent: "border-l-violet-400 bg-violet-50/40",
    iconBg: "bg-violet-100 text-violet-700",
  },
  {
    key: "inactivos" as const,
    label: "Proveedores inactivos",
    accent: "border-l-emerald-400 bg-emerald-50/35",
    iconBg: "bg-emerald-100 text-emerald-800",
  },
  {
    key: "porAprobar" as const,
    label: "Por aprobar",
    accent: "border-l-orange-400 bg-orange-50/40",
    iconBg: "bg-orange-100 text-orange-700",
  },
  {
    key: "documentacionCompleta" as const,
    label: "Con documentación completa",
    accent: "border-l-sky-400 bg-sky-50/35",
    iconBg: "bg-sky-100 text-sky-800",
  },
];

function KpiCard({ label, value, accent, iconBg }: { label: string; value: number; accent: string; iconBg: string }) {
  return (
    <div className={`rounded-2xl border border-zinc-200/80 border-l-4 bg-white p-4 shadow-sm ${accent}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">{label}</p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-zinc-900">{value}</p>
        </div>
        <span className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${iconBg}`}>
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
            />
          </svg>
        </span>
      </div>
    </div>
  );
}

function SupplierActionMenu({
  supplier,
  onEdit,
  onDelete,
}: {
  supplier: SupplierListItemDto;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0 });

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (btnRef.current?.contains(e.target as Node)) return;
      setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  useEffect(() => {
    if (!open || !btnRef.current) return;
    const rect = btnRef.current.getBoundingClientRect();
    setPos({ top: rect.bottom + 4, left: rect.right - 160 });
  }, [open]);

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
        aria-label={`Acciones para ${supplier.displayName}`}
        onClick={() => setOpen((v) => !v)}
      >
        <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
          <circle cx="12" cy="5" r="1.5" />
          <circle cx="12" cy="12" r="1.5" />
          <circle cx="12" cy="19" r="1.5" />
        </svg>
      </button>
      {open &&
        createPortal(
          <div
            className="fixed z-[200] w-40 overflow-hidden rounded-xl border border-zinc-200 bg-white py-1 shadow-lg"
            style={{ top: pos.top, left: pos.left }}
          >
            <button
              type="button"
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-zinc-700 hover:bg-zinc-50"
              onClick={() => {
                setOpen(false);
                onEdit();
              }}
            >
              Editar
            </button>
            <button
              type="button"
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50"
              onClick={() => {
                setOpen(false);
                onDelete();
              }}
            >
              Eliminar
            </button>
          </div>,
          document.body
        )}
    </>
  );
}

export function ProveedoresListView({ onRegisterRefresh }: { onRegisterRefresh?: (fn: () => void) => void }) {
  const { user } = useSession();
  const { showSuccess, showError } = useFeedback();
  const canManage = user ? canManageSuppliers(user.role) : false;

  const [suppliers, setSuppliers] = useState<SupplierDto[]>([]);
  const [orders, setOrders] = useState<PurchaseOrderDto[]>([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<(typeof PAGE_SIZE_OPTIONS)[number]>(15);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<SupplierDto | null>(null);

  const load = useCallback(async () => {
    const [sRes, oRes] = await Promise.all([
      fetch("/api/suppliers", { credentials: "include" }),
      fetch("/api/orders", { credentials: "include" }),
    ]);
    if (sRes.ok) {
      const d = (await sRes.json()) as { suppliers: SupplierDto[] };
      setSuppliers(d.suppliers);
    }
    if (oRes.ok) {
      const d = (await oRes.json()) as { orders: PurchaseOrderDto[] };
      setOrders(d.orders);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
    onRegisterRefresh?.(() => void load());
  }, [load, onRegisterRefresh]);

  const items = useMemo(() => buildSupplierListItems(suppliers, orders), [suppliers, orders]);
  const kpis = useMemo(() => supplierKpiCounts(items), [items]);
  const filtered = useMemo(() => filterSuppliers(items, search), [items, search]);
  const pages = useMemo(() => totalPages(filtered.length, pageSize), [filtered.length, pageSize]);
  const pageItems = useMemo(() => paginateItems(filtered, page, pageSize), [filtered, page, pageSize]);

  useEffect(() => {
    setPage(1);
  }, [search, pageSize]);

  useEffect(() => {
    if (page > pages) setPage(pages);
  }, [page, pages]);

  const pageNumbers = useMemo(() => {
    const nums: number[] = [];
    const max = Math.min(pages, 10);
    for (let i = 1; i <= max; i += 1) nums.push(i);
    return nums;
  }, [pages]);

  async function handleDelete(supplier: SupplierListItemDto) {
    const ok = window.confirm(
      `¿Eliminar a "${supplier.displayName}" del catálogo? Esta acción no se puede deshacer.`
    );
    if (!ok) return;
    try {
      const res = await fetch(`/api/suppliers/${supplier.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "No se pudo eliminar.");
      showSuccess("Proveedor eliminado.");
      await load();
    } catch (err) {
      showError(err instanceof Error ? err.message : "Error al eliminar.");
    }
  }

  function openCreate() {
    setEditingSupplier(null);
    setModalOpen(true);
  }

  function openEdit(supplier: SupplierDto) {
    setEditingSupplier(supplier);
    setModalOpen(true);
  }

  function handleSaved() {
    void load();
  }

  if (loading) return <LoadingScreen message="Cargando proveedores" />;

  const rangeStart = filtered.length === 0 ? 0 : (page - 1) * pageSize + 1;
  const rangeEnd = Math.min(page * pageSize, filtered.length);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 sm:text-3xl">Proveedores</h1>
          <p className="mt-1 text-sm text-zinc-600">
            Consulta y administra a los proveedores del catálogo del sistema.
          </p>
        </div>
        {canManage && (
          <button type="button" className="btn-primary" onClick={openCreate}>
            <IconPlus />
            Nuevo proveedor
          </button>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {KPI_CONFIG.map((cfg) => (
          <KpiCard
            key={cfg.key}
            label={cfg.label}
            value={kpis[cfg.key]}
            accent={cfg.accent}
            iconBg={cfg.iconBg}
          />
        ))}
      </div>

      <div className="relative">
        <svg
          className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar proveedor..."
          className="block w-full rounded-xl border border-zinc-200 bg-white py-3 pl-10 pr-4 text-sm shadow-sm focus:border-orange-300 focus:outline-none focus:ring-1 focus:ring-orange-200"
        />
      </div>

      <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-100 bg-zinc-50/80 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                <th className="px-4 py-3">Proveedor</th>
                <th className="px-4 py-3">RFC</th>
                <th className="px-4 py-3">Teléfono</th>
                <th className="px-4 py-3">Obra(s) relacionada(s)</th>
                <th className="px-4 py-3">Estado</th>
                {canManage && <th className="px-4 py-3 text-right">Acción</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {pageItems.length === 0 ? (
                <tr>
                  <td colSpan={canManage ? 6 : 5} className="px-4 py-12 text-center text-zinc-500">
                    {search.trim() ? "No hay proveedores que coincidan con la búsqueda." : "Aún no hay proveedores registrados."}
                  </td>
                </tr>
              ) : (
                pageItems.map((s) => (
                  <tr key={s.id} className="hover:bg-zinc-50/60">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-zinc-500">
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                            />
                          </svg>
                        </span>
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-zinc-900">{s.displayName}</p>
                          <p className="truncate text-xs text-zinc-500">{s.email || "—"}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-zinc-700">{s.rfc || "—"}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-zinc-700">{s.phone || "—"}</td>
                    <td className="px-4 py-3 text-zinc-700">
                      {s.relatedObras.length > 0 ? s.relatedObras.join(", ") : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                          s.active
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-zinc-100 text-zinc-600"
                        }`}
                      >
                        {s.active ? "Activo" : "Inactivo"}
                      </span>
                    </td>
                    {canManage && (
                      <td className="px-4 py-3 text-right">
                        <SupplierActionMenu
                          supplier={s}
                          onEdit={() => openEdit(s)}
                          onDelete={() => void handleDelete(s)}
                        />
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-zinc-100 px-4 py-3 text-sm text-zinc-600">
          <p>
            Mostrando {rangeStart} a {rangeEnd} de {filtered.length} proveedor{filtered.length === 1 ? "" : "es"}
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2">
              <span className="text-xs text-zinc-500">Filas</span>
              <select
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value) as (typeof PAGE_SIZE_OPTIONS)[number])}
                className="rounded-lg border border-zinc-200 bg-white px-2 py-1.5 text-sm"
              >
                {PAGE_SIZE_OPTIONS.map((n) => (
                  <option key={n} value={n}>
                    {n} por página
                  </option>
                ))}
              </select>
            </label>
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="rounded-lg border border-zinc-200 px-3 py-1.5 text-sm disabled:opacity-40"
              >
                Anterior
              </button>
              {pageNumbers.map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setPage(n)}
                  className={`min-w-8 rounded-lg px-2 py-1.5 text-sm ${
                    n === page ? "bg-orange-100 font-semibold text-orange-800" : "hover:bg-zinc-100"
                  }`}
                >
                  {n}
                </button>
              ))}
              <button
                type="button"
                disabled={page >= pages}
                onClick={() => setPage((p) => p + 1)}
                className="rounded-lg border border-zinc-200 px-3 py-1.5 text-sm disabled:opacity-40"
              >
                Siguiente
              </button>
            </div>
          </div>
        </div>
      </div>

      <ProveedorModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditingSupplier(null);
        }}
        onSaved={handleSaved}
        initialSupplier={editingSupplier}
      />
    </div>
  );
}
