"use client";

import {
  materialsBudgetDonutSegments,
  type MaterialsBudgetStats,
} from "@/lib/obras/materials-budget";
import { formatMoney } from "@/lib/format";

const SIZE = 220;
const STROKE = 28;
const R = (SIZE - STROKE) / 2;
const C = 2 * Math.PI * R;

function DonutChart({ stats }: { stats: MaterialsBudgetStats }) {
  const segments = materialsBudgetDonutSegments(stats);
  let offset = 0;

  return (
    <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} className="shrink-0" aria-hidden>
      <g transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}>
        {segments.map((seg) => {
          const length = (seg.pctOfCircle / 100) * C;
          const dash = `${length} ${C - length}`;
          const el = (
            <circle
              key={seg.key}
              cx={SIZE / 2}
              cy={SIZE / 2}
              r={R}
              fill="none"
              stroke={seg.color}
              strokeWidth={STROKE}
              strokeDasharray={dash}
              strokeDashoffset={-offset}
              strokeLinecap="round"
            />
          );
          offset += length;
          return el;
        })}
      </g>
    </svg>
  );
}

function SegmentBadge({
  pct,
  label,
  tone,
}: {
  pct: number;
  label: string;
  tone: "blue" | "gray" | "red";
}) {
  const ring =
    tone === "blue"
      ? "border-blue-200 text-blue-800"
      : tone === "red"
        ? "border-red-200 text-red-800"
        : "border-zinc-200 text-zinc-600";
  return (
    <div
      className={`inline-flex h-16 w-16 flex-col items-center justify-center rounded-full border bg-white text-center shadow-sm ${ring}`}
    >
      <span className="text-sm font-bold tabular-nums">{pct.toLocaleString("es-MX", { maximumFractionDigits: 1 })}%</span>
      <span className="text-[9px] font-medium leading-tight">{label}</span>
    </div>
  );
}

export function ObraMaterialsBudgetPanel({ stats }: { stats: MaterialsBudgetStats }) {
  if (!stats.hasBudget) return null;

  const displayPct = Math.round(stats.pct * 10) / 10;
  const paidPct = stats.budget > 0 ? Math.min(100, (stats.spent / stats.budget) * 100) : 0;
  const availablePct = stats.isOver ? 0 : Math.max(0, 100 - paidPct);
  const overPct = stats.isOver ? displayPct - 100 : 0;

  return (
    <section className="card overflow-hidden p-4 sm:p-6">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-bold text-zinc-900">Presupuesto de materiales</h2>
          <p className="mt-1 text-sm text-zinc-600">
            Referencia para no exceder el monto máximo de materiales al registrar pagos.
          </p>
          <dl className="mt-4 grid gap-3 sm:grid-cols-3">
            <div>
              <dt className="text-xs font-medium text-zinc-500">Monto máximo</dt>
              <dd className="text-lg font-bold tabular-nums text-zinc-900">{formatMoney(stats.budget, "MXN")}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-zinc-500">Pagado</dt>
              <dd className="text-lg font-bold tabular-nums text-blue-700">{formatMoney(stats.spent, "MXN")}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-zinc-500">
                {stats.isOver ? "Excedente" : "Disponible"}
              </dt>
              <dd
                className={`text-lg font-bold tabular-nums ${stats.isOver ? "text-red-700" : "text-emerald-700"}`}
              >
                {stats.isOver ? formatMoney(stats.overAmount, "MXN") : formatMoney(stats.remaining, "MXN")}
              </dd>
            </div>
          </dl>
          {stats.isOver ? (
            <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">
              {displayPct.toLocaleString("es-MX", { maximumFractionDigits: 1 })}% del monto máximo de materiales —
              los pagos superan el presupuesto de referencia.
            </p>
          ) : displayPct >= 90 ? (
            <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900">
              {displayPct.toLocaleString("es-MX", { maximumFractionDigits: 1 })}% utilizado — queda poco margen
              ({formatMoney(stats.remaining, "MXN")}).
            </p>
          ) : null}
        </div>

        <div className="flex flex-col items-center gap-4 sm:flex-row lg:flex-col xl:flex-row">
          <div className="relative">
            <DonutChart stats={stats} />
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span
                className={`text-3xl font-bold tabular-nums ${stats.isOver ? "text-red-700" : "text-zinc-900"}`}
              >
                {displayPct.toLocaleString("es-MX", { maximumFractionDigits: 1 })}%
              </span>
              <span className="text-[11px] font-medium text-zinc-500">del presupuesto</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3">
            {stats.spent > 0 && (
              <SegmentBadge
                pct={stats.isOver ? 100 : paidPct}
                label={stats.isOver ? "Presupuesto" : "Pagado"}
                tone="blue"
              />
            )}
            {!stats.isOver && availablePct > 0.05 && (
              <SegmentBadge pct={availablePct} label="Disponible" tone="gray" />
            )}
            {stats.isOver && overPct > 0 && (
              <SegmentBadge pct={overPct} label="Excedente" tone="red" />
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
