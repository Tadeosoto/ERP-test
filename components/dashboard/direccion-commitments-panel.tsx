"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { InvoiceFirstCommitmentDto } from "@/lib/domain/types";
import {
  commitmentDisplayStatus,
  commitmentStatusTone,
  filterCommitmentsByTab,
  type DireccionCommitmentTab,
} from "@/lib/dashboard/direccion-proceso-c-dashboard";
import { formatDateShort, formatMoney } from "@/lib/format";

const TABS: { key: DireccionCommitmentTab; label: string }[] = [
  { key: "todos", label: "Todos" },
  { key: "esperando_oc", label: "Esperando OC" },
  { key: "parciales", label: "Con pagos parciales" },
  { key: "completados", label: "Pagos completados" },
];

export function DireccionCommitmentsPanel({
  commitments,
  onUploadClick,
}: {
  commitments: InvoiceFirstCommitmentDto[];
  onUploadClick: () => void;
}) {
  const [tab, setTab] = useState<DireccionCommitmentTab>("todos");

  const rows = useMemo(() => filterCommitmentsByTab(commitments, tab), [commitments, tab]);

  return (
    <section className="card flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="flex flex-col gap-3 border-b border-zinc-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base font-bold text-zinc-900">Compromisos aprobados (seguimiento)</h2>
          <div className="mt-2 flex flex-wrap gap-1 rounded-xl bg-zinc-100 p-1">
            {TABS.map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => setTab(t.key)}
                className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold transition ${
                  tab === t.key ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-600 hover:text-zinc-900"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
        <button
          type="button"
          onClick={onUploadClick}
          className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl bg-violet-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-violet-800"
        >
          <span aria-hidden>+</span> Subir nueva factura
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-zinc-50/80 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
            <tr>
              <th className="px-4 py-2.5">Factura</th>
              <th className="px-4 py-2.5">Proveedor</th>
              <th className="px-4 py-2.5">Obra</th>
              <th className="px-4 py-2.5 text-right">Total factura</th>
              <th className="px-4 py-2.5 text-right">Pagado</th>
              <th className="px-4 py-2.5 text-right">Saldo</th>
              <th className="px-4 py-2.5">Estado</th>
              <th className="px-4 py-2.5">Último pago</th>
              <th className="px-4 py-2.5 text-right">Acción</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-10 text-center text-sm text-zinc-500">
                  {tab === "todos"
                    ? "Aún no hay compromisos registrados. Usa «Subir nueva factura» para iniciar el Proceso C."
                    : "No hay registros en esta pestaña."}
                </td>
              </tr>
            ) : (
              rows.map((c) => (
                <tr key={c.id} className="hover:bg-zinc-50/60">
                  <td className="px-4 py-2.5 font-semibold text-violet-900">{c.invoiceFolio}</td>
                  <td className="max-w-[8rem] truncate px-4 py-2.5 text-zinc-700">{c.supplierName}</td>
                  <td className="max-w-[9rem] truncate px-4 py-2.5 text-sky-800">
                    {c.obraName ?? "—"}
                  </td>
                  <td className="px-4 py-2.5 text-right font-semibold tabular-nums">
                    {formatMoney(c.displayTotal, c.currency)}
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-zinc-700">
                    {formatMoney(c.amountPaidSoFar, c.currency)}
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-orange-800">
                    {formatMoney(c.amountRemaining, c.currency)}
                  </td>
                  <td className="px-4 py-2.5">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${commitmentStatusTone(c)}`}
                    >
                      {commitmentDisplayStatus(c)}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 tabular-nums text-zinc-600">
                    {c.lastPaymentAt ? formatDateShort(c.lastPaymentAt) : "—"}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <Link
                      href={`/compromisos-c/${c.id}`}
                      className="inline-flex rounded-lg border border-violet-200 bg-violet-50 px-3 py-1.5 text-xs font-semibold text-violet-800 hover:bg-violet-100"
                    >
                      Ver seguimiento
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="border-t border-zinc-100 bg-sky-50/40 px-4 py-3">
        <p className="text-xs leading-relaxed text-sky-900">
          Estos compromisos ya fueron registrados por Dirección. Administración solicitará la Orden de Compra con
          Compras.
        </p>
      </div>
    </section>
  );
}
