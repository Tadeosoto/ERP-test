"use client";

import Link from "next/link";
import {
  documentosRecientes,
  obrasConMasPagosMes,
  proveedoresFrecuentes,
} from "@/lib/dashboard/contabilidad-dashboard";
import type { PurchaseOrderDto } from "@/lib/domain/types";
import { formatDateShort, formatDateTime, formatMoney } from "@/lib/format";

export function ContabilidadHomeBottomColumns({ orders }: { orders: PurchaseOrderDto[] }) {
  const obrasTop = obrasConMasPagosMes(orders, 3);
  const proveedores = proveedoresFrecuentes(orders, 3);
  const docs = documentosRecientes(orders, 3);

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <section className="card flex min-w-0 flex-col overflow-hidden p-4">
        <div className="mb-2 flex items-center justify-between gap-2">
          <h3 className="text-sm font-bold text-zinc-900">Obras con más pagos este mes</h3>
          <Link href="/obras" className="text-[11px] font-medium text-sky-700 hover:underline">
            Ver
          </Link>
        </div>
        <ul className="space-y-2">
          {obrasTop.length === 0 ? (
            <li className="py-4 text-center text-xs text-zinc-400">Sin pagos registrados este mes.</li>
          ) : (
            obrasTop.map((row) => (
              <li key={row.obraId}>
                <Link
                  href={`/obras/${row.obraId}`}
                  className="block rounded-xl border border-transparent px-2 py-2 transition hover:border-sky-100 hover:bg-sky-50/40"
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
          <h3 className="text-sm font-bold text-zinc-900">Proveedores frecuentes</h3>
          <Link href="/proveedores" className="text-[11px] font-medium text-violet-700 hover:underline">
            Ver
          </Link>
        </div>
        <ul className="space-y-2">
          {proveedores.length === 0 ? (
            <li className="py-4 text-center text-xs text-zinc-400">Sin historial de pagos.</li>
          ) : (
            proveedores.map((p) => (
              <li key={p.name}>
                <div className="rounded-xl px-2 py-2">
                  <p className="truncate text-xs font-semibold text-zinc-800">{p.name}</p>
                  <p className="mt-0.5 text-[11px] text-zinc-500">
                    {p.count} pago{p.count === 1 ? "" : "s"}
                  </p>
                </div>
              </li>
            ))
          )}
        </ul>
      </section>

      <section className="card flex min-w-0 flex-col overflow-hidden p-4 sm:col-span-2 lg:col-span-1">
        <div className="mb-2 flex items-center justify-between gap-2">
          <h3 className="text-sm font-bold text-zinc-900">Documentos consultados recientemente</h3>
          <Link href="/obras" className="text-[11px] font-medium text-violet-700 hover:underline">
            Ver
          </Link>
        </div>
        <ul className="space-y-2">
          {docs.length === 0 ? (
            <li className="py-4 text-center text-xs text-zinc-400">Sin documentos recientes.</li>
          ) : (
            docs.map((d) => (
              <li key={d.id}>
                <div className="flex items-start gap-2 rounded-xl border border-transparent px-2 py-2 transition hover:border-violet-100 hover:bg-violet-50/40">
                  <span className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-violet-100 text-violet-700">
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                  </span>
                  <span className="min-w-0 flex-1">
                    <Link
                      href={`/ordenes/${d.orderId}#documentos`}
                      className="block truncate text-xs font-semibold text-zinc-800 hover:underline"
                    >
                      {d.label}
                    </Link>
                    <span className="block truncate text-[11px] text-zinc-500">{d.sub}</span>
                    <span className="mt-0.5 block text-[10px] text-violet-700">{formatDateTime(d.at)}</span>
                    <span className="mt-1 flex gap-2">
                      <a
                        href={`/api/files/${d.fileId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[10px] font-semibold text-orange-700 hover:underline"
                      >
                        Ver
                      </a>
                      <a
                        href={`/api/files/${d.fileId}?download=1`}
                        className="text-[10px] font-semibold text-teal-700 hover:underline"
                      >
                        Descargar
                      </a>
                    </span>
                  </span>
                </div>
              </li>
            ))
          )}
        </ul>
      </section>
    </div>
  );
}
