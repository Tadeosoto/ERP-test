"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CcpLogo, CcpLogoIcon } from "@/components/ccp-logo";
import { useSession } from "@/components/session-provider";
import { useNotifications } from "@/lib/hooks/use-notifications";
import { ROLE_LABEL } from "@/lib/domain/labels";
import { IconLogOut, IconRefresh } from "@/components/ui/action-icons";

const SIDEBAR_WIDTH = "w-44";
const SIDEBAR_PL = "pl-44";

const nav = [
  { href: "/obras", label: "Obras", icon: "grid" },
  { href: "/flujo", label: "Mapa", icon: "flow" },
  { href: "/notificaciones", label: "Avisos", icon: "bell" },
] as const;

function Icon({ name }: { name: string }) {
  const cls = "h-6 w-6";
  if (name === "grid")
    return (
      <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
        <path strokeWidth={2} d="M4 5h6v6H4V5zm10 0h6v6h-6V5zM4 15h6v6H4v-6zm10 0h6v6h-6v-6z" />
      </svg>
    );
  if (name === "flow")
    return (
      <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
        <path strokeWidth={2} strokeLinecap="round" d="M6 8h4M6 12h8M6 16h6M14 8l4 4-4 4" />
      </svg>
    );
  if (name === "bell")
    return (
      <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
        <path
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
        />
      </svg>
    );
  return null;
}

export function DashboardShell({
  children,
  onRefresh,
}: {
  children: React.ReactNode;
  onRefresh?: () => void | Promise<void>;
}) {
  const pathname = usePathname();
  const { user, logout } = useSession();
  const { unreadCount, refresh: refreshNotifications } = useNotifications();

  if (!user) return null;

  async function handleRefresh() {
    await refreshNotifications();
    await onRefresh?.();
  }

  return (
    <div className="flex min-h-screen bg-orange-50/60">
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex ${SIDEBAR_WIDTH} flex-col bg-orange-900 py-4 text-white shadow-lg`}
      >
        <Link
          href="/obras"
          title="Consorcio Constructor Profesional — inicio"
          className="mx-3 mb-5 block rounded-xl px-1 py-2 transition hover:bg-orange-800/60"
        >
          <CcpLogo size="sm" className="h-auto w-full" />
        </Link>
        <nav className="flex flex-1 flex-col gap-1.5 px-2">
          {nav.map((item) => {
            const active =
              pathname === item.href ||
              pathname?.startsWith(item.href + "/") ||
              (item.href === "/obras" && pathname?.startsWith("/ordenes"));
            return (
              <Link
                key={item.href}
                href={item.href}
                title={item.label}
                className={`relative flex flex-col items-center gap-1 rounded-2xl px-2 py-3 text-center text-xs font-medium transition-colors ${
                  active ? "bg-white text-orange-800" : "text-orange-100 hover:bg-orange-800"
                }`}
              >
                <Icon name={item.icon} />
                <span>{item.label}</span>
                {item.icon === "bell" && unreadCount > 0 && (
                  <span className="absolute right-1 top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-teal-500 px-1 text-[10px] font-bold text-white">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </aside>

      <div className={`flex min-h-screen flex-1 flex-col ${SIDEBAR_PL}`}>
        <header className="sticky top-0 z-30 border-b border-orange-100 bg-white/95 px-4 py-4 backdrop-blur sm:px-6">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <Link
                href="/obras"
                title="Consorcio Constructor Profesional"
                className="shrink-0 rounded-xl p-1 transition hover:bg-orange-50"
              >
                <CcpLogoIcon size="md" />
              </Link>
            <nav className="flex flex-wrap items-center gap-2" aria-label="Secciones">
              <Link
                href="/obras"
                className={`rounded-full px-5 py-2.5 text-base font-medium transition-colors ${
                  pathname?.startsWith("/obras") || pathname?.startsWith("/ordenes")
                    ? "bg-orange-600 text-white shadow-sm"
                    : "bg-orange-50 text-orange-800 hover:bg-orange-100"
                }`}
              >
                Obras
              </Link>
              <Link
                href="/flujo"
                className={`rounded-full px-5 py-2.5 text-base font-medium transition-colors ${
                  pathname?.startsWith("/flujo")
                    ? "bg-orange-600 text-white shadow-sm"
                    : "bg-orange-50 text-orange-800 hover:bg-orange-100"
                }`}
              >
                Mapa del proceso
              </Link>
            </nav>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => void handleRefresh()}
                className="btn-ghost min-h-11 text-sm"
              >
                <IconRefresh />
                Actualizar
              </button>
              <span className="hidden text-base text-zinc-600 sm:inline">
                {user.name}{" "}
                <span className="text-zinc-400">({ROLE_LABEL[user.role]})</span>
              </span>
              <button type="button" onClick={() => void logout()} className="btn-ghost min-h-11 text-sm">
                <IconLogOut />
                Salir
              </button>
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">{children}</main>

        <footer className="border-t border-orange-100 bg-white/80 px-4 py-4">
          <div className="mx-auto flex max-w-6xl flex-col items-center gap-2 sm:flex-row sm:justify-center sm:gap-3">
            <CcpLogoIcon size="sm" className="opacity-90" />
            <p className="text-center text-sm text-orange-900/50">
              CCP ERP · red local · datos en servidor de oficina
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
}
