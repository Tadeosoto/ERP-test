"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { RoleActivityIcon } from "@/components/dashboard/role-activity-icon";
import { ListSearchInput } from "@/components/list-search-input";
import { LoadingScreen } from "@/components/ui/loading-screen";
import { roleActivityLabel } from "@/lib/dashboard/role-activity-style";
import { formatPendingRoles } from "@/lib/domain/flow";
import { ROLE_LABEL } from "@/lib/domain/labels";
import type { MovementDto, ObraDto, PendingMovementDto, PurchaseOrderDto, Role } from "@/lib/domain/types";
import { formatDateTime } from "@/lib/format";

const ROLES: Role[] = ["compras", "pagos", "ingeniero", "recepcion", "contabilidad", "direccion"];

type Props = {
  variant: "recent" | "pending";
  onRegisterRefresh?: (fn: () => void) => void;
};

export function MovimientosPageClient({ variant, onRegisterRefresh }: Props) {
  const isPending = variant === "pending";
  const [recent, setRecent] = useState<MovementDto[]>([]);
  const [pending, setPending] = useState<PendingMovementDto[]>([]);
  const [obras, setObras] = useState<ObraDto[]>([]);
  const [orders, setOrders] = useState<PurchaseOrderDto[]>([]);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<Role | "all">("all");
  const [obraFilter, setObraFilter] = useState<string>("all");
  const [orderFilter, setOrderFilter] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const skipFilterReload = useRef(true);

  const loadMeta = useCallback(async () => {
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
  }, []);

  const loadMovements = useCallback(async () => {
    const params = new URLSearchParams({
      vista: isPending ? "pendientes" : "recientes",
      limit: "200",
    });
    if (search.trim()) params.set("q", search.trim());
    if (roleFilter !== "all") params.set("rol", roleFilter);
    if (obraFilter !== "all") params.set("obraId", obraFilter);
    if (orderFilter !== "all") params.set("orderId", orderFilter);

    const res = await fetch(`/api/movimientos?${params}`, { credentials: "include" });
    if (res.ok) {
      const d = (await res.json()) as { recent?: MovementDto[]; pending?: PendingMovementDto[] };
      if (isPending) setPending(d.pending ?? []);
      else setRecent(d.recent ?? []);
    }
    setLoading(false);
  }, [isPending, search, roleFilter, obraFilter, orderFilter]);

  const load = useCallback(async () => {
    await Promise.all([loadMeta(), loadMovements()]);
  }, [loadMeta, loadMovements]);

  useEffect(() => {
    void load();
    onRegisterRefresh?.(() => void load());
  }, [load, onRegisterRefresh]);

  useEffect(() => {
    if (skipFilterReload.current) {
      skipFilterReload.current = false;
      return;
    }
    const id = setTimeout(() => {
      setLoading(true);
      void loadMovements();
    }, 300);
    return () => clearTimeout(id);
  }, [search, roleFilter, obraFilter, orderFilter, loadMovements]);

  const title = isPending ? "Movimientos pendientes" : "Últimos movimientos";
  const subtitle = isPending
    ? "Todo lo que falta por hacer en el flujo de compras."
    : "Historial de acciones recientes en obras y órdenes.";

  const count = isPending ? pending.length : recent.length;

  const filterClass = (active: boolean) =>
    active
      ? "bg-orange-100 text-orange-900 ring-1 ring-orange-200"
      : "bg-white text-zinc-600 ring-1 ring-orange-100 hover:bg-orange-50";

  if (loading && count === 0) {
    return <LoadingScreen message={isPending ? "Cargando Pendientes" : "Cargando Movimientos"} />;
  }

  return (
    <div className="space-y-6">
      <div>
        <Link href="/inicio" className="text-sm font-medium text-orange-700 hover:underline">
          ← Inicio
        </Link>
        <h1 className="mt-1 text-3xl font-bold text-zinc-900">{title}</h1>
        <p className="mt-2 text-base text-zinc-600">{subtitle}</p>
      </div>

      <div className="card space-y-4 p-5">
        <ListSearchInput
          id="mov-search"
          label="Buscar"
          placeholder="Descripción, obra, orden, persona…"
          value={search}
          onChange={setSearch}
          matchCount={count}
          totalCount={count}
        />

        <div>
          <p className="mb-2 text-sm font-medium text-zinc-700">Filtrar por rol</p>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => setRoleFilter("all")} className={`rounded-full px-3 py-1.5 text-sm font-medium ${filterClass(roleFilter === "all")}`}>
              Todos
            </button>
            {ROLES.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRoleFilter(r)}
                className={`rounded-full px-3 py-1.5 text-sm font-medium ${filterClass(roleFilter === r)}`}
              >
                {ROLE_LABEL[r]}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="mb-2 text-sm font-medium text-zinc-700">Filtrar por obra</p>
          <select
            value={obraFilter}
            onChange={(e) => setObraFilter(e.target.value)}
            className="min-h-11 w-full max-w-md rounded-2xl border border-orange-100 px-4 text-base"
          >
            <option value="all">Todas las obras</option>
            {obras.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <p className="mb-2 text-sm font-medium text-zinc-700">Filtrar por orden de compra</p>
          <select
            value={orderFilter}
            onChange={(e) => setOrderFilter(e.target.value)}
            className="min-h-11 w-full max-w-md rounded-2xl border border-orange-100 px-4 text-base"
          >
            <option value="all">Todas las órdenes</option>
            {orders.map((o) => (
              <option key={o.id} value={o.id}>
                {o.title} · {o.obraName}
              </option>
            ))}
          </select>
        </div>
      </div>

      <ul className="space-y-3">
        {!isPending && recent.length === 0 && (
          <li className="card py-12 text-center text-base text-zinc-500">Sin movimientos en esta vista.</li>
        )}
        {isPending && pending.length === 0 && (
          <li className="card py-12 text-center text-base text-zinc-500">No hay pendientes con estos filtros.</li>
        )}

        {!isPending &&
          recent.map((m) => (
            <li key={m.id} className="card p-4">
              <Link href={`/ordenes/${m.orderId}`} className="flex gap-4">
                <RoleActivityIcon role={m.role} />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-zinc-900">{roleActivityLabel(m.role, m.actorName)}</p>
                  <p className="mt-1 text-base text-zinc-700">{m.description}</p>
                  <p className="mt-1 text-sm text-zinc-500">{m.context}</p>
                  <p className="mt-2 text-sm tabular-nums text-zinc-400">{formatDateTime(m.createdAt)}</p>
                </div>
              </Link>
            </li>
          ))}

        {isPending &&
          pending.map((m) => (
            <li key={m.id} className="card p-4">
              <Link href={`/ordenes/${m.orderId}`} className="flex gap-4">
                <RoleActivityIcon role={m.role} />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-zinc-900">Pendiente · {formatPendingRoles(m.status)}</p>
                  <p className="mt-1 text-base text-zinc-700">{m.description}</p>
                  <p className="mt-1 text-sm text-zinc-500">
                    {m.obraName} · {m.orderTitle}
                  </p>
                  <p className="mt-2 text-sm tabular-nums text-zinc-400">
                    Actualizado {formatDateTime(m.updatedAt)}
                  </p>
                </div>
              </Link>
            </li>
          ))}
      </ul>

      <div className="flex flex-wrap gap-3">
        <Link
          href={isPending ? "/movimientos" : "/movimientos/pendientes"}
          className="text-sm font-medium text-orange-700 hover:underline"
        >
          {isPending ? "Ver últimos movimientos →" : "Ver movimientos pendientes →"}
        </Link>
      </div>
    </div>
  );
}
