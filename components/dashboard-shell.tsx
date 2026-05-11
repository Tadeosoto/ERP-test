"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "@/components/session-provider";
import { ROLE_LABEL } from "@/lib/domain/labels";

const nav = [
  { href: "/dashboard", label: "Panel", icon: "grid" },
  { href: "/flujo", label: "Mapa", icon: "flow" },
  { href: "/settings", label: "Ajustes", icon: "gear" },
] as const;

function Icon({ name }: { name: string }) {
  const cls = "h-5 w-5";
  if (name === "grid")
    return (
      <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
        <path strokeWidth={2} d="M4 5h6v6H4V5zm10 0h6v6h-6V5zM4 15h6v6H4v-6zm10 0h6v6h-6v-6z" />
      </svg>
    );
  if (name === "flow")
    return (
      <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
        <path
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M6 8h4M6 12h8M6 16h6M14 8l4 4-4 4"
        />
      </svg>
    );
  if (name === "gear")
    return (
      <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
        <path
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 15a3 3 0 100-6 3 3 0 000 6z"
        />
        <path
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"
        />
      </svg>
    );
  return null;
}

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { session, logout } = useSession();
  if (!session) return null;

  return (
    <div className="flex min-h-screen bg-orange-50/60">
      <aside className="fixed inset-y-0 left-0 z-40 flex w-[72px] flex-col bg-orange-700 py-6 text-white shadow-lg">
        <div className="mb-8 flex justify-center text-lg font-bold tracking-tight">CC</div>
        <nav className="flex flex-1 flex-col gap-1 px-2">
          {nav.map((item) => {
            const active =
              pathname === item.href ||
              (item.href === "/dashboard" && (pathname?.startsWith("/cases") ?? false));
            return (
              <Link
                key={item.label + item.href}
                href={item.href}
                title={item.label}
                className={`flex h-12 items-center justify-center rounded-2xl transition-colors ${
                  active ? "bg-white text-orange-700" : "text-orange-100 hover:bg-orange-600/80"
                }`}
              >
                <Icon name={item.icon} />
              </Link>
            );
          })}
        </nav>
      </aside>

      <div className="flex min-h-screen flex-1 flex-col pl-[72px]">
        <header className="sticky top-0 z-30 border-b border-orange-100 bg-white/95 px-6 py-4 backdrop-blur">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4">
            <nav className="flex flex-wrap items-center gap-2" aria-label="Secciones">
              <Link
                href="/dashboard"
                className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                  pathname === "/dashboard" || (pathname?.startsWith("/cases") ?? false)
                    ? "bg-orange-600 text-white shadow-sm"
                    : "bg-orange-50 text-orange-800/80 hover:bg-orange-100"
                }`}
              >
                Panel
              </Link>
              <Link
                href="/flujo"
                className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                  pathname?.startsWith("/flujo")
                    ? "bg-orange-600 text-white shadow-sm"
                    : "bg-orange-50 text-orange-800/80 hover:bg-orange-100"
                }`}
              >
                Mapa del proceso
              </Link>
              <span className="rounded-full bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-400">
                Reportes (pronto)
              </span>
            </nav>
            <div className="flex items-center gap-3">
              <span className="hidden text-sm text-zinc-600 sm:inline">
                {session.name}{" "}
                <span className="text-zinc-400">({ROLE_LABEL[session.role]})</span>
              </span>
              <button
                type="button"
                onClick={() => logout()}
                className="rounded-full border border-orange-200 bg-white px-4 py-2 text-sm font-medium text-orange-800 hover:bg-orange-50"
              >
                Salir
              </button>
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">{children}</main>

        <footer className="border-t border-orange-100 bg-white/80 py-3 text-center text-xs text-orange-900/50">
          Demo local · datos en navegador
        </footer>
      </div>
    </div>
  );
}
