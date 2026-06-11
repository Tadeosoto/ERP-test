import { STATUS_TONE_CLASS, SYSTEM_STATUS } from "@/lib/domain/system-status";
import type { OrderStatus } from "@/lib/domain/types";

function StatusIcon({ name, className }: { name: "clock" | "x" | "check" | "alert"; className: string }) {
  if (name === "clock") {
    return (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    );
  }
  if (name === "x") {
    return (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
      </svg>
    );
  }
  if (name === "alert") {
    return (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
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
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  );
}

function statusIconClass(size: "xs" | "sm" | "md"): string {
  if (size === "xs") return "h-3 w-3 shrink-0";
  if (size === "sm") return "h-3.5 w-3.5 shrink-0";
  return "h-4 w-4 shrink-0";
}

export function SystemStatusBadge({
  status,
  size = "md",
}: {
  status: OrderStatus;
  size?: "xs" | "sm" | "md";
}) {
  const cfg = SYSTEM_STATUS[status];
  const tone = STATUS_TONE_CLASS[cfg.tone];
  const pad =
    size === "xs"
      ? "px-1.5 py-0.5 text-[10px] leading-tight"
      : size === "sm"
        ? "px-2 py-0.5 text-xs leading-tight"
        : "px-3 py-1.5 text-sm";

  return (
    <span
      className={`inline-flex max-w-full items-center rounded-full border font-semibold whitespace-nowrap ${tone} ${pad} ${size === "md" ? "flex-col items-start gap-0.5" : "gap-1"}`}
    >
      <span className="inline-flex items-center gap-1">
        <StatusIcon name={cfg.icon} className={statusIconClass(size)} />
        <span>{cfg.label}</span>
      </span>
      {cfg.subtitle && size === "md" && (
        <span className="pl-6 text-[10px] font-normal opacity-80">{cfg.subtitle}</span>
      )}
    </span>
  );
}
