"use client";

export type HomeWorkTab = {
  id: string;
  label: string;
  count?: number;
};

/** Pestañas de trabajo para dashboards de inicio — una cola / un propósito. */
export function HomeWorkTabs({
  tabs,
  activeId,
  onChange,
}: {
  tabs: HomeWorkTab[];
  activeId: string;
  onChange: (id: string) => void;
}) {
  return (
    <div
      role="tablist"
      aria-label="Áreas de trabajo"
      className="flex gap-1 overflow-x-auto rounded-2xl border border-zinc-200/90 bg-zinc-50/80 p-1"
    >
      {tabs.map((tab) => {
        const active = tab.id === activeId;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(tab.id)}
            className={`inline-flex shrink-0 items-center gap-2 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition ${
              active
                ? "bg-white text-zinc-900 shadow-sm ring-1 ring-zinc-200/80"
                : "text-zinc-600 hover:bg-white/70 hover:text-zinc-900"
            }`}
          >
            {tab.label}
            {typeof tab.count === "number" ? (
              <span
                className={`min-w-[1.25rem] rounded-md px-1.5 py-0.5 text-center text-[11px] font-bold tabular-nums ${
                  active ? "bg-orange-50 text-orange-800" : "bg-zinc-200/80 text-zinc-600"
                }`}
              >
                {tab.count}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
