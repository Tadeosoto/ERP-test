"use client";

import type { MonthlySpendPoint, ObraSpendSlice } from "@/lib/dashboard/direccion-dashboard";
import type { MonthlyYoYPoint } from "@/lib/dashboard/direccion-reportes";
import { DONUT_COLORS } from "@/lib/dashboard/direccion-dashboard";
import { formatMoney } from "@/lib/format";

export function DireccionLineChart({
  data,
  currency = "MXN",
}: {
  data: MonthlySpendPoint[];
  currency?: string;
}) {
  const width = 480;
  const height = 160;
  const pad = { t: 12, r: 12, b: 28, l: 8 };
  const innerW = width - pad.l - pad.r;
  const innerH = height - pad.t - pad.b;
  const max = Math.max(...data.map((d) => d.total), 1);

  const points = data.map((d, i) => {
    const x = pad.l + (data.length <= 1 ? innerW / 2 : (i / (data.length - 1)) * innerW);
    const y = pad.t + innerH - (d.total / max) * innerH;
    return { x, y, ...d };
  });

  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");
  const areaPath = `${linePath} L ${points[points.length - 1]?.x ?? pad.l} ${pad.t + innerH} L ${points[0]?.x ?? pad.l} ${pad.t + innerH} Z`;

  return (
    <div className="w-full">
      <svg viewBox={`0 0 ${width} ${height}`} className="h-40 w-full" aria-hidden>
        <defs>
          <linearGradient id="direccion-line-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#7c3aed" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#7c3aed" stopOpacity="0.02" />
          </linearGradient>
        </defs>
        {[0.25, 0.5, 0.75, 1].map((f) => (
          <line
            key={f}
            x1={pad.l}
            x2={width - pad.r}
            y1={pad.t + innerH * (1 - f)}
            y2={pad.t + innerH * (1 - f)}
            stroke="#e4e4e7"
            strokeWidth={1}
          />
        ))}
        <path d={areaPath} fill="url(#direccion-line-fill)" />
        <path d={linePath} fill="none" stroke="#7c3aed" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
        {points.map((p) => (
          <circle key={p.month} cx={p.x} cy={p.y} r={4} fill="#7c3aed" stroke="white" strokeWidth={2} />
        ))}
      </svg>
      <div className="mt-1 flex justify-between gap-1 text-[10px] text-zinc-500">
        {data.map((d) => (
          <span key={d.month} className="min-w-0 flex-1 truncate text-center capitalize">
            {d.label}
          </span>
        ))}
      </div>
      <p className="mt-2 text-center text-xs text-zinc-500">
        Máximo: {formatMoney(max, currency)}
      </p>
    </div>
  );
}

export function ReportesYoYLineChart({
  data,
  currency = "MXN",
}: {
  data: MonthlyYoYPoint[];
  currency?: string;
}) {
  const width = 480;
  const height = 180;
  const pad = { t: 16, r: 12, b: 28, l: 8 };
  const innerW = width - pad.l - pad.r;
  const innerH = height - pad.t - pad.b;
  const max = Math.max(...data.flatMap((d) => [d.currentYear, d.previousYear]), 1);

  function seriesPoints(key: "currentYear" | "previousYear") {
    return data.map((d, i) => {
      const x = pad.l + (data.length <= 1 ? innerW / 2 : (i / (data.length - 1)) * innerW);
      const y = pad.t + innerH - (d[key] / max) * innerH;
      return { x, y };
    });
  }

  const currentPts = seriesPoints("currentYear");
  const prevPts = seriesPoints("previousYear");
  const toPath = (pts: { x: number; y: number }[]) =>
    pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");

  return (
    <div className="w-full">
      <div className="mb-2 flex flex-wrap items-center justify-end gap-4 text-[11px] text-zinc-600">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-0.5 w-4 rounded bg-violet-600" />
          Este año
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-0.5 w-4 rounded bg-zinc-400" />
          Año anterior
        </span>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} className="h-44 w-full" aria-hidden>
        {[0.25, 0.5, 0.75, 1].map((f) => (
          <line
            key={f}
            x1={pad.l}
            x2={width - pad.r}
            y1={pad.t + innerH * (1 - f)}
            y2={pad.t + innerH * (1 - f)}
            stroke="#e4e4e7"
            strokeWidth={1}
          />
        ))}
        <path d={toPath(prevPts)} fill="none" stroke="#a1a1aa" strokeWidth={2} strokeLinecap="round" />
        <path d={toPath(currentPts)} fill="none" stroke="#7c3aed" strokeWidth={2.5} strokeLinecap="round" />
        {currentPts.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={3.5} fill="#7c3aed" stroke="white" strokeWidth={1.5} />
        ))}
      </svg>
      <div className="mt-1 flex justify-between gap-1 text-[10px] text-zinc-500">
        {data.map((d) => (
          <span key={d.month} className="min-w-0 flex-1 truncate text-center capitalize">
            {d.label}
          </span>
        ))}
      </div>
      <p className="mt-2 text-center text-xs text-zinc-500">
        Máximo: {formatMoney(max, currency)}
      </p>
    </div>
  );
}

export function DireccionDonutChart({
  slices,
  centerLabel,
}: {
  slices: ObraSpendSlice[];
  centerLabel?: string;
}) {
  const total = slices.reduce((s, x) => s + x.total, 0);
  const r = 52;
  const cx = 64;
  const cy = 64;
  const circumference = 2 * Math.PI * r;

  let offset = 0;
  const segments =
    total <= 0
      ? [{ color: "#e4e4e7", dash: circumference, offset: 0 }]
      : slices.map((slice, i) => {
          const frac = slice.total / total;
          const dash = frac * circumference;
          const seg = { color: DONUT_COLORS[i % DONUT_COLORS.length], dash, offset };
          offset += dash;
          return seg;
        });

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
      <svg width={128} height={128} viewBox="0 0 128 128" className="shrink-0" aria-hidden>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#f4f4f5" strokeWidth={14} />
        {segments.map((seg, i) => (
          <circle
            key={i}
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            stroke={seg.color}
            strokeWidth={14}
            strokeDasharray={`${seg.dash} ${circumference - seg.dash}`}
            strokeDashoffset={-segments.slice(0, i).reduce((s, x) => s + x.dash, 0)}
            transform={`rotate(-90 ${cx} ${cy})`}
          />
        ))}
        <text x={cx} y={cy - 2} textAnchor="middle" className="fill-zinc-900 text-[10px] font-bold">
          {centerLabel ?? (total > 0 ? `${Math.round((slices[0]?.pct ?? 0))}%` : "—")}
        </text>
        {!centerLabel && (
          <text x={cx} y={cy + 10} textAnchor="middle" className="fill-zinc-500 text-[8px]">
            principal
          </text>
        )}
      </svg>
      <ul className="min-w-0 flex-1 space-y-1.5 text-xs">
        {slices.length === 0 ? (
          <li className="text-zinc-400">Sin gasto registrado este mes.</li>
        ) : (
          slices.slice(0, 5).map((s, i) => (
            <li key={s.obraId} className="flex items-center gap-2">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: DONUT_COLORS[i % DONUT_COLORS.length] }}
              />
              <span className="min-w-0 flex-1 truncate text-zinc-700">{s.name}</span>
              <span className="shrink-0 font-semibold tabular-nums text-zinc-900">{s.pct}%</span>
            </li>
          ))
        )}
        {slices.length > 5 && (
          <li className="text-zinc-400">+ {slices.length - 5} obras más</li>
        )}
      </ul>
    </div>
  );
}
