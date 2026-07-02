import Link from "next/link";
import { formatDateTime } from "@/lib/format";

type TailSide = "bottom" | "top" | "left" | "right";

type CalloutBubbleProps = {
  title?: string;
  message: string;
  /** ISO 8601 — se muestra fecha y hora debajo del mensaje */
  timestamp?: string;
  actionLabel?: string;
  href?: string;
  onDismiss?: () => void;
  tailAlign?: "left" | "center" | "right";
  tailSide?: TailSide;
  className?: string;
};

function tailClasses(side: TailSide, align: "left" | "center" | "right"): string {
  const base = "absolute h-3 w-3 rotate-45 border-orange-200/90 bg-[#fff7ed]";
  if (side === "bottom") {
    const x = align === "left" ? "left-8" : align === "center" ? "left-1/2 -translate-x-1/2" : "right-8";
    return `${base} -bottom-1.5 border-b border-r ${x}`;
  }
  if (side === "top") {
    const x = align === "left" ? "left-8" : align === "center" ? "left-1/2 -translate-x-1/2" : "right-8";
    return `${base} -top-1.5 border-l border-t ${x}`;
  }
  if (side === "right") {
    return `${base} -right-1.5 top-1/2 -translate-y-1/2 border-r border-t`;
  }
  return `${base} -left-1.5 top-1/2 -translate-y-1/2 border-b border-l`;
}

export function CalloutBubble({
  title,
  message,
  timestamp,
  actionLabel,
  href,
  onDismiss,
  tailAlign = "right",
  tailSide = "bottom",
  className = "",
}: CalloutBubbleProps) {
  return (
    <div
      className={`relative w-full rounded-2xl border border-orange-200/90 bg-[#fff7ed] px-4 py-3 shadow-lg shadow-orange-900/10 ${className}`}
      role="status"
    >
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-lg border border-orange-200 bg-white text-orange-700 transition hover:bg-orange-50 hover:text-orange-900"
          aria-label="Cerrar aviso"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}

      {title && (
        <p className={`text-sm font-semibold text-orange-900 ${onDismiss ? "pr-8" : ""}`}>{title}</p>
      )}
      <p className={`text-sm leading-snug text-zinc-600 ${title ? "mt-1" : onDismiss ? "pr-8" : ""}`}>
        {message}
      </p>

      {timestamp && (
        <time
          dateTime={timestamp}
          className={`mt-1.5 block text-[11px] tabular-nums text-zinc-400 ${onDismiss ? "pr-8" : ""}`}
        >
          {formatDateTime(timestamp)}
        </time>
      )}

      {href && actionLabel && (
        <Link
          href={href}
          className="mt-3 inline-block text-sm font-semibold text-teal-700 transition hover:text-teal-800"
        >
          {actionLabel} →
        </Link>
      )}

      <span aria-hidden className={tailClasses(tailSide, tailAlign)} />
    </div>
  );
}

type FloatingCalloutProps = CalloutBubbleProps & {
  align?: "left" | "right" | "center";
  placement?: "above" | "below" | "left" | "right";
  widthClass?: string;
  className?: string;
};

function placementClasses(placement: NonNullable<FloatingCalloutProps["placement"]>, align: "left" | "right" | "center"): string {
  if (placement === "above") {
    const h = align === "left" ? "left-0" : align === "center" ? "left-1/2 -translate-x-1/2" : "right-0";
    return `bottom-full mb-2 ${h}`;
  }
  if (placement === "below") {
    const h = align === "left" ? "left-0" : align === "center" ? "left-1/2 -translate-x-1/2" : "right-0";
    return `top-full mt-2 ${h}`;
  }
  if (placement === "left") {
    return "right-full top-1/2 mr-2 -translate-y-1/2";
  }
  return "left-full top-1/2 ml-2 -translate-y-1/2";
}

function tailForPlacement(
  placement: NonNullable<FloatingCalloutProps["placement"]>,
  align: "left" | "right" | "center"
): { tailSide: TailSide; tailAlign: "left" | "center" | "right" } {
  switch (placement) {
    case "above":
      return { tailSide: "bottom", tailAlign: align === "center" ? "center" : align };
    case "below":
      return { tailSide: "top", tailAlign: align === "center" ? "center" : align };
    case "left":
      return { tailSide: "right", tailAlign: "center" };
    case "right":
      return { tailSide: "left", tailAlign: "center" };
  }
}

/** Globo fuera del flujo del documento; el padre debe ser `relative`. */
export function FloatingCallout({
  align = "right",
  placement = "above",
  widthClass = "w-[min(17rem,calc(100vw-2rem))]",
  className = "",
  tailAlign,
  tailSide,
  ...bubble
}: FloatingCalloutProps) {
  const resolved = tailForPlacement(placement, align);
  const resolvedTailSide = tailSide ?? resolved.tailSide;
  const resolvedTailAlign = tailAlign ?? resolved.tailAlign;

  return (
    <div
      className={`pointer-events-none absolute z-[60] ${placementClasses(placement, align)} ${widthClass} ${className}`}
      aria-live="polite"
    >
      <div className="pointer-events-auto">
        <CalloutBubble
          {...bubble}
          tailSide={resolvedTailSide}
          tailAlign={resolvedTailAlign}
        />
      </div>
    </div>
  );
}
