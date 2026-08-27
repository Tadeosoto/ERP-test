"use client";

import { FloatingCallout } from "@/components/ui/callout-bubble";
import {
  COMPRAS_KPI_CONFIG,
  type ComprasKpiCounts,
  type ComprasOrderTab,
} from "@/lib/dashboard/compras-dashboard";

export type ComprasKpiHint = {
  title: string;
  message: string;
  actionLabel: string;
  href: string;
  onDismiss: () => void;
};

const ACCENT: Record<string, string> = {
  aprobar: "border-l-orange-500",
  pago: "border-l-amber-500",
  factura: "border-l-violet-500",
  diferencias: "border-l-red-500",
  completadas: "border-l-emerald-500",
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
      className={`dash-panel flex h-full w-full min-w-0 flex-col border-l-4 p-4 text-left transition hover:shadow-md ${
        ACCENT[cfg.key] ?? "border-l-zinc-300"
      } ${selected ? "ring-2 ring-orange-400/50 shadow-sm" : ""}`}
    >
      <p className="dash-label">{cfg.label}</p>
      <p className="dash-metric-sm mt-2">{count}</p>
      <p className="dash-caption mt-2 line-clamp-2">{cfg.sublabel}</p>
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
