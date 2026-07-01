"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ComprasKpiCards } from "@/components/dashboard/compras-kpi-cards";
import { ComprasOrdersPanel } from "@/components/dashboard/compras-orders-panel";
import { LoadingScreen } from "@/components/ui/loading-screen";
import { comprasKpiCounts, type ComprasOrderTab } from "@/lib/dashboard/compras-dashboard";
import type { ObraDto, PurchaseOrderDto } from "@/lib/domain/types";

export function OrdenesListView({ onRegisterRefresh }: { onRegisterRefresh?: (fn: () => void) => void }) {
  const [orders, setOrders] = useState<PurchaseOrderDto[]>([]);
  const [obras, setObras] = useState<ObraDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<ComprasOrderTab>("all");

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
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
    onRegisterRefresh?.(() => void load());
  }, [load, onRegisterRefresh]);

  const kpiCounts = useMemo(() => comprasKpiCounts(orders), [orders]);

  if (loading) return <LoadingScreen message="Cargando órdenes de compra" />;

  return (
    <div className="space-y-4 lg:space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 sm:text-3xl">Órdenes de compra</h1>
        <p className="mt-1 text-sm text-zinc-600">
          Consulta y filtra todas las órdenes de compra del consorcio.
        </p>
      </div>

      <ComprasKpiCards
        layout="standalone"
        counts={kpiCounts}
        activeTab={activeTab}
        onSelectTab={setActiveTab}
      />

      <ComprasOrdersPanel
        orders={orders}
        obras={obras}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onOrderMutated={() => void load()}
        title="Órdenes de compra"
        embedded={false}
      />
    </div>
  );
}
