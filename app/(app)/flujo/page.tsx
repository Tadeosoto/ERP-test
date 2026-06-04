"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ListSearchInput } from "@/components/list-search-input";
import { ProcessFlowDiagram } from "@/components/process-flow-diagram";
import { ObraOrderRow } from "@/components/obra-order-row";
import { FLOW_STEPS } from "@/lib/domain/flow";
import { ROLE_LABEL } from "@/lib/domain/labels";
import type { PurchaseOrderDto } from "@/lib/domain/types";
import { filterOrders, sortByCreatedAtDesc } from "@/lib/list-utils";

export default function FlujoPage() {
  const [orders, setOrders] = useState<PurchaseOrderDto[]>([]);
  const [orderSearch, setOrderSearch] = useState("");

  const load = useCallback(async () => {
    const res = await fetch("/api/orders", { credentials: "include" });
    if (res.ok) {
      const d = (await res.json()) as { orders: PurchaseOrderDto[] };
      setOrders(d.orders);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const sortedOrders = useMemo(() => sortByCreatedAtDesc(orders), [orders]);
  const visibleOrders = useMemo(
    () => filterOrders(sortedOrders, orderSearch),
    [sortedOrders, orderSearch]
  );

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-3xl font-bold text-zinc-900">Mapa del proceso</h1>
        <p className="mt-2 max-w-3xl text-base text-zinc-600">
          Todos pueden ver el avance de cada orden. Solo quien corresponde puede avanzar el paso.
        </p>
      </div>

      <section className="card p-6">
        <h2 className="text-xl font-semibold">Flujo estándar</h2>
        <div className="mt-6 overflow-x-auto pb-2">
          <ProcessFlowDiagram />
        </div>
        <ol className="mt-8 grid gap-3 sm:grid-cols-2">
          {FLOW_STEPS.map((s) => (
            <li key={s.step} className="flex gap-3 rounded-2xl bg-teal-50/60 px-4 py-3 text-base">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-teal-600 text-sm font-bold text-white">
                {s.step}
              </span>
              <div>
                <p className="font-semibold">{s.shortTitle}</p>
                <p className="text-zinc-600">{s.detail}</p>
                {s.primaryRole && (
                  <p className="mt-1 text-sm text-orange-800">Responsable: {ROLE_LABEL[s.primaryRole]}</p>
                )}
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h2 className="text-2xl font-semibold">Avance por orden</h2>
          {sortedOrders.length > 0 && (
            <p className="text-sm text-zinc-500">Más recientes primero</p>
          )}
        </div>
        {sortedOrders.length > 0 && (
          <ListSearchInput
            id="flujo-order-search"
            label="Buscar órdenes"
            placeholder="Título, proveedor, obra o estado…"
            value={orderSearch}
            onChange={setOrderSearch}
            matchCount={visibleOrders.length}
            totalCount={sortedOrders.length}
          />
        )}
        {sortedOrders.length === 0 ? (
          <p className="card py-10 text-center text-base text-zinc-500">No hay órdenes registradas.</p>
        ) : visibleOrders.length === 0 ? (
          <p className="card py-10 text-center text-base text-zinc-500">
            No hay órdenes que coincidan con «{orderSearch}».
          </p>
        ) : (
          visibleOrders.map((o) => <ObraOrderRow key={o.id} order={o} />)
        )}
      </section>
    </div>
  );
}
