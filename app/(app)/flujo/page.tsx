"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ListSearchInput } from "@/components/list-search-input";
import { ProcessFlowDiagram } from "@/components/process-flow-diagram";
import { SystemStatusLegend } from "@/components/ui/system-status-legend";
import { RoleLegend } from "@/components/ui/role-legend";
import { ObraOrderRow } from "@/components/obra-order-row";
import { LoadingScreen } from "@/components/ui/loading-screen";
import { FLOW_STEPS_A, FLOW_STEPS_B, FLOW_STEPS_C } from "@/lib/domain/flow";
import { ROLE_LABEL } from "@/lib/domain/labels";
import type { PurchaseOrderDto } from "@/lib/domain/types";
import { filterOrders, sortByCreatedAtDesc } from "@/lib/list-utils";
import { useSession } from "@/components/session-provider";
import { PROCESS_A_ROLE_STEPS } from "@/components/dashboard/process-a-home-map";

export default function FlujoPage() {
  const { user } = useSession();
  const [orders, setOrders] = useState<PurchaseOrderDto[]>([]);
  const [orderSearch, setOrderSearch] = useState("");
  const [initialLoading, setInitialLoading] = useState(true);
  const [showOther, setShowOther] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch("/api/orders", { credentials: "include" });
    if (res.ok) {
      const d = (await res.json()) as { orders: PurchaseOrderDto[] };
      setOrders(d.orders);
    }
    setInitialLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const sortedOrders = useMemo(() => sortByCreatedAtDesc(orders), [orders]);
  const visibleOrders = useMemo(
    () => filterOrders(sortedOrders, orderSearch),
    [sortedOrders, orderSearch]
  );

  const highlight = user ? PROCESS_A_ROLE_STEPS[user.role] : [];

  if (initialLoading) {
    return <LoadingScreen message="Cargando Mapa del Proceso" />;
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="dash-page-title">Mapa del proceso</h1>
        <p className="mt-2 max-w-3xl text-base text-zinc-600">
          Proceso A es el flujo general de OC por obra: del equipo de ingenieros al pago saldado.
          Todos consultan el avance; solo quien corresponde actúa en cada paso.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <SystemStatusLegend />
        <RoleLegend />
      </div>

      <section className="dash-panel space-y-6 p-5 sm:p-6">
        <div>
          <h2 className="text-xl font-semibold text-zinc-900">Proceso A — OC por obra</h2>
          <p className="mt-1 text-sm text-zinc-600">
            Fin operativo: total de la orden saldado. Compromisos recurrentes son un proceso aparte.
          </p>
          <div className="mt-4 overflow-x-auto pb-2">
            <ProcessFlowDiagram processKind="a" highlightSteps={highlight} />
          </div>
          <ol className="mt-6 grid gap-3 sm:grid-cols-2">
            {FLOW_STEPS_A.map((s) => {
              const mine = highlight.includes(s.step);
              return (
                <li
                  key={`a-${s.step}`}
                  className={`flex gap-3 rounded-2xl px-4 py-3 text-base ${
                    mine ? "bg-orange-50 ring-1 ring-orange-200/80" : "bg-teal-50/60"
                  }`}
                >
                  <span
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm font-bold text-white ${
                      mine ? "bg-orange-600" : "bg-teal-600"
                    }`}
                  >
                    {s.step}
                  </span>
                  <div>
                    <p className="font-semibold">{s.shortTitle}</p>
                    <p className="text-zinc-600">{s.detail}</p>
                    {s.primaryRole ? (
                      <p className="mt-1 text-sm text-orange-800">
                        Responsable: {ROLE_LABEL[s.primaryRole]}
                        {s.step === 5 ? " / Dirección" : ""}
                      </p>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ol>
        </div>

        <div className="border-t border-zinc-100 pt-4">
          <button
            type="button"
            onClick={() => setShowOther((v) => !v)}
            className="text-sm font-semibold text-zinc-700 hover:text-zinc-900"
          >
            {showOther ? "Ocultar" : "Ver"} procesos B y C (se ajustarán después){" "}
            <span aria-hidden>{showOther ? "▴" : "▾"}</span>
          </button>

          {showOther ? (
            <div className="mt-6 space-y-8">
              <div>
                <h3 className="text-lg font-semibold">Proceso C — Factura primero</h3>
                <p className="mt-1 text-sm text-zinc-600">
                  Dirección registra factura; Administración y Compras generan la OC sin Ingeniería.
                </p>
                <div className="mt-4 overflow-x-auto pb-2">
                  <ProcessFlowDiagram processKind="c" />
                </div>
                <ol className="mt-4 grid gap-3 sm:grid-cols-2">
                  {FLOW_STEPS_C.map((s) => (
                    <li
                      key={`c-${s.step}`}
                      className="flex gap-3 rounded-2xl bg-violet-50/60 px-4 py-3 text-sm"
                    >
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-violet-600 text-xs font-bold text-white">
                        {s.step}
                      </span>
                      <div>
                        <p className="font-semibold">{s.shortTitle}</p>
                        <p className="text-zinc-600">{s.detail}</p>
                      </div>
                    </li>
                  ))}
                </ol>
              </div>

              <div>
                <h3 className="text-lg font-semibold">Proceso B — Gasto directo</h3>
                <div className="mt-4 overflow-x-auto pb-2">
                  <ProcessFlowDiagram processKind="b" />
                </div>
                <ol className="mt-4 grid gap-3 sm:grid-cols-2">
                  {FLOW_STEPS_B.map((s) => (
                    <li
                      key={`b-${s.step}`}
                      className="flex gap-3 rounded-2xl bg-sky-50/60 px-4 py-3 text-sm"
                    >
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-sky-600 text-xs font-bold text-white">
                        {s.step}
                      </span>
                      <div>
                        <p className="font-semibold">{s.shortTitle}</p>
                        <p className="text-zinc-600">{s.detail}</p>
                      </div>
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          ) : null}
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h2 className="text-2xl font-semibold">Avance por orden</h2>
          {sortedOrders.length > 0 ? (
            <p className="text-sm text-zinc-500">Más recientes primero</p>
          ) : null}
        </div>
        {sortedOrders.length > 0 ? (
          <ListSearchInput
            id="flujo-order-search"
            label="Buscar órdenes"
            placeholder="Título, proveedor, obra o estado…"
            value={orderSearch}
            onChange={setOrderSearch}
            matchCount={visibleOrders.length}
            totalCount={sortedOrders.length}
          />
        ) : null}
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
