"use client";

import { useRouter } from "next/navigation";
import type { CompanyCardMovementDto } from "@/lib/domain/types";
import { formatDate, formatMoney } from "@/lib/format";
import { cardSubtitle } from "@/lib/tarjetas/summary";

const money = (amount: number) => formatMoney(amount, "MXN");

function statusClass(status: string): string {
  if (status === "comprobado") return "bg-teal-50 text-teal-800";
  if (status === "por_comprobar") return "bg-amber-50 text-amber-900";
  return "bg-sky-50 text-sky-800";
}

export function MovimientosTable({ rows }: { rows: CompanyCardMovementDto[] }) {
  const router = useRouter();
  if (rows.length === 0) return <p className="p-6 text-sm text-zinc-500">Todavía no hay movimientos.</p>;
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-left text-sm">
        <thead className="bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500">
          <tr>
            <th className="px-3 py-3 font-semibold">Fecha</th>
            <th className="px-3 py-3 font-semibold">Tarjeta</th>
            <th className="px-3 py-3 font-semibold">Concepto</th>
            <th className="px-3 py-3 font-semibold">Proveedor</th>
            <th className="px-3 py-3 font-semibold">Destino</th>
            <th className="px-3 py-3 font-semibold">Importe</th>
            <th className="px-3 py-3 font-semibold">Comprobante</th>
            <th className="px-3 py-3 font-semibold">Estatus</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100">
          {rows.map((row) => (
            <tr key={row.id} className="cursor-pointer hover:bg-orange-50/40" onClick={() => router.push(`/tarjetas/movimientos/${row.id}`)}>
              <td className="whitespace-nowrap px-3 py-3 text-zinc-600">{formatDate(row.occurredOn)}</td>
              <td className="px-3 py-3">
                <p className="font-medium text-zinc-900">{row.cardLabel}</p>
                {cardSubtitle(row.cardLabel, row.cardLastFour) && (
                  <p className="text-xs text-zinc-500">{cardSubtitle(row.cardLabel, row.cardLastFour)}</p>
                )}
              </td>
              <td className="px-3 py-3 text-zinc-800">{row.concept}</td>
              <td className="px-3 py-3 text-zinc-700">{row.supplierName || "—"}</td>
              <td className="px-3 py-3 text-zinc-700">{row.kind === "carga" ? "—" : row.destinationLabel}</td>
              <td className="whitespace-nowrap px-3 py-3 tabular-nums font-medium">{money(row.amount)}</td>
              <td className="px-3 py-3 text-zinc-700">{row.receiptLabel}</td>
              <td className="px-3 py-3">
                <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${statusClass(row.status)}`}>
                  {row.statusLabel}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
