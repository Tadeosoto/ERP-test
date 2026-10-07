"use client";

import {
  materialsBudgetDonutSegments,
  type MaterialsBudgetStats,
} from "@/lib/obras/materials-budget";
import { formatMoney } from "@/lib/format";

const SIZE = 200;
const STROKE = 26;
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
      className={`inline-flex h-14 w-14 flex-col items-center justify-center rounded-full border bg-white text-center shadow-sm ${ring}`}
    >
      <span className="text-xs font-bold tabular-nums">
        {pct.toLocaleString("es-MX", { maximumFractionDigits: 1 })}%
      </span>
      <span className="text-[9px] font-medium leading-tight">{label}</span>
    </div>
  );
}

function Metric({
  label,
  value,
  valueClass,
}: {
  label: string;
  value: string;
  valueClass: string;
}) {
  return (
    <div className="min-w-0 rounded-lg border border-zinc-100 bg-zinc-50/80 px-2.5 py-1.5">
      <dt className="text-[11px] font-medium text-zinc-500">{label}</dt>
      <dd className={`mt-0.5 break-words text-sm font-bold leading-snug tabular-nums ${valueClass}`}>
        {value}
      </dd>
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
    <section className="@container card flex h-full flex-col overflow-hidden p-4 sm:p-5">
      <div className="min-h-[4.5rem]">
        <h2 className="text-lg font-bold text-zinc-900">Límite de materiales</h2>
        <p className="mt-1 line-clamp-2 text-sm text-zinc-600">
          Tope acordado con el mandante por materiales. Superarlo genera pérdida; conviene monitorear
          los pagos y actuar si se acerca o rebasa este monto.
        </p>
      </div>

      <div className="mt-3 flex min-h-0 flex-1 flex-col gap-4 @[640px]:flex-row @[640px]:items-start @[640px]:justify-between">
        <div className="min-w-0 flex-1">
          <dl className="grid grid-cols-1 gap-1.5">
            <Metric
              label="Límite acordado"
              value={formatMoney(stats.budget, "MXN")}
              valueClass="text-zinc-900"
            />
            <Metric
              label="Pagado"
              value={formatMoney(stats.spent, "MXN")}
              valueClass="text-blue-700"
            />
            <Metric
              label={stats.isOver ? "Pérdida (excedente)" : "Margen restante"}
              value={
                stats.isOver
                  ? formatMoney(stats.overAmount, "MXN")
                  : formatMoney(stats.remaining, "MXN")
              }
              valueClass={stats.isOver ? "text-red-700" : "text-emerald-700"}
            />
          </dl>
          {stats.isOver ? (
            <p className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-800">
              {displayPct.toLocaleString("es-MX", { maximumFractionDigits: 1 })}% del límite — los pagos
              superan el tope. Excedente {formatMoney(stats.overAmount, "MXN")}.
            </p>
          ) : displayPct >= 90 ? (
            <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-900">
              {displayPct.toLocaleString("es-MX", { maximumFractionDigits: 1 })}% del límite — queda poco
              margen ({formatMoney(stats.remaining, "MXN")}).
            </p>
          ) : null}
        </div>

        <div className="flex shrink-0 flex-col items-center gap-2 self-center @[640px]:self-start">
          <div className="relative">
            <DonutChart stats={stats} />
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span
                className={`text-2xl font-bold tabular-nums ${stats.isOver ? "text-red-700" : "text-zinc-900"}`}
              >
                {displayPct.toLocaleString("es-MX", { maximumFractionDigits: 1 })}%
              </span>
              <span className="text-[11px] font-medium text-zinc-500">del límite</span>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2">
            {stats.spent > 0 && (
              <SegmentBadge
                pct={stats.isOver ? 100 : paidPct}
                label={stats.isOver ? "Límite" : "Pagado"}
                tone="blue"
              />
            )}
            {!stats.isOver && availablePct > 0.05 && (
              <SegmentBadge pct={availablePct} label="Margen" tone="gray" />
            )}
            {stats.isOver && overPct > 0 && (
              <SegmentBadge pct={overPct} label="Pérdida" tone="red" />
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
