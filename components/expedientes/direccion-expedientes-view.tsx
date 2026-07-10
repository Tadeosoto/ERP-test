"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ExpedienteDetailDrawer } from "@/components/expedientes/expediente-detail-drawer";
import {
  DireccionExpedientesPanel,
} from "@/components/expedientes/direccion-expedientes-panel";
import { LoadingScreen } from "@/components/ui/loading-screen";
import { useSession } from "@/components/session-provider";
import {
  expedienteKpis,
  type ExpedienteTab,
} from "@/lib/dashboard/direccion-expedientes";
import type { ObraDto, PurchaseOrderDto } from "@/lib/domain/types";

function SummaryKpi({
  label,
  value,
  accent,
  iconBg,
  onClick,
}: {
  label: string;
  value: number;
  accent: string;
  iconBg: string;
  onClick?: () => void;
}) {
  const inner = (
    <>
      <div className="flex items-start justify-between gap-2">
        <span className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${iconBg}`}>
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
            />
          </svg>
        </span>
        <span className="text-2xl font-bold tabular-nums text-zinc-900">{value}</span>
      </div>
      <p className="mt-2 text-xs font-semibold text-zinc-800">{label}</p>
      <p className="mt-0.5 text-[11px] font-medium text-violet-700">Ver todos →</p>
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`w-full rounded-2xl border border-zinc-200/80 border-l-4 p-4 text-left shadow-sm transition hover:shadow-md ${accent}`}
      >
        {inner}
      </button>
    );
  }

  return (
    <div className={`rounded-2xl border border-zinc-200/80 border-l-4 p-4 shadow-sm ${accent}`}>{inner}</div>
  );
}

export function DireccionExpedientesView({ onRegisterRefresh }: { onRegisterRefresh?: (fn: () => void) => void }) {
  const { user } = useSession();
  const [orders, setOrders] = useState<PurchaseOrderDto[]>([]);
  const [obras, setObras] = useState<ObraDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [defaultTab, setDefaultTab] = useState<ExpedienteTab>("todos");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [panelKey, setPanelKey] = useState(0);

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

  const showAdminActions = user?.role === "pagos";

  const handleOrderDeleted = useCallback(() => {
    setSelectedId(null);
    void load();
  }, [load]);

  const kpis = useMemo(() => expedienteKpis(orders), [orders]);
  const selectedOrder = useMemo(
    () => (selectedId ? orders.find((o) => o.id === selectedId) ?? null : null),
    [orders, selectedId]
  );

  const tabCounts = useMemo(
    () => ({
      todos: kpis.total,
      completos: kpis.completos,
      en_proceso: kpis.enProceso,
      atencion: kpis.atencion,
    }),
    [kpis]
  );

  function jumpToTab(tab: ExpedienteTab) {
    setDefaultTab(tab);
    setPanelKey((k) => k + 1);
  }

  if (loading) return <LoadingScreen message="Cargando expedientes" />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 sm:text-3xl">Expedientes</h1>
        <p className="mt-1 text-sm text-zinc-600">
          Consulta el estatus documental y el historial de cada orden de compra.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <SummaryKpi
          label="Total expedientes"
          value={kpis.total}
          accent="border-l-violet-400 bg-violet-50/35"
          iconBg="bg-violet-100 text-violet-800"
          onClick={() => jumpToTab("todos")}
        />
        <SummaryKpi
          label="Expedientes completos"
          value={kpis.completos}
          accent="border-l-emerald-400 bg-emerald-50/35"
          iconBg="bg-emerald-100 text-emerald-800"
          onClick={() => jumpToTab("completos")}
        />
        <SummaryKpi
          label="En proceso / Parciales"
          value={kpis.enProceso}
          accent="border-l-orange-400 bg-orange-50/40"
          iconBg="bg-orange-100 text-orange-700"
          onClick={() => jumpToTab("en_proceso")}
        />
        <SummaryKpi
          label="Requieren atención"
          value={kpis.atencion}
          accent="border-l-red-400 bg-red-50/40"
          iconBg="bg-red-100 text-red-800"
          onClick={() => jumpToTab("atencion")}
        />
      </div>

      {kpis.atencion > 0 && (
        <p className="rounded-xl border border-red-100 bg-red-50/40 px-3 py-2 text-xs text-red-900">
          <span className="font-semibold">Requieren atención por área:</span> Ingeniería {kpis.atencionPorArea.ingeniero}{" "}
          · Compras {kpis.atencionPorArea.compras} · Administración {kpis.atencionPorArea.pagos} · Recepción{" "}
          {kpis.atencionPorArea.recepcion} · Contabilidad {kpis.atencionPorArea.contabilidad}. Usa la pestaña
          «Requieren atención» y el filtro «Área pendiente».
        </p>
      )}

      <DireccionExpedientesPanel
        key={`${panelKey}-${defaultTab}`}
        orders={orders}
        obras={obras}
        defaultTab={defaultTab}
        showAdminActions={showAdminActions}
        onOrderMutated={handleOrderDeleted}
        selectedId={selectedId}
        onSelectOrder={setSelectedId}
        tabCounts={tabCounts}
      />

      {selectedOrder && (
        <ExpedienteDetailDrawer order={selectedOrder} onClose={() => setSelectedId(null)} />
      )}
    </div>
  );
}
