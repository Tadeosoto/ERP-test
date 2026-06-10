"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NotificationHeaderMenu } from "@/components/dashboard/notification-header-menu";
import { CcpLogo, CcpLogoIcon } from "@/components/ccp-logo";
import { useSession } from "@/components/session-provider";
import { ROLE_LABEL } from "@/lib/domain/labels";
import { IconLogOut, IconRefresh } from "@/components/ui/action-icons";

const SIDEBAR_WIDTH = "w-44";
const SIDEBAR_PL = "pl-44";

const nav = [
  { href: "/inicio", label: "Inicio", icon: "home" },
  { href: "/obras", label: "Obras", icon: "grid" },
  { href: "/flujo", label: "Mapa", icon: "flow" },
] as const;

function Icon({ name }: { name: string }) {
  const cls = "h-6 w-6";
  if (name === "home")
    return (
      <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
        />
      </svg>
    );
  if (name === "grid")
    return (
      <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
        <path strokeWidth={2} d="M4 5h6v6H4V5zm10 0h6v6h-6V5zM4 15h6v6H4v-6zm10 0h6v6h-6v-6z" />
      </svg>
    );
  if (name === "flow")
    return (
      <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 8h4M6 12h8M6 16h6M14 8l4 4-4 4" />
      </svg>
    );
  return null;
}

function navActive(pathname: string | null, href: string) {
  if (href === "/inicio") return pathname === "/inicio";
  if (href === "/obras")
    return pathname?.startsWith("/obras") || pathname?.startsWith("/ordenes");
  return pathname === href || pathname?.startsWith(`${href}/`);
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
  const isHome = pathname === "/inicio";

  if (!user) return null;

  async function handleRefresh() {
    await onRefresh?.();
  }

  const topLinks = [
    { href: "/inicio", label: "Inicio" },
    { href: "/obras", label: "Obras" },
    { href: "/flujo", label: "Mapa del proceso" },
  ] as const;

  return (
    <div className="flex min-h-screen bg-[#faf8f6]">
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex ${SIDEBAR_WIDTH} flex-col bg-orange-900 py-4 text-white shadow-lg`}
      >
        <Link
          href="/inicio"
          title="Consorcio Constructor Profesional — inicio"
          className="mx-3 mb-5 block rounded-xl px-1 py-2 transition hover:bg-orange-800/60"
        >
          <CcpLogo size="sm" className="h-auto w-full" />
        </Link>
        <nav className="flex flex-1 flex-col gap-1.5 px-2">
          {nav.map((item) => {
            const active = navActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                title={item.label}
                className={`flex flex-col items-center gap-1 rounded-2xl px-2 py-3 text-center text-xs font-medium transition-colors ${
                  active ? "bg-white text-orange-800" : "text-orange-100 hover:bg-orange-800"
                }`}
              >
                <Icon name={item.icon} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </aside>

      <div className={`flex min-h-screen flex-1 flex-col ${SIDEBAR_PL}`}>
        <header className="sticky top-0 z-30 border-b border-orange-100/80 bg-white/90 px-4 py-3 backdrop-blur sm:px-6">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <Link
                href="/inicio"
                title="Inicio"
                className="hidden shrink-0 rounded-xl p-1 sm:block"
              >
                <CcpLogoIcon size="sm" />
              </Link>
              <nav className="hidden flex-wrap items-center gap-1 md:flex" aria-label="Secciones">
                {topLinks.map((item) => {
                  const active = navActive(pathname, item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`rounded-xl px-3 py-2 text-sm font-medium transition-colors ${
                        active
                          ? "bg-orange-100 text-orange-900"
                          : "text-zinc-600 hover:bg-orange-50 hover:text-orange-800"
                      }`}
                    >
                      {item.label}
                    </Link>
                  );
                })}
              </nav>
            </div>

            <div className="flex shrink-0 items-end gap-2">
              <button
                type="button"
                onClick={() => void handleRefresh()}
                className="hidden h-11 items-center gap-2 rounded-2xl border border-orange-100 bg-white px-3 text-sm font-medium text-zinc-600 hover:bg-orange-50 sm:inline-flex"
              >
                <IconRefresh className="h-4 w-4" />
                Actualizar
              </button>
              <NotificationHeaderMenu />
              <span className="hidden max-w-[8rem] truncate text-sm text-zinc-600 lg:inline">
                {user.name}
                <span className="text-zinc-400"> · {ROLE_LABEL[user.role]}</span>
              </span>
              <button
                type="button"
                onClick={() => void logout()}
                className="inline-flex h-11 items-center gap-1.5 rounded-2xl border border-orange-100 bg-white px-3 text-sm font-medium text-zinc-600 hover:bg-orange-50"
              >
                <IconLogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Salir</span>
              </button>
            </div>
          </div>
        </header>

        <main
          className={`mx-auto w-full max-w-7xl flex-1 ${
            isHome ? "min-h-0 overflow-hidden px-4 py-3 sm:px-6" : "px-4 py-8 sm:px-6"
          }`}
        >
          {children}
        </main>

        {!isHome && (
          <footer className="border-t border-orange-100/80 bg-white/60 px-4 py-3">
            <p className="text-center text-xs text-orange-900/40">CCP ERP · Control de compras</p>
          </footer>
        )}
      </div>
    </div>
  );
}
