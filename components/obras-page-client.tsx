"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ListSearchInput } from "@/components/list-search-input";
import { IconBuilding, IconPlus } from "@/components/ui/action-icons";
import { LoadingScreen } from "@/components/ui/loading-screen";
import { ObraCard } from "@/components/obra-card";
import { ObraOrderRow } from "@/components/obra-order-row";
import { useSession } from "@/components/session-provider";
import {
  FILTER_TITLES,
  filterOrdersByListFilter,
  parseOrderListFilter,
} from "@/lib/dashboard/order-filters";
import type { ObraDto, PurchaseOrderDto } from "@/lib/domain/types";
import { filterObras, filterOrders, sortByCreatedAtDesc } from "@/lib/list-utils";

export function ObrasPageClient({ onRegisterRefresh }: { onRegisterRefresh?: (fn: () => void) => void }) {
  const { user } = useSession();
  const searchParams = useSearchParams();
  const listFilter = parseOrderListFilter(
    searchParams.get("estado"),
    searchParams.get("pendientes")
  );
  const [obras, setObras] = useState<ObraDto[]>([]);
  const [orders, setOrders] = useState<PurchaseOrderDto[]>([]);
  const [newObraName, setNewObraName] = useState("");
  const [filterObra, setFilterObra] = useState<string>("all");
  const [obraSearch, setObraSearch] = useState("");
  const [orderSearch, setOrderSearch] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);

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
    setInitialLoading(false);
  }, []);

  useEffect(() => {
    void load();
    onRegisterRefresh?.(() => void load());
  }, [load, onRegisterRefresh]);

  async function createObra(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    const res = await fetch("/api/obras", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ name: newObraName }),
    });
    const data = (await res.json()) as { error?: string; obra?: ObraDto };
    if (!res.ok) {
      setErr(data.error ?? "Error");
      return;
    }
    setNewObraName("");
    await load();
    if (data.obra) {
      window.location.href = `/obras/${data.obra.id}`;
    }
  }

  const sortedObras = useMemo(() => sortByCreatedAtDesc(obras), [obras]);
  const visibleObras = useMemo(
    () => filterObras(sortedObras, obraSearch),
    [sortedObras, obraSearch]
  );

  const ordersByObra = useMemo(() => {
    let base = filterObra === "all" ? orders : orders.filter((o) => o.obraId === filterObra);
    if (listFilter && user) {
      base = filterOrdersByListFilter(base, listFilter, user.role);
    }
    return sortByCreatedAtDesc(base);
  }, [orders, filterObra, listFilter, user]);

  const visibleOrders = useMemo(
    () => filterOrders(ordersByObra, orderSearch),
    [ordersByObra, orderSearch]
  );

  if (initialLoading) {
    return <LoadingScreen message="Cargando Obras" />;
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link href="/inicio" className="text-sm font-medium text-orange-700 hover:underline">
            ← Inicio
          </Link>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-zinc-900">Obras</h1>
          <p className="mt-2 text-base text-zinc-600">
            Detalle de obras y órdenes. Usa los filtros o busca por nombre.
          </p>
        </div>
        {user?.role === "compras" && (
          <Link href="/ordenes/nueva" className="btn-primary">
            <IconPlus />
            Nueva orden
          </Link>
        )}
      </div>

      {listFilter && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-orange-100 bg-orange-50/30 px-4 py-3">
          <p className="text-sm text-zinc-700">
            Filtro: <span className="font-semibold">{FILTER_TITLES[listFilter]}</span>
          </p>
          <Link href="/obras" className="text-sm font-medium text-orange-700 hover:underline">
            Quitar filtro
          </Link>
        </div>
      )}

      <section className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h2 className="text-2xl font-semibold text-zinc-900">Tus obras</h2>
          <p className="text-sm text-zinc-500">Ordenadas de más reciente a más antigua</p>
        </div>
        {sortedObras.length > 0 && (
          <ListSearchInput
            id="obra-search"
            label="Buscar obras"
            placeholder="Nombre de la obra…"
            value={obraSearch}
            onChange={setObraSearch}
            hint="Busca por nombre del proyecto o construcción."
            matchCount={visibleObras.length}
            totalCount={sortedObras.length}
          />
        )}
        {sortedObras.length === 0 ? (
          <p className="card py-10 text-center text-base text-zinc-500">
            Aún no hay obras registradas.
            {user?.role === "compras" && " Crea la primera abajo."}
          </p>
        ) : visibleObras.length === 0 ? (
          <p className="card py-10 text-center text-base text-zinc-500">
            No hay obras que coincidan con «{obraSearch}».
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {visibleObras.map((o) => (
              <ObraCard key={o.id} obra={o} />
            ))}
          </div>
        )}
      </section>

      {user?.role === "compras" && (
        <section className="card p-6">
          <h2 className="text-xl font-semibold">Nueva obra</h2>
          <p className="mt-1 text-base text-zinc-600">
            Una obra es un proyecto o construcción (ej. Subestación Norte). Después crearás órdenes de compra
            dentro de ella.
          </p>
          <form onSubmit={createObra} className="mt-4 flex flex-wrap gap-3">
            <input
              value={newObraName}
              onChange={(e) => setNewObraName(e.target.value)}
              placeholder="Nombre de la obra"
              required
              className="min-h-12 flex-1 rounded-2xl border border-orange-100 px-4 text-base"
            />
            <button type="submit" className="btn-secondary">
              <IconBuilding />
              Crear obra
            </button>
          </form>
          {err && (
            <p className="mt-3 rounded-2xl bg-red-50 px-4 py-3 text-base text-red-700">{err}</p>
          )}
        </section>
      )}

      <section className="card p-6">
        <h2 className="text-xl font-semibold">Filtrar órdenes por obra</h2>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setFilterObra("all")}
            className={`rounded-full px-4 py-2 text-sm font-medium ${
              filterObra === "all"
                ? "bg-orange-100 text-orange-900 ring-1 ring-orange-200"
                : "bg-white text-zinc-600 ring-1 ring-orange-100 hover:bg-orange-50"
            }`}
          >
            Todas ({orders.length})
          </button>
          {sortedObras.map((o) => (
            <button
              key={o.id}
              type="button"
              onClick={() => setFilterObra(o.id)}
              className={`rounded-full px-4 py-2 text-sm font-medium ${
                filterObra === o.id
                  ? "bg-teal-50 text-teal-900 ring-1 ring-teal-200"
                  : "bg-white text-zinc-600 ring-1 ring-orange-100 hover:bg-teal-50/50"
              } ${!o.active ? "opacity-70" : ""}`}
            >
              {o.name}
              {!o.active ? " (inactiva)" : ""}
            </button>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h2 className="text-2xl font-semibold text-zinc-900">Órdenes de compra</h2>
          <p className="text-sm text-zinc-500">Ordenadas de más reciente a más antigua</p>
        </div>
        {orders.length > 0 && (
          <ListSearchInput
            id="order-search"
            label="Buscar órdenes"
            placeholder="Título, proveedor, obra o estado…"
            value={orderSearch}
            onChange={setOrderSearch}
            hint="Filtra dentro de la obra seleccionada arriba (o todas)."
            matchCount={visibleOrders.length}
            totalCount={ordersByObra.length}
          />
        )}
        {ordersByObra.length === 0 ? (
          <p className="card py-12 text-center text-base text-zinc-500">
            No hay órdenes en esta vista.
            {user?.role === "compras" && (
              <>
                {" "}
                <Link href="/ordenes/nueva" className="font-medium text-orange-700 underline">
                  Crear una orden
                </Link>
              </>
            )}
          </p>
        ) : visibleOrders.length === 0 ? (
          <p className="card py-12 text-center text-base text-zinc-500">
            No hay órdenes que coincidan con «{orderSearch}».
          </p>
        ) : (
          visibleOrders.map((o) => <ObraOrderRow key={o.id} order={o} />)
        )}
      </section>
    </div>
  );
}
