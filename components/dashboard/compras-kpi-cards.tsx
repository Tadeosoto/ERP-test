"use client";

import { FloatingCallout } from "@/components/ui/callout-bubble";
import {
  COMPRAS_KPI_CONFIG,
  type ComprasKpiCounts,
  type ComprasOrderTab,
} from "@/lib/dashboard/compras-dashboard";

function KpiIcon({ kind }: { kind: (typeof COMPRAS_KPI_CONFIG)[number]["icon"] }) {
  const cls = "h-4 w-4 lg:h-5 lg:w-5";
  if (kind === "banknote") {
    return (
      <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8V6m0 12v-2m9-4a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    );
  }
  if (kind === "document") {
    return (
      <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
        />
      </svg>
    );
  }
  if (kind === "check") {
    return (
      <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
      </svg>
    );
  }
  if (kind === "alert") {
    return (
      <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
        />
      </svg>
    );
  }
  return (
    <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );
}

export type ComprasKpiHint = {
  title: string;
  message: string;
  actionLabel: string;
  href: string;
  onDismiss: () => void;
};

function KpiCardButton({
  cfg,
  selected,
  count,
  onSelect,
}: {
  cfg: (typeof COMPRAS_KPI_CONFIG)[number];
  selected: boolean;
  count: number;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`flex h-full w-full min-w-0 flex-col rounded-2xl border border-orange-100/80 border-l-4 p-3 text-left shadow-sm transition hover:shadow-md lg:p-3 xl:p-4 ${cfg.accent} ${selected ? "ring-2 ring-orange-300/60" : ""}`}
    >
      <div className="flex items-start justify-between gap-2">
        <span
          className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl lg:h-10 lg:w-10 ${cfg.iconBg}`}
        >
          <KpiIcon kind={cfg.icon} />
        </span>
        <span className="text-2xl font-bold tabular-nums text-zinc-900 xl:text-3xl">{count}</span>
      </div>
      <p className="mt-2 text-xs font-semibold leading-snug text-zinc-800 lg:text-sm">{cfg.label}</p>
      <p className="mt-0.5 line-clamp-2 text-[11px] text-zinc-500 lg:text-xs">{cfg.sublabel}</p>
      <span className={`mt-1.5 text-xs font-medium lg:text-sm ${cfg.linkClass}`}>Ver órdenes →</span>
    </button>
  );
}

export function ComprasKpiCards({
  counts,
  activeTab,
  onSelectTab,
  hint,
  layout = "standalone",
}: {
  counts: ComprasKpiCounts;
  activeTab: ComprasOrderTab;
  onSelectTab: (tab: ComprasOrderTab) => void;
  hint?: ComprasKpiHint | null;
  layout?: "standalone" | "embedded";
}) {
  const items = COMPRAS_KPI_CONFIG.map((cfg, index) => {
    const selected = activeTab === cfg.tab;
    const card = (
      <KpiCardButton
        cfg={cfg}
        selected={selected}
        count={counts[cfg.key]}
        onSelect={() => onSelectTab(cfg.tab)}
      />
    );

    if (index === 0 && hint) {
      return (
        <div key={cfg.key} className="relative min-h-0 min-w-0 overflow-visible">
          <FloatingCallout
            title={hint.title}
            message={hint.message}
            actionLabel={hint.actionLabel}
            href={hint.href}
            onDismiss={hint.onDismiss}
            placement="left"
            widthClass="w-[min(14rem,calc(100vw-3rem))]"
            className="max-md:hidden"
          />
          <FloatingCallout
            title={hint.title}
            message={hint.message}
            actionLabel={hint.actionLabel}
            href={hint.href}
            onDismiss={hint.onDismiss}
            placement="below"
            align="left"
            widthClass="w-full max-w-sm"
            className="md:hidden"
          />
          {card}
        </div>
      );
    }

    return (
      <div key={cfg.key} className="min-h-0 min-w-0">
        {card}
      </div>
    );
  });

  if (layout === "embedded") {
    return <>{items}</>;
  }

  return <div className="compras-dashboard-grid shrink-0">{items}</div>;
}
