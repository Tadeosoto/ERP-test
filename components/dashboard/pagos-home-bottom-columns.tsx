"use client";

import Link from "next/link";
import { obrasConPagosPendientes } from "@/lib/dashboard/pagos-dashboard";
import type { ObraDto, PurchaseOrderDto, SupplierDto } from "@/lib/domain/types";
import { formatDateShort, formatMoney } from "@/lib/format";
import { sortByCreatedAtDesc } from "@/lib/list-utils";

export function PagosHomeBottomColumns({
  orders,
  suppliers,
  obras,
}: {
  orders: PurchaseOrderDto[];
  suppliers: SupplierDto[];
  obras: ObraDto[];
}) {
  const obrasPendientes = obrasConPagosPendientes(orders, 3);
  const recentSuppliers = sortByCreatedAtDesc(suppliers).slice(0, 3);
  const recentObras = sortByCreatedAtDesc(obras.filter((o) => o.active)).slice(0, 3);

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <section className="card flex min-w-0 flex-col overflow-hidden p-4">
        <div className="mb-2 flex items-center justify-between gap-2">
          <h3 className="text-sm font-bold text-zinc-900">Obras con pagos pendientes</h3>
          <Link href="/obras?estado=pago" className="text-[11px] font-medium text-orange-700 hover:underline">
            Ver
          </Link>
        </div>
        <ul className="space-y-2">
          {obrasPendientes.length === 0 ? (
            <li className="py-4 text-center text-xs text-zinc-400">Sin pagos pendientes por obra.</li>
          ) : (
            obrasPendientes.map((row) => (
              <li key={row.obraId}>
                <Link
                  href={`/obras/${row.obraId}`}
                  className="block rounded-xl border border-transparent px-2 py-2 transition hover:border-orange-100 hover:bg-orange-50/40"
                >
                  <p className="truncate text-xs font-semibold text-zinc-800">{row.name}</p>
                  <p className="mt-0.5 text-[11px] text-zinc-500">
                    {row.count} pago{row.count === 1 ? "" : "s"} ·{" "}
                    <span className="font-medium tabular-nums text-zinc-700">
                      {formatMoney(row.total, row.currency)}
                    </span>
                  </p>
                </Link>
              </li>
            ))
          )}
        </ul>
      </section>

      <section className="card flex min-w-0 flex-col overflow-hidden p-4">
        <div className="mb-2 flex items-center justify-between gap-2">
          <h3 className="text-sm font-bold text-zinc-900">Proveedores recientes</h3>
          <Link href="/proveedores" className="text-[11px] font-medium text-orange-700 hover:underline">
            Ver
          </Link>
        </div>
        <ul className="space-y-2">
          {recentSuppliers.length === 0 ? (
            <li className="py-4 text-center text-xs text-zinc-400">Sin proveedores registrados.</li>
          ) : (
            recentSuppliers.map((s) => (
              <li key={s.id}>
                <Link
                  href="/proveedores"
                  className="block rounded-xl border border-transparent px-2 py-2 transition hover:border-orange-100 hover:bg-orange-50/40"
                >
                  <p className="truncate text-xs font-semibold text-zinc-800">{s.displayName}</p>
                  <p className="mt-0.5 text-[11px] text-zinc-500">
                    RFC {s.rfc} · {formatDateShort(s.createdAt)}
                  </p>
                </Link>
              </li>
            ))
          )}
        </ul>
      </section>

      <section className="card flex min-w-0 flex-col overflow-hidden p-4 sm:col-span-2 lg:col-span-1">
        <div className="mb-2 flex items-center justify-between gap-2">
          <h3 className="text-sm font-bold text-zinc-900">Obras recientes</h3>
          <Link href="/obras" className="text-[11px] font-medium text-orange-700 hover:underline">
            Ver
          </Link>
        </div>
        <ul className="space-y-2">
          {recentObras.length === 0 ? (
            <li className="py-4 text-center text-xs text-zinc-400">Sin obras activas.</li>
          ) : (
            recentObras.map((o) => (
              <li key={o.id}>
                <Link
                  href={`/obras/${o.id}`}
                  className="block rounded-xl border border-transparent px-2 py-2 transition hover:border-orange-100 hover:bg-orange-50/40"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="min-w-0 truncate text-xs font-semibold text-zinc-800">{o.name}</p>
                    <span className="shrink-0 rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-semibold text-violet-800">
                      Activa
                    </span>
                  </div>
                  <p className="mt-0.5 truncate text-[11px] text-zinc-500">
                    {o.client || o.code} · {o.orderCount} OC
                  </p>
                </Link>
              </li>
            ))
          )}
        </ul>
      </section>
    </div>
  );
}
