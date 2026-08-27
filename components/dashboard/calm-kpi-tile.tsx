"use client";

import Link from "next/link";

/** KPI: card blanca; color solo en borde de estado. */
export function CalmKpiTile({
  label,
  value,
  sub,
  href,
  tint = "zinc",
  selected,
  onClick,
}: {
  label: string;
  value: string | number;
  sub?: string;
  href?: string;
  tint?: "zinc" | "orange" | "amber" | "sky" | "emerald" | "violet" | "teal";
  selected?: boolean;
  onClick?: () => void;
}) {
  const accent: Record<NonNullable<typeof tint>, string> = {
    zinc: "border-l-zinc-300",
    orange: "border-l-orange-500",
    amber: "border-l-amber-500",
    sky: "border-l-sky-500",
    emerald: "border-l-emerald-500",
    violet: "border-l-violet-500",
    teal: "border-l-teal-500",
  };

  const className = `dash-panel flex h-full min-w-0 flex-col border-l-4 p-4 transition hover:shadow-md ${accent[tint]} ${
    selected ? "ring-2 ring-orange-400/50 shadow-sm" : ""
  }`;

  const body = (
    <>
      <p className="dash-label">{label}</p>
      <p className="dash-metric-sm mt-2">{value}</p>
      {sub ? <p className="dash-caption mt-2">{sub}</p> : null}
    </>
  );

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={`${className} text-left`}>
        {body}
      </button>
    );
  }

  if (href) {
    return (
      <Link href={href} className={className}>
        {body}
      </Link>
    );
  }

  return <div className={className}>{body}</div>;
}

export function HomePulseLine({ children }: { children: React.ReactNode }) {
  return <p className="dash-body max-w-3xl text-zinc-600">{children}</p>;
}

/**
 * Hero money. En es-MX el miles usa coma ($113,500.00);
 * solo se reduce el decimal final (.00), nunca las comas de miles.
 */
export function HomeHeroMetric({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  const m = value.match(/^(.*?)(\.\d{2})$/);
  const whole = m ? m[1] : value;
  const cents = m ? m[2] : "";

  return (
    <div className="dash-panel flex h-full min-w-0 flex-col justify-center p-5 sm:p-6">
      <p className="dash-label">{label}</p>
      <p className="dash-metric mt-2 tracking-tight">
        {whole}
        {cents ? (
          <span className="ml-0.5 text-[0.42em] font-semibold tabular-nums text-zinc-500">
            {cents}
          </span>
        ) : null}
      </p>
      {hint ? <p className="dash-caption mt-2">{hint}</p> : null}
    </div>
  );
}

export function HomeLauncherLink({
  href,
  label,
  onClick,
  disabled,
  primary,
}: {
  href?: string;
  label: string;
  onClick?: () => void;
  disabled?: boolean;
  primary?: boolean;
}) {
  const className = primary
    ? `btn-primary ${disabled ? "pointer-events-none opacity-45" : ""}`
    : `inline-flex min-h-11 items-center justify-center rounded-xl border border-zinc-200 bg-white px-4 text-sm font-semibold text-zinc-800 shadow-sm transition hover:border-zinc-300 hover:bg-zinc-50 ${
        disabled ? "pointer-events-none opacity-45" : ""
      }`;

  if (onClick) {
    return (
      <button type="button" onClick={onClick} disabled={disabled} className={className}>
        {label}
      </button>
    );
  }

  return (
    <Link href={href ?? "#"} className={className}>
      {label}
    </Link>
  );
}

export function DashPanelHeader({
  title,
  meta,
  action,
}: {
  title: string;
  meta?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-zinc-100 px-4 py-3.5 sm:px-5">
      <div className="min-w-0">
        <h2 className="dash-section-title">{title}</h2>
        {meta ? <p className="dash-caption mt-0.5">{meta}</p> : null}
      </div>
      {action}
    </div>
  );
}
