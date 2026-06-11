import { LoadingLogo } from "@/components/ui/loading-logo";

type LoadingScreenProps = {
  message: string;
  /** Ocupa más alto del área de contenido (pantallas principales). */
  fullPage?: boolean;
  /** Pantalla completa del viewport (login, sesión). */
  viewport?: boolean;
  /** Texto claro sobre fondos oscuros o con gradiente. */
  tone?: "default" | "light";
  className?: string;
};

export function LoadingScreen({
  message,
  fullPage = true,
  viewport = false,
  tone = "default",
  className = "",
}: LoadingScreenProps) {
  const heightClass = viewport
    ? "min-h-screen"
    : fullPage
      ? "min-h-[55vh]"
      : "py-20";

  const light = tone === "light";

  return (
    <div
      className={`flex flex-col items-center justify-center gap-6 px-6 text-center ${heightClass} ${className}`}
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label={message}
    >
      <div className="origin-center scale-[0.88] sm:scale-100">
        <LoadingLogo size={96} />
      </div>
      <div className="max-w-sm px-2">
        <p
          className={`text-xl font-bold tracking-tight sm:text-2xl md:text-3xl ${
            light ? "text-white" : "text-orange-900"
          }`}
        >
          {message}
        </p>
        <p className={`mt-2 text-sm sm:text-base ${light ? "text-white/80" : "text-zinc-600"}`}>
          Un momento, por favor…
        </p>
      </div>
    </div>
  );
}
