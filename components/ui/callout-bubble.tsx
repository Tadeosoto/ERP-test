import Link from "next/link";

type CalloutBubbleProps = {
  title?: string;
  message: string;
  actionLabel?: string;
  href?: string;
  onDismiss?: () => void;
  tailAlign?: "left" | "center" | "right";
  /** Solo para anclaje flotante (ej. campana). Por defecto va en flujo normal. */
  floatClassName?: string;
  className?: string;
};

export function CalloutBubble({
  title,
  message,
  actionLabel,
  href,
  onDismiss,
  tailAlign = "right",
  floatClassName,
  className = "",
}: CalloutBubbleProps) {
  const tailClass =
    tailAlign === "left"
      ? "left-8"
      : tailAlign === "center"
        ? "left-1/2 -translate-x-1/2"
        : "right-8";

  const isFloating = Boolean(floatClassName);

  return (
    <div
      className={`relative w-full max-w-68 rounded-2xl border border-orange-200/90 bg-[#fff7ed] px-4 py-3 shadow-md shadow-orange-900/10 ${isFloating ? floatClassName : ""} ${className}`}
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

      {href && actionLabel && (
        <Link
          href={href}
          className="mt-3 inline-block text-sm font-semibold text-teal-700 transition hover:text-teal-800"
        >
          {actionLabel} →
        </Link>
      )}

      <span
        aria-hidden
        className={`absolute -bottom-1.5 h-3 w-3 rotate-45 border-b border-r border-orange-200/90 bg-[#fff7ed] ${tailClass}`}
      />
    </div>
  );
}
