"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ComprasHomeDashboard } from "@/components/dashboard/compras-home-dashboard";
import { HomeActivitySidebar } from "@/components/dashboard/home-activity-sidebar";
import { MiniListPanel, PanelLink, StatChip } from "@/components/dashboard/panel-link";
import { usePageRefreshRegister } from "@/components/app-shell";
import { LoadingScreen } from "@/components/ui/loading-screen";
import { useSession } from "@/components/session-provider";
import { rolePlaybook } from "@/lib/domain/flow";
import { ROLE_LABEL, STATUS_LABEL } from "@/lib/domain/labels";
import {
  dashboardBuckets,
  formatOrderLine,
  ordersForRole,
} from "@/lib/dashboard/home-stats";
import { getHomePanelHint } from "@/lib/dashboard/role-hints";
import type { MovementDto, ObraDto, PendingMovementDto, PurchaseOrderDto } from "@/lib/domain/types";
import { sortByCreatedAtDesc } from "@/lib/list-utils";

export function HomeDashboard() {
  const { user } = useSession();
  const register = usePageRefreshRegister();
  const [obras, setObras] = useState<ObraDto[]>([]);
  const [orders, setOrders] = useState<PurchaseOrderDto[]>([]);
  const [recentMovements, setRecentMovements] = useState<MovementDto[]>([]);
  const [pendingMovements, setPendingMovements] = useState<PendingMovementDto[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) return;
    const [oRes, ordRes, recentRes, pendingRes] = await Promise.all([
      fetch("/api/obras", { credentials: "include" }),
      fetch("/api/orders", { credentials: "include" }),
      fetch("/api/movimientos?vista=recientes&limit=5", { credentials: "include" }),
      fetch("/api/movimientos?vista=pendientes&limit=5", { credentials: "include" }),
    ]);
    if (oRes.ok) {
      const d = (await oRes.json()) as { obras: ObraDto[] };
      setObras(d.obras);
    }
    if (ordRes.ok) {
      const d = (await ordRes.json()) as { orders: PurchaseOrderDto[] };
      setOrders(d.orders);
    }
    if (recentRes.ok) {
      const d = (await recentRes.json()) as { recent: MovementDto[] };
      setRecentMovements(d.recent);
    }
    if (pendingRes.ok) {
      const d = (await pendingRes.json()) as { pending: PendingMovementDto[] };
      setPendingMovements(d.pending);
    }
    setInitialLoading(false);
  }, [user]);

  useEffect(() => {
    void load();
    register(() => void load());
  }, [load, register]);

  const buckets = useMemo(() => dashboardBuckets(orders), [orders]);
  const sortedOrders = useMemo(() => sortByCreatedAtDesc(orders), [orders]);
  const myQueue = useMemo(
    () => (user ? sortByCreatedAtDesc(ordersForRole(orders, user.role)).slice(0, 4) : []),
    [orders, user]
  );
  const recentObras = useMemo(() => sortByCreatedAtDesc(obras).slice(0, 4), [obras]);
  const recentOrders = useMemo(() => sortedOrders.slice(0, 4), [sortedOrders]);
  const panelHint = useMemo(
    () => (user ? getHomePanelHint(user.role, orders) : null),
    [orders, user]
  );
  const [hintDismissed, setHintDismissed] = useState(false);
  const hintKey = panelHint ? `${panelHint.href}:${panelHint.message}` : "";

  useEffect(() => {
    setHintDismissed(false);
  }, [hintKey]);

  if (!user) return null;

  if (initialLoading) {
    return <LoadingScreen message="Cargando Inicio" />;
  }

  if (user.role === "compras") {
    return (
      <ComprasHomeDashboard
        userName={user.name}
        orders={orders}
        obras={obras}
        recentMovements={recentMovements}
        pendingMovements={pendingMovements}
      />
    );
  }

  const playbook = rolePlaybook(user.role)[0];

  return (
    <div className="flex min-h-0 flex-col gap-3 overflow-y-auto lg:h-[calc(100dvh-5.5rem)] lg:gap-4">
      <header className="shrink-0">
        <h1 className="text-xl font-bold text-zinc-900 sm:text-2xl">¡Hola, {user.name.split(" ")[0]}!</h1>
        <p className="mt-1 text-sm text-zinc-500">
          {ROLE_LABEL[user.role]} · {playbook ?? "Consulta el avance sin hacer scroll."}
        </p>
      </header>

      <div className="grid shrink-0 grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5 lg:gap-3">
        {buckets.map((b) => (
          <StatChip key={b.key} href={b.href} label={b.label} count={b.count} accent={b.accent} />
        ))}
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-3 xl:flex-row xl:gap-4">
        <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-3">
          <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 lg:grid-cols-3 lg:gap-4">
            <MiniListPanel
              title="Tu bandeja"
              surface="bandeja"
              empty="Nada pendiente con tu rol ahora."
              href={myQueue.length ? `/ordenes/${myQueue[0].id}` : "/obras?pendientes=1"}
              linkLabel={myQueue.length ? "Abrir primera" : "Ver obras"}
              hint={panelHint && !hintDismissed ? panelHint : undefined}
              onDismissHint={() => setHintDismissed(true)}
              items={myQueue.map((o) => ({
                id: o.id,
                primary: o.title,
                secondary: `${STATUS_LABEL[o.status]} · ${o.obraName}`,
                href: `/ordenes/${o.id}`,
              }))}
            />

            <MiniListPanel
              title="Obras"
              surface="obras"
              empty="Sin obras registradas."
              href="/obras"
              linkLabel="Ver todas"
              items={recentObras.map((o) => ({
                id: o.id,
                primary: o.name,
                secondary: `${o.orderCount} orden${o.orderCount === 1 ? "" : "es"} · ${o.active ? "Activa" : "Inactiva"}`,
                href: `/obras/${o.id}`,
              }))}
            />

            <MiniListPanel
              title="Órdenes recientes"
              surface="ordenes"
              empty="Sin órdenes todavía."
              href="/obras"
              linkLabel="Ver todas"
              items={recentOrders.map((o) => ({
                id: o.id,
                primary: formatOrderLine(o),
                secondary: STATUS_LABEL[o.status],
                href: `/ordenes/${o.id}`,
              }))}
            />
          </div>

          <div className="hidden shrink-0 grid-cols-1 gap-2 sm:grid-cols-3 sm:gap-3 lg:grid">
            <PanelLink
              href="/flujo"
              surface="flujo"
              title="Mapa del proceso"
              description="Etapas Paty → Santiago → Carolina → documentos finales."
              accent="border-l-4 border-l-teal-300/60"
            />
            <PanelLink
              href="/obras"
              surface="obrasNav"
              title="Obras y órdenes"
              description="Buscar, filtrar y abrir el detalle de cada compra."
              accent="border-l-4 border-l-orange-300/60"
            />
            <PanelLink
              href="/obras?pendientes=1"
              surface="accion"
              title="Pendientes del equipo"
              description="Órdenes que esperan acción de otro rol."
              accent="border-l-4 border-l-violet-300/50"
            />
          </div>
        </div>

        <HomeActivitySidebar
          recentMovements={recentMovements}
          pendingMovements={pendingMovements}
        />
      </div>
    </div>
  );
}
