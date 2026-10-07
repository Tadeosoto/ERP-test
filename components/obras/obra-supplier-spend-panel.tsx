"use client";

import type { SupplierSpendSlice } from "@/lib/obras/materials-budget";
import { formatMoney } from "@/lib/format";

const SIZE = 200;
const STROKE = 26;
const R = (SIZE - STROKE) / 2;
const C = 2 * Math.PI * R;

function SupplierDonut({ slices }: { slices: SupplierSpendSlice[] }) {
  let offset = 0;
  return (
    <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} className="shrink-0" aria-hidden>
      <g transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}>
        {slices.length === 0 ? (
          <circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={R}
            fill="none"
            stroke="#e4e4e7"
            strokeWidth={STROKE}
          />
        ) : (
          slices.map((slice) => {
            const length = (slice.pct / 100) * C;
            const dash = `${length} ${C - length}`;
            const el = (
              <circle
                key={slice.key}
                cx={SIZE / 2}
                cy={SIZE / 2}
                r={R}
                fill="none"
                stroke={slice.color}
                strokeWidth={STROKE}
                strokeDasharray={dash}
                strokeDashoffset={-offset}
                strokeLinecap={slices.length === 1 ? "round" : "butt"}
              />
            );
            offset += length;
            return el;
          })
        )}
      </g>
    </svg>
  );
}

export function ObraSupplierSpendPanel({
  slices,
  total,
}: {
  slices: SupplierSpendSlice[];
  total: number;
}) {
  return (
    <section className="@container card flex h-full flex-col overflow-hidden p-4 sm:p-5">
      <div className="min-h-[4.5rem]">
        <h2 className="text-lg font-bold text-zinc-900">Compra por proveedor</h2>
        <p className="mt-1 line-clamp-2 text-sm text-zinc-600">
          Cuánto del material comprado en esta obra corresponde a cada proveedor (órdenes de compra en
          MXN).
        </p>
      </div>

      <div className="mt-3 flex min-h-0 flex-1 flex-col gap-4 @[640px]:flex-row @[640px]:items-start @[640px]:justify-between">
        <div className="min-w-0 flex-1">
          {slices.length === 0 ? (
            <p className="text-sm text-zinc-500">Aún no hay compras registradas en esta obra.</p>
          ) : (
            <ul className="max-h-[220px] space-y-0.5 overflow-y-auto pr-1">
              {slices.map((slice) => (
                <li
                  key={slice.key}
                  className="flex min-w-0 items-center gap-2 rounded-md px-1.5 py-1 text-xs hover:bg-zinc-50"
                >
                  <span
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ background: slice.color }}
                  />
                  <span className="min-w-0 flex-1 truncate text-zinc-700">{slice.supplierName}</span>
                  <span className="shrink-0 tabular-nums font-semibold text-zinc-900">
                    {formatMoney(slice.amount, "MXN")}
                  </span>
                  <span className="w-10 shrink-0 text-right tabular-nums text-zinc-500">
                    {slice.pct.toLocaleString("es-MX", { maximumFractionDigits: 1 })}%
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex shrink-0 flex-col items-center gap-2 self-center @[640px]:self-start">
          <div className="relative">
            <SupplierDonut slices={slices} />
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-8 text-center">
              <span className="text-base font-bold leading-tight tabular-nums text-zinc-900">
                {formatMoney(total, "MXN")}
              </span>
              <span className="text-[11px] font-medium text-zinc-500">Total comprado</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
