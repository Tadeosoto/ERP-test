"use client";

import Link from "next/link";
import { HomeActivitySidebar } from "@/components/dashboard/home-activity-sidebar";
import { partialPaymentLabel, partialOrdersForSidebar } from "@/lib/dashboard/direccion-proceso-c-dashboard";
import { direccionAlerts, partialProgress, isActivePartial } from "@/lib/dashboard/direccion-dashboard";
import type { MovementDto, PendingMovementDto, PurchaseOrderDto } from "@/lib/domain/types";
import { formatMoney } from "@/lib/format";

const ALERT_TONE: Record<string, string> = {
  red: "border-red-200 bg-red-50/80 text-red-900",
  amber: "border-amber-200 bg-amber-50/80 text-amber-950",
  violet: "border-violet-200 bg-violet-50/80 text-violet-950",
  orange: "border-orange-200 bg-orange-50/80 text-orange-950",
};

export function DireccionHomeSidebar({
  orders,
  recentMovements,
  pendingMovements,
  sticky = false,
  extraAlerts = [],
}: {
  orders: PurchaseOrderDto[];
  recentMovements: MovementDto[];
  pendingMovements: PendingMovementDto[];
  sticky?: boolean;
  extraAlerts?: { id: string; tone: string; message: string }[];
}) {
  const partials = partialOrdersForSidebar(orders);
  const partialCount = orders.filter(isActivePartial).length;
  const alerts = [...extraAlerts, ...direccionAlerts(orders)].slice(0, 4);

  return (
    <aside
      className={`flex flex-col gap-3 ${sticky ? "xl:sticky xl:top-4 xl:self-start" : ""}`}
    >
      <section className="rounded-2xl border border-zinc-200 bg-white p-3.5 shadow-sm">
        <div className="mb-2 flex items-center justify-between gap-2">
          <h3 className="text-sm font-bold text-zinc-900">Pagos parciales activos</h3>
          <Link href="/pagos" className="text-[11px] font-medium text-sky-700 hover:underline">
            Ver todas
          </Link>
        </div>
        {partials.length === 0 ? (
          <div className="flex items-center justify-between gap-3 py-1">
            <div>
              <p className="text-2xl font-bold tabular-nums text-zinc-900">{partialCount}</p>
              <p className="text-xs text-zinc-500">Sin parcialidades activas</p>
            </div>
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-sky-100 text-sky-700">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8V6m0 12v-2m9-4a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </span>
          </div>
        ) : (
          <ul className="space-y-2">
            {partials.map((o) => {
              const prog = partialProgress(o);
              return (
                <li key={o.id}>
                  <Link
                    href={`/ordenes/${o.id}`}
                    className="block rounded-xl border border-transparent px-1 py-1.5 transition hover:border-sky-100 hover:bg-sky-50/40"
                  >
                    <p className="truncate text-xs font-semibold text-zinc-800">
                      {o.ocFolio || o.title} · {o.supplierName}
                    </p>
                    <p className="mt-0.5 text-[11px] tabular-nums text-zinc-600">
                      {formatMoney(o.amountPaidSoFar, o.currency)} de {formatMoney(o.totalAmount, o.currency)}
                    </p>
                    <p className="text-[10px] text-zinc-500">{partialPaymentLabel(o)}</p>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-zinc-200">
                      <div className="h-full rounded-full bg-sky-500" style={{ width: `${prog.pct}%` }} />
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="rounded-2xl border border-zinc-200 bg-white p-3.5 shadow-sm">
        <h3 className="text-sm font-bold text-zinc-900">Alertas importantes</h3>
        <ul className="mt-2.5 space-y-2">
          {alerts.length === 0 ? (
            <li className="rounded-xl border border-emerald-100 bg-emerald-50/50 px-3 py-2 text-xs text-emerald-800">
              Sin alertas críticas. El flujo avanza con normalidad.
            </li>
          ) : (
            alerts.slice(0, 4).map((a) => (
              <li key={a.id}>
                {"href" in a && a.href ? (
                  <Link
                    href={a.href}
                    className={`block rounded-xl border px-3 py-2 text-xs leading-relaxed ${ALERT_TONE[a.tone] ?? ALERT_TONE.amber}`}
                  >
                    {a.message}
                  </Link>
                ) : (
                  <div
                    className={`rounded-xl border px-3 py-2 text-xs leading-relaxed ${ALERT_TONE[a.tone] ?? ALERT_TONE.amber}`}
                  >
                    {a.message}
                  </div>
                )}
              </li>
            ))
          )}
        </ul>
      </section>

      <section className="rounded-2xl border border-zinc-200 bg-white p-3.5 shadow-sm">
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
