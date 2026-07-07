"use client";

import Link from "next/link";
import { HomeActivitySidebar } from "@/components/dashboard/home-activity-sidebar";
import { partialPaymentLabel, partialOrdersForSidebar } from "@/lib/dashboard/direccion-proceso-c-dashboard";
import { direccionAlerts, partialProgress } from "@/lib/dashboard/direccion-dashboard";
import type { MovementDto, PendingMovementDto, PurchaseOrderDto } from "@/lib/domain/types";
import { formatMoney } from "@/lib/format";

const PROCESS_STEPS = [
  "Dirección registra facturas y autoriza compromisos.",
  "Administración solicita la OC a Compras.",
  "Se generan pagos (pueden ser parciales).",
  "Recepción registra documentos / comprobantes.",
  "Contabilidad valida y da seguimiento fiscal.",
];

const ALERT_TONE: Record<string, string> = {
  red: "border-red-200 bg-red-50/80 text-red-900",
  amber: "border-amber-200 bg-amber-50/80 text-amber-950",
  violet: "border-violet-200 bg-violet-50/80 text-violet-950",
};

export function DireccionHomeSidebar({
  orders,
  recentMovements,
  pendingMovements,
}: {
  orders: PurchaseOrderDto[];
  recentMovements: MovementDto[];
  pendingMovements: PendingMovementDto[];
}) {
  const partials = partialOrdersForSidebar(orders);
  const alerts = direccionAlerts(orders);

  return (
    <aside className="flex h-full min-h-0 flex-col gap-3">
      <section className="card p-4">
        <div className="mb-2 flex items-center justify-between gap-2">
          <h3 className="text-sm font-bold text-zinc-900">Pagos parciales activos</h3>
          <Link href="/pagos" className="text-[11px] font-medium text-sky-700 hover:underline">
            Ver
          </Link>
        </div>
        <ul className="space-y-2">
          {partials.length === 0 ? (
            <li className="py-2 text-center text-xs text-zinc-400">Sin parcialidades activas.</li>
          ) : (
            partials.map((o) => {
              const prog = partialProgress(o);
              return (
                <li key={o.id}>
                  <Link
                    href={`/ordenes/${o.id}`}
                    className="block rounded-xl border border-transparent px-2 py-2 transition hover:border-sky-100 hover:bg-sky-50/40"
                  >
                    <p className="truncate text-xs font-semibold text-zinc-800">
                      {o.ocFolio || o.title} · {o.supplierName}
                    </p>
                    <p className="mt-0.5 text-[11px] tabular-nums text-zinc-600">
                      {formatMoney(o.amountPaidSoFar, o.currency)} de {formatMoney(o.totalAmount, o.currency)}
                    </p>
                    <p className="text-[10px] text-zinc-500">{partialPaymentLabel(o)}</p>
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-zinc-200">
                      <div className="h-full rounded-full bg-sky-500" style={{ width: `${prog.pct}%` }} />
                    </div>
                  </Link>
                </li>
              );
            })
          )}
        </ul>
      </section>

      <section className="card p-4">
        <h3 className="text-sm font-bold text-zinc-900">Alertas importantes</h3>
        <ul className="mt-3 space-y-2">
          {alerts.length === 0 ? (
            <li className="rounded-xl border border-emerald-100 bg-emerald-50/50 px-3 py-2 text-xs text-emerald-800">
              Sin alertas críticas. El flujo avanza con normalidad.
            </li>
          ) : (
            alerts.slice(0, 3).map((a) => (
              <li key={a.id}>
                <Link
                  href={a.href}
                  className={`block rounded-xl border px-3 py-2.5 text-xs leading-relaxed ${ALERT_TONE[a.tone]}`}
                >
                  {a.message}
                </Link>
              </li>
            ))
          )}
        </ul>
      </section>

      <section className="card p-4">
        <h3 className="text-sm font-bold text-zinc-900">¿Cómo funciona?</h3>
        <ol className="mt-2 list-decimal space-y-1.5 pl-4 text-[11px] leading-relaxed text-zinc-600">
          {PROCESS_STEPS.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
        <Link href="/flujo" className="mt-3 text-[11px] font-semibold text-sky-700 hover:underline">
          Ver mapa del proceso →
        </Link>
      </section>

      <section className="card p-4">
        <div className="mb-2 flex items-center justify-between gap-2">
          <h3 className="text-sm font-bold text-zinc-900">Actividad del equipo</h3>
          <Link href="/movimientos" className="text-[11px] font-medium text-indigo-700 hover:underline">
            Ver todos →
          </Link>
        </div>
        <HomeActivitySidebar
          compact
          limit={4}
          recentMovements={recentMovements}
          pendingMovements={pendingMovements}
        />
      </section>
    </aside>
  );
}
