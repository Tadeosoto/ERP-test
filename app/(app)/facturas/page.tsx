"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AgregarFacturaCommitmentsList } from "@/components/direccion/agregar-factura-commitments-list";
import { LoadingScreen } from "@/components/ui/loading-screen";
import { usePageRefreshRegister } from "@/components/app-shell";
import { useSession } from "@/components/session-provider";
import {
  agregarFacturaKpis,
  enrichInvoiceFirstCommitments,
  type AgregarFacturaKpiKey,
} from "@/lib/dashboard/direccion-proceso-c-dashboard";
import type { InvoiceFirstCommitmentDto, PurchaseOrderDto } from "@/lib/domain/types";

function KpiCard({
  label,
  value,
  accent,
  iconBg,
  active,
  onClick,
}: {
  label: string;
  value: number;
  accent: string;
  iconBg: string;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full rounded-2xl border border-l-4 p-4 text-left shadow-sm transition hover:shadow-md ${accent} ${
        active ? "ring-2 ring-violet-400 ring-offset-1" : "border-zinc-200/80"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <span className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${iconBg}`}>
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
        </span>
        <span className="text-2xl font-bold tabular-nums text-zinc-900">{value}</span>
      </div>
      <p className="mt-2 text-xs font-semibold leading-snug text-zinc-800">{label}</p>
      <p className="mt-1 text-[11px] font-medium text-violet-700">Ver listado →</p>
    </button>
  );
}

function FacturasProcesoCView() {
  const register = usePageRefreshRegister();
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<PurchaseOrderDto[]>([]);
  const [commitments, setCommitments] = useState<InvoiceFirstCommitmentDto[]>([]);
  const [activeKpi, setActiveKpi] = useState<AgregarFacturaKpiKey | null>("pendientes");

  const load = useCallback(async () => {
    const [ordRes, invRes] = await Promise.all([
      fetch("/api/orders", { credentials: "include" }),
      fetch("/api/invoice-first-commitments?includeAll=1", { credentials: "include" }),
    ]);
    if (ordRes.ok) {
      const d = (await ordRes.json()) as { orders: PurchaseOrderDto[] };
      setOrders(d.orders);
    }
    if (invRes.ok) {
      const d = (await invRes.json()) as { commitments: InvoiceFirstCommitmentDto[] };
      setCommitments(d.commitments);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
    register(() => void load());
  }, [load, register]);

  const enriched = useMemo(
    () => enrichInvoiceFirstCommitments(commitments, orders),
    [commitments, orders]
  );
  const kpis = useMemo(() => agregarFacturaKpis(enriched), [enriched]);

  function selectKpi(key: AgregarFacturaKpiKey) {
    setActiveKpi((prev) => (prev === key ? null : key));
  }

  if (loading) return <LoadingScreen message="Cargando facturas" />;

  return (
    <div className="space-y-4 pb-6">
      <header>
        <h1 className="text-xl font-bold text-zinc-900 sm:text-2xl">Facturas</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Facturas del Proceso C registradas por Dirección (Diomedes). Revisa, solicita OC a Compras o
          da seguimiento al pago.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <KpiCard
          label="Facturas pendientes de abrir expediente"
          value={kpis.pendientesExpediente}
          accent="border-l-violet-400 bg-violet-50/35"
          iconBg="bg-violet-100 text-violet-800"
          active={activeKpi === "pendientes"}
          onClick={() => selectKpi("pendientes")}
        />
        <KpiCard
          label="Solicitudes registradas este mes"
          value={kpis.aprobadasMes}
          accent="border-l-orange-400 bg-orange-50/40"
          iconBg="bg-orange-100 text-orange-700"
          active={activeKpi === "mes"}
          onClick={() => selectKpi("mes")}
        />
        <KpiCard
          label="Facturas rechazadas"
          value={kpis.rechazadas}
          accent="border-l-sky-400 bg-sky-50/35"
          iconBg="bg-sky-100 text-sky-800"
          active={activeKpi === "rechazadas"}
          onClick={() => selectKpi("rechazadas")}
        />
      </div>

      {activeKpi ? (
        <AgregarFacturaCommitmentsList
          kpiKey={activeKpi}
          commitments={enriched}
          onClose={() => setActiveKpi(null)}
          onMutated={() => void load()}
        />
      ) : (
        <section className="card p-6 text-center">
          <p className="text-sm text-zinc-600">
            Selecciona un indicador arriba para ver el listado de facturas.
          </p>
          <Link href="/inicio" className="mt-4 inline-block text-sm font-semibold text-orange-700 hover:underline">
            Ir al inicio →
          </Link>
        </section>
      )}
    </div>
  );
}

export default function FacturasPage() {
  const { user, ready } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (ready && user && user.role !== "pagos") {
      router.replace("/inicio");
    }
  }, [ready, user, router]);

  if (!ready || !user) return <LoadingScreen message="Cargando" />;
  if (user.role !== "pagos") return null;

  return <FacturasProcesoCView />;
}
