import Link from "next/link";
import { FloatingCallout } from "@/components/ui/callout-bubble";
import {
  PANEL_HOVER_ROW,
  PANEL_SURFACE,
  type PanelSurfaceKey,
} from "@/lib/dashboard/panel-surfaces";

export type PanelHint = {
  title: string;
  message: string;
  href: string;
  actionLabel: string;
};

type PanelLinkProps = {
  href: string;
  title: string;
  description: string;
  accent?: string;
  meta?: string;
  hint?: PanelHint;
  onDismissHint?: () => void;
  surface?: PanelSurfaceKey;
};

export function PanelLink({
  href,
  title,
  description,
  accent,
  meta,
  hint,
  onDismissHint,
  surface = "obrasNav",
}: PanelLinkProps) {
  return (
    <div className="min-h-0">
      {hint && (
        <FloatingCallout
          title={hint.title}
          message={hint.message}
          actionLabel={hint.actionLabel}
          href={hint.href}
          onDismiss={onDismissHint}
          align="right"
          placement="above"
          widthClass="w-[min(16rem,calc(100vw-2rem))]"
        />
      )}
      <Link
        href={href}
        className={`group flex min-h-0 flex-1 flex-col rounded-2xl border p-4 shadow-sm transition hover:shadow-md ${PANEL_SURFACE[surface]} hover:border-orange-200/90 ${accent ?? ""}`}
      >
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-base font-semibold text-zinc-800">{title}</h3>
          {meta && (
            <span className="shrink-0 rounded-full bg-orange-100/80 px-2.5 py-0.5 text-xs font-semibold text-orange-800">
              {meta}
            </span>
          )}
        </div>
        <p className="mt-1.5 line-clamp-2 text-sm leading-snug text-zinc-500">{description}</p>
        <span className="mt-auto pt-3 text-sm font-medium text-orange-700 opacity-80 group-hover:opacity-100">
          Ver detalle →
        </span>
      </Link>
    </div>
  );
}

type StatChipProps = {
  href: string;
  label: string;
  count: number;
  accent: string;
};

export function StatChip({ href, label, count, accent }: StatChipProps) {
  return (
    <Link
      href={href}
      className={`flex min-w-0 flex-1 flex-col rounded-2xl border border-orange-100/80 border-l-4 px-3 py-3 transition hover:shadow-sm ${accent}`}
    >
      <span className="truncate text-xs font-medium uppercase tracking-wide text-zinc-500">{label}</span>
      <span className="mt-1 text-2xl font-bold tabular-nums text-zinc-900">{count}</span>
    </Link>
  );
}

type MiniListProps = {
  title: string;
  empty: string;
  href: string;
  linkLabel: string;
  items: { id: string; primary: string; secondary?: string; href: string }[];
  hint?: PanelHint;
  onDismissHint?: () => void;
  surface?: PanelSurfaceKey;
};

export function MiniListPanel({
  title,
  empty,
  href,
  linkLabel,
  items,
  hint,
  onDismissHint,
  surface = "bandeja",
}: MiniListProps) {
  const rowHover = PANEL_HOVER_ROW[surface] ?? "hover:border-orange-100 hover:bg-orange-50/40";

  return (
    <section
      className={`relative flex flex-col overflow-hidden rounded-2xl border p-4 shadow-sm ${PANEL_SURFACE[surface]}`}
    >
      {hint && (
        <FloatingCallout
          title={hint.title}
          message={hint.message}
          actionLabel={hint.actionLabel}
          href={hint.href}
          onDismiss={onDismissHint}
          align="left"
          placement="above"
          widthClass="w-[min(16rem,calc(100vw-2rem))]"
        />
      )}
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-base font-semibold text-zinc-800">{title}</h2>
        <Link href={href} className="text-sm font-medium text-orange-700 hover:underline">
          {linkLabel}
        </Link>
      </div>
      <ul className="min-h-0 flex-1 space-y-2 overflow-hidden">
        {items.length === 0 ? (
          <li className="py-6 text-center text-sm text-zinc-400">{empty}</li>
        ) : (
          items.map((item) => (
            <li key={item.id}>
              <Link
                href={item.href}
                className={`block rounded-xl border border-transparent px-3 py-2.5 transition ${rowHover}`}
              >
                <p className="truncate text-sm font-medium text-zinc-800">{item.primary}</p>
                {item.secondary && (
                  <p className="mt-0.5 truncate text-xs text-zinc-500">{item.secondary}</p>
                )}
              </Link>
            </li>
          ))
        )}
      </ul>
    </section>
  );
}
