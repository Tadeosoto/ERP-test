"use client";

import Link from "next/link";
import { MovementsPanel } from "@/components/dashboard/movements-panel";
import { pendingPaymentOrders } from "@/lib/dashboard/contabilidad-dashboard";
import type { MovementDto, PendingMovementDto, PurchaseOrderDto } from "@/lib/domain/types";
import { formatMoney } from "@/lib/format";

export function ContabilidadHomeSidebar({
  orders,
  recentMovements,
  pendingMovements,
}: {
  orders: PurchaseOrderDto[];
  recentMovements: MovementDto[];
  pendingMovements: PendingMovementDto[];
}) {
  const pendingPayments = pendingPaymentOrders(orders, 4);

  return (
    <aside className="flex h-full min-h-0 flex-col gap-3 overflow-y-auto lg:max-h-full">
      <MovementsPanel
        title="Últimos movimientos"
        viewAllHref="/movimientos"
        empty="Sin movimientos recientes."
        variant="recent"
        recent={recentMovements}
        compact
        limit={4}
      />

      <section className="card flex min-w-0 flex-col overflow-hidden p-4">
        <div className="mb-2 flex items-center justify-between gap-2">
          <h3 className="text-sm font-bold text-zinc-900">Pendientes de pago</h3>
          <Link href="/obras?estado=pago" className="text-[11px] font-medium text-orange-700 hover:underline">
            Ver todos
          </Link>
        </div>
        <ul className="space-y-2">
          {pendingPayments.length === 0 ? (
            <li className="py-3 text-center text-xs text-zinc-400">Sin pagos pendientes.</li>
          ) : (
            pendingPayments.map((o) => (
              <li key={o.id}>
                <Link
                  href={`/ordenes/${o.id}`}
                  className="flex items-start gap-2 rounded-xl border border-transparent px-1 py-1.5 transition hover:border-orange-100 hover:bg-orange-50/40"
                >
                  <span className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-orange-100 text-orange-700">
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-xs font-semibold text-zinc-800">
                      {o.ocFolio || o.title}
                    </span>
                    <span className="block truncate text-[11px] text-zinc-500">{o.supplierName}</span>
                    <span className="mt-0.5 block text-[11px] font-medium tabular-nums text-zinc-700">
                      {formatMoney(o.amountRemaining || o.totalAmount, o.currency)} · {o.obraName}
                    </span>
                  </span>
                </Link>
              </li>
            ))
          )}
        </ul>
      </section>

      <MovementsPanel
        title="Pendientes generales"
        viewAllHref="/movimientos/pendientes"
        empty="No hay pendientes en el flujo."
        variant="pending"
        pending={pendingMovements}
        compact
        limit={3}
      />
    </aside>
  );
}
