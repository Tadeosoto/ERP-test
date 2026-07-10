"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ComprasHomeDashboard } from "@/components/dashboard/compras-home-dashboard";
import { IngenieroHomeDashboard } from "@/components/dashboard/ingeniero-home-dashboard";
import { PagosHomeDashboard } from "@/components/dashboard/pagos-home-dashboard";
import { ContabilidadRecepcionHomeDashboard } from "@/components/dashboard/contabilidad-recepcion-home-dashboard";
import { DireccionHomeDashboard } from "@/components/dashboard/direccion-home-dashboard";
import { HomeActivitySidebar } from "@/components/dashboard/home-activity-sidebar";
import { RoleQuickGuideBanner } from "@/components/dashboard/role-quick-guide";
import { MiniListPanel, PanelLink, StatChip } from "@/components/dashboard/panel-link";
import { CalloutBubble } from "@/components/ui/callout-bubble";
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
import type { DirectExpenseDto, InvoiceFirstCommitmentDto, MaterialRequestDto, MovementDto, ObraDto, PendingMovementDto, PurchaseOrderDto, RecurringCommitmentDto, SupplierDto } from "@/lib/domain/types";
import { sortByCreatedAtDesc } from "@/lib/list-utils";

export function HomeDashboard() {
  const { user } = useSession();
  const register = usePageRefreshRegister();
  const [obras, setObras] = useState<ObraDto[]>([]);
  const [orders, setOrders] = useState<PurchaseOrderDto[]>([]);
  const [materialRequests, setMaterialRequests] = useState<MaterialRequestDto[]>([]);
  const [expenses, setExpenses] = useState<DirectExpenseDto[]>([]);
  const [recentMovements, setRecentMovements] = useState<MovementDto[]>([]);
  const [pendingMovements, setPendingMovements] = useState<PendingMovementDto[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierDto[]>([]);
  const [commitments, setCommitments] = useState<RecurringCommitmentDto[]>([]);
  const [invoiceCommitments, setInvoiceCommitments] = useState<InvoiceFirstCommitmentDto[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) return;
    const matUrl =
      user.role === "compras"
        ? "/api/material-requests"
        : user.role === "ingeniero"
          ? "/api/material-requests?mine=1"
          : null;

    const [oRes, ordRes, matRes, expRes, recentRes, pendingRes, supRes, comRes, invRes] = await Promise.all([
      fetch("/api/obras", { credentials: "include" }),
      fetch("/api/orders", { credentials: "include" }),
      matUrl ? fetch(matUrl, { credentials: "include" }) : Promise.resolve(null),
      user.role === "ingeniero" ||
      user.role === "pagos" ||
      user.role === "recepcion" ||
      user.role === "contabilidad" ||
      user.role === "direccion"
        ? fetch(
            user.role === "ingeniero" ? "/api/direct-expenses?mine=1" : "/api/direct-expenses",
            { credentials: "include" }
          )
        : Promise.resolve(null),
      fetch("/api/movimientos?vista=recientes&limit=5", { credentials: "include" }),
      fetch("/api/movimientos?vista=pendientes&limit=5", { credentials: "include" }),
      user.role === "pagos"
        ? fetch("/api/suppliers", { credentials: "include" })
        : Promise.resolve(null),
      user.role === "pagos"
        ? fetch("/api/recurring-commitments", { credentials: "include" })
        : Promise.resolve(null),
      user.role === "pagos" || user.role === "compras"
        ? fetch("/api/invoice-first-commitments", { credentials: "include" })
        : Promise.resolve(null),
    ]);
    if (oRes.ok) {
      const d = (await oRes.json()) as { obras: ObraDto[] };
      setObras(d.obras);
    }
    if (ordRes.ok) {
      const d = (await ordRes.json()) as { orders: PurchaseOrderDto[] };
      setOrders(d.orders);
    }
    if (matRes?.ok) {
      const d = (await matRes.json()) as { requests: MaterialRequestDto[] };
      setMaterialRequests(d.requests);
    }
    if (expRes?.ok) {
      const d = (await expRes.json()) as { expenses: DirectExpenseDto[] };
      setExpenses(d.expenses);
    }
    if (recentRes.ok) {
      const d = (await recentRes.json()) as { recent: MovementDto[] };
      setRecentMovements(d.recent);
    }
    if (pendingRes.ok) {
      const d = (await pendingRes.json()) as { pending: PendingMovementDto[] };
      setPendingMovements(d.pending);
    }
    if (supRes?.ok) {
      const d = (await supRes.json()) as { suppliers: SupplierDto[] };
      setSuppliers(d.suppliers);
    }
    if (comRes?.ok) {
      const d = (await comRes.json()) as { commitments: RecurringCommitmentDto[] };
      setCommitments(d.commitments);
    }
    if (invRes?.ok) {
      const d = (await invRes.json()) as { commitments: InvoiceFirstCommitmentDto[] };
      setInvoiceCommitments(d.commitments);
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
        materialRequests={materialRequests}
        invoiceCommitments={invoiceCommitments}
        recentMovements={recentMovements}
        pendingMovements={pendingMovements}
        onOrderMutated={() => void load()}
      />
    );
  }

  if (user.role === "ingeniero") {
    return (
      <IngenieroHomeDashboard
        userId={user.id}
        userName={user.name}
        orders={orders}
        obras={obras}
        materialRequests={materialRequests}
        expenses={expenses}
        recentMovements={recentMovements}
        pendingMovements={pendingMovements}
      />
    );
  }

  if (user.role === "pagos") {
    return (
      <PagosHomeDashboard
        userName={user.name}
        orders={orders}
        obras={obras}
        suppliers={suppliers}
        commitments={commitments}
        expenses={expenses}
        invoiceCommitments={invoiceCommitments}
        recentMovements={recentMovements}
        pendingMovements={pendingMovements}
        onOrdersMutated={() => void load()}
        onCommitmentsMutated={() => void load()}
      />
    );
  }

  if (user.role === "contabilidad" || user.role === "recepcion") {
    return (
      <ContabilidadRecepcionHomeDashboard
        userName={user.name}
        role={user.role}
        orders={orders}
        obras={obras}
        expenses={expenses}
        recentMovements={recentMovements}
        pendingMovements={pendingMovements}
      />
    );
  }

  if (user.role === "direccion") {
    return (
      <DireccionHomeDashboard
        userName={user.name}
        orders={orders}
        obras={obras}
        expenses={expenses}
        recentMovements={recentMovements}
        pendingMovements={pendingMovements}
      />
    );
  }

  const playbook = rolePlaybook(user.role)[0];

  return (
    <div className="home-dashboard flex flex-col gap-4 pb-2 sm:gap-5 lg:min-h-0 lg:flex-1 lg:gap-4 lg:overflow-y-auto lg:pb-0">
      <header className="shrink-0">
        <h1 className="text-xl font-bold text-zinc-900 sm:text-2xl">¡Hola, {user.name.split(" ")[0]}!</h1>
        <p className="mt-1 text-sm text-zinc-500">
          {ROLE_LABEL[user.role]} · {playbook ?? "Consulta el avance de tus órdenes."}
        </p>
      </header>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5 lg:gap-3">
        {buckets.map((b) => (
          <StatChip key={b.key} href={b.href} label={b.label} count={b.count} accent={b.accent} />
        ))}
      </div>

      {panelHint && !hintDismissed && (
        <CalloutBubble
          title={panelHint.title}
          message={panelHint.message}
          actionLabel={panelHint.actionLabel}
          href={panelHint.href}
          onDismiss={() => setHintDismissed(true)}
          tailSide="top"
          tailAlign="left"
        />
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-4 lg:items-start lg:gap-4">
        <div className="flex flex-col gap-4 lg:col-span-3">
          <MiniListPanel
            title="Tu bandeja"
            surface="bandeja"
            empty="Nada pendiente con tu rol ahora."
            href={myQueue.length ? `/ordenes/${myQueue[0].id}` : "/obras?pendientes=1"}
            linkLabel={myQueue.length ? "Abrir primera" : "Ver obras"}
            primaryClassName="link-oc"
            items={myQueue.map((o) => ({
              id: o.id,
              primary: o.title,
              secondary: `${STATUS_LABEL[o.status]} · ${o.obraName}`,
              href: `/ordenes/${o.id}`,
            }))}
          />

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
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
              primaryClassName="link-oc"
              items={recentOrders.map((o) => ({
                id: o.id,
                primary: formatOrderLine(o),
                secondary: STATUS_LABEL[o.status],
                href: `/ordenes/${o.id}`,
              }))}
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
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

          <RoleQuickGuideBanner role={user.role} compact />
        </div>

        <div className="min-w-0 lg:col-span-1">
          <HomeActivitySidebar
            compact
            limit={3}
            recentMovements={recentMovements}
            pendingMovements={pendingMovements}
          />
        </div>
      </div>
    </div>
  );
}
