"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { OrderActionMenu } from "@/components/obras/order-action-menu";
import { OcLink } from "@/components/ui/oc-link";
import {
  contabilidadPrimaryAction,
  filterExpedienteSearch,
  recentPaidOrders,
} from "@/lib/dashboard/contabilidad-dashboard";
import type { PurchaseOrderDto, Role } from "@/lib/domain/types";
import { formatDateShort, formatMoney } from "@/lib/format";

const PAGE_SIZES = [5, 10, 15] as const;

export function ContabilidadRecentPaymentsPanel({
  orders,
  role,
  searchQuery = "",
  embedded = false,
}: {
  orders: PurchaseOrderDto[];
  role: Role;
  searchQuery?: string;
  embedded?: boolean;
}) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<(typeof PAGE_SIZES)[number]>(5);

  const filtered = useMemo(() => {
    const base = recentPaidOrders(orders, 999);
    return filterExpedienteSearch(base, searchQuery);
  }, [orders, searchQuery]);

  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageItems = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page, pageSize]);

  useEffect(() => {
    if (page > pages) setPage(pages);
  }, [page, pages]);

  const wrapperCls = embedded
    ? "card flex min-h-0 min-w-0 flex-col overflow-hidden"
    : "card flex min-h-0 flex-col overflow-hidden";

  return (
    <section className={wrapperCls}>
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-zinc-100 px-4 py-3">
        <h2 className="text-sm font-bold text-zinc-900">Pagos recientes</h2>
        <Link href="/ordenes" className="text-xs font-medium text-emerald-700 hover:underline">
          Ver todos los pagos →
        </Link>
      </div>

      <div className="hidden min-h-0 flex-1 overflow-auto lg:block">
        <table className="min-w-full text-left text-sm">
          <thead className="sticky top-0 z-10 bg-zinc-50/95 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
            <tr>
              <th className="px-4 py-2.5">Folio OC</th>
              <th className="px-4 py-2.5">Proveedor</th>
              <th className="px-4 py-2.5">Obra</th>
              <th className="px-4 py-2.5 text-right">Monto</th>
              <th className="px-4 py-2.5">Fecha pago</th>
              <th className="px-4 py-2.5">Estado</th>
              <th className="px-4 py-2.5 text-right">Acción</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {pageItems.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-sm text-zinc-500">
                  {searchQuery.trim()
                    ? "No hay pagos que coincidan con la búsqueda."
                    : "Aún no hay pagos registrados."}
                </td>
              </tr>
            ) : (
              pageItems.map((order) => {
                const primary = contabilidadPrimaryAction(order, role);
                const payDate =
                  order.paymentRecords[0]?.createdAt ??
                  (order.amountPaidSoFar > 0 ? order.updatedAt : null);
                return (
                  <tr key={order.id} className="hover:bg-zinc-50/60">
                    <td className="px-4 py-2.5">
                      <OcLink order={order} showPdfIcon className="text-sm" />
                    </td>
                    <td className="max-w-[10rem] truncate px-4 py-2.5 text-zinc-700">
                      {order.supplierName}
                    </td>
                    <td className="max-w-[9rem] truncate px-4 py-2.5 font-medium text-sky-800">
                      {order.obraName}
                    </td>
                    <td className="px-4 py-2.5 text-right font-semibold tabular-nums text-zinc-900">
                      {formatMoney(
                        order.amountPaidSoFar > 0 ? order.amountPaidSoFar : order.totalAmount,
                        order.currency
                      )}
                    </td>
                    <td className="px-4 py-2.5 tabular-nums text-zinc-600">
                      {payDate ? formatDateShort(payDate) : "—"}
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-semibold text-emerald-800 ring-1 ring-inset ring-emerald-200/80">
                        Pagado
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <OrderActionMenu
                        order={order}
                        primaryLabel={primary.label}
                        primaryHref={primary.href}
                        appearance="neutral"
                        showDropdown={primary.showDropdown}
                      />
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="divide-y divide-zinc-100 lg:hidden">
        {pageItems.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-zinc-500">
            {searchQuery.trim() ? "Sin resultados." : "Aún no hay pagos registrados."}
          </p>
        ) : (
          pageItems.map((order) => {
            const primary = contabilidadPrimaryAction(order, role);
            const payDate =
              order.paymentRecords[0]?.createdAt ??
              (order.amountPaidSoFar > 0 ? order.updatedAt : null);
            return (
              <div key={order.id} className="px-4 py-3">
                <OcLink order={order} showPdfIcon className="text-sm" />
                <p className="mt-1 truncate text-xs text-zinc-600">{order.supplierName}</p>
                <p className="truncate text-xs font-medium text-sky-800">{order.obraName}</p>
                <div className="mt-2 flex items-center justify-between gap-2">
                  <span className="text-sm font-bold tabular-nums">
                    {formatMoney(
                      order.amountPaidSoFar > 0 ? order.amountPaidSoFar : order.totalAmount,
                      order.currency
                    )}
                  </span>
                  <span className="text-xs text-zinc-500">
                    {payDate ? formatDateShort(payDate) : "—"}
                  </span>
                </div>
                <div className="mt-2 flex justify-end">
                  <OrderActionMenu
                    order={order}
                    primaryLabel={primary.label}
                    primaryHref={primary.href}
                    appearance="neutral"
                    showDropdown={primary.showDropdown}
                  />
                </div>
              </div>
            );
          })
        )}
      </div>

      {filtered.length > pageSize && (
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-t border-zinc-100 px-4 py-2.5 text-xs text-zinc-600">
          <label className="flex items-center gap-2">
            Filas
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value) as (typeof PAGE_SIZES)[number]);
                setPage(1);
              }}
              className="rounded-lg border border-zinc-200 px-2 py-1"
            >
              {PAGE_SIZES.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="rounded-lg border border-zinc-200 px-2 py-1 disabled:opacity-40"
            >
              Anterior
            </button>
            <span className="px-2 tabular-nums">
              {page} / {pages}
            </span>
            <button
              type="button"
              disabled={page >= pages}
              onClick={() => setPage((p) => p + 1)}
              className="rounded-lg border border-zinc-200 px-2 py-1 disabled:opacity-40"
            >
              Siguiente
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
