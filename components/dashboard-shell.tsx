"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { NotificationHeaderMenu } from "@/components/dashboard/notification-header-menu";
import { CcpLogoIcon } from "@/components/ccp-logo";
import { useSession } from "@/components/session-provider";
import { ROLE_LABEL } from "@/lib/domain/labels";
import { IconLogOut, IconRefresh } from "@/components/ui/action-icons";

const SIDEBAR_W = "w-[17.5rem]";
const SIDEBAR_PL = "lg:pl-[17.5rem]";
/** Altura compartida sidebar (marca) + header principal en desktop */
const TOP_BAR_H = "lg:h-[4.5rem]";

const primaryNav = [
  { href: "/inicio", label: "Inicio", icon: "home" },
  { href: "/obras", label: "Obras", icon: "grid" },
  { href: "/flujo", label: "Mapa del proceso", icon: "flow", shortLabel: "Mapa" },
] as const;

const secondaryNav = [{ href: "/proveedores", label: "Proveedores", icon: "suppliers" }] as const;

type NavItem = (typeof primaryNav)[number] | (typeof secondaryNav)[number];

function NavIcon({ name }: { name: string }) {
  const cls = "h-5 w-5 shrink-0";
  if (name === "home")
    return (
      <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.75}
          d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
        />
      </svg>
    );
  if (name === "grid")
    return (
      <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
        <path strokeWidth={1.75} d="M4 5h6v6H4V5zm10 0h6v6h-6V5zM4 15h6v6H4v-6zm10 0h6v6h-6v-6z" />
      </svg>
    );
  if (name === "flow")
    return (
      <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.75}
          d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l5.447 2.724A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
        />
      </svg>
    );
  if (name === "suppliers")
    return (
      <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.75}
          d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
        />
      </svg>
    );
  return null;
}

function navActive(pathname: string | null, href: string) {
  if (href === "/inicio") return pathname === "/inicio";
  if (href === "/obras")
    return pathname?.startsWith("/obras") || pathname?.startsWith("/ordenes");
  if (href === "/proveedores") return pathname?.startsWith("/proveedores");
  return pathname === href || pathname?.startsWith(`${href}/`);
}

function SidebarNavLink({
  item,
  active,
  compact,
}: {
  item: NavItem;
  active: boolean;
  compact?: boolean;
}) {
  const label = compact && "shortLabel" in item && item.shortLabel ? item.shortLabel : item.label;
  return (
    <Link
      href={item.href}
      title={item.label}
      className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors ${
        compact ? "flex-col gap-1 px-1 py-2 text-[10px]" : ""
      } ${
        active
          ? "bg-zinc-200/70 font-semibold text-zinc-900"
          : "font-medium text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
      }`}
    >
      <NavIcon name={item.icon} />
      <span className={compact ? "leading-tight" : "truncate"}>{label}</span>
    </Link>
  );
}

function SidebarUserMenu({ name, role }: { name: string; role: string }) {
  const { logout } = useSession();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const initial = (name.trim()[0] ?? "?").toUpperCase();

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  return (
    <div ref={ref} className="relative border-t border-zinc-200 px-3 py-4">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left transition hover:bg-zinc-100"
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-zinc-200 text-sm font-bold text-zinc-700">
          {initial}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-zinc-900">{name.split(" ")[0]}</span>
          <span className="block truncate text-xs text-zinc-500">{role}</span>
        </span>
        <svg
          className={`h-4 w-4 shrink-0 text-zinc-400 transition ${open ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div
          role="menu"
          className="absolute bottom-full left-3 right-3 mb-1 overflow-hidden rounded-xl border border-zinc-200 bg-white py-1 shadow-lg"
        >
          <button
            type="button"
            role="menuitem"
            onClick={() => void logout()}
            className="flex w-full items-center gap-2 px-4 py-2.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
          >
            <IconLogOut className="h-4 w-4" />
            Cerrar sesión
          </button>
        </div>
      )}
    </div>
  );
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

  const mobileNav = [...primaryNav, ...secondaryNav];

  return (
    <div className="flex min-h-screen bg-[#faf8f6]">
      <aside
        className={`fixed inset-y-0 left-0 z-40 hidden ${SIDEBAR_W} flex-col border-r border-zinc-200 bg-[#f4f4f5] lg:flex`}
      >
        <Link
          href="/inicio"
          title="Consorcio Constructor Profesional — inicio"
          className={`flex shrink-0 items-center gap-3 border-b border-zinc-200 px-4 py-4 transition hover:bg-zinc-100/60 ${TOP_BAR_H} lg:py-0`}
        >
          <CcpLogoIcon size="md" className="h-10 w-10 shrink-0" priority />
          <span className="text-[10px] font-bold uppercase leading-snug tracking-wide text-zinc-900">
            Consorcio
            <br />
            Constructor
            <br />
            Profesional
          </span>
        </Link>

        <nav className="flex flex-1 flex-col gap-1 px-3 py-4" aria-label="Navegación principal">
          {primaryNav.map((item) => (
            <SidebarNavLink key={item.href} item={item} active={navActive(pathname, item.href)} />
          ))}

          <div className="my-2 border-t border-zinc-200" role="separator" />

          {secondaryNav.map((item) => (
            <SidebarNavLink key={item.href} item={item} active={navActive(pathname, item.href)} />
          ))}
        </nav>

        <SidebarUserMenu name={user.name} role={ROLE_LABEL[user.role]} />
      </aside>

      <nav
        className="safe-bottom fixed inset-x-0 bottom-0 z-40 flex border-t border-zinc-200 bg-white/95 px-1 py-1 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] backdrop-blur lg:hidden"
        aria-label="Navegación principal"
      >
        {mobileNav.map((item) => (
          <div key={item.href} className="min-w-0 flex-1">
            <SidebarNavLink
              item={item}
              active={navActive(pathname, item.href)}
              compact
            />
          </div>
        ))}
      </nav>

      <div
        className={`flex min-h-screen flex-1 flex-col ${SIDEBAR_PL} pb-[calc(4.75rem+env(safe-area-inset-bottom,0px))] lg:pb-0`}
      >
        <header
          className={`sticky top-0 z-30 overflow-visible border-b border-zinc-200 bg-white/90 px-3 py-2.5 backdrop-blur sm:px-6 sm:py-3 ${TOP_BAR_H} lg:py-0`}
        >
          <div className="mx-auto flex h-full max-w-7xl items-center justify-between gap-2 sm:gap-3">
            <div className="flex min-w-0 items-center gap-2 sm:gap-3 lg:hidden">
              <Link href="/inicio" title="Inicio" className="shrink-0 rounded-xl p-1">
                <CcpLogoIcon size="sm" />
              </Link>
            </div>
            <div className="hidden min-w-0 flex-1 lg:block" aria-hidden />

            <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
              <button
                type="button"
                onClick={() => void handleRefresh()}
                className="inline-flex h-11 min-w-11 items-center justify-center gap-2 rounded-2xl border border-orange-100 bg-white px-3 text-sm font-medium text-zinc-600 hover:bg-orange-50 sm:min-w-0"
                aria-label="Actualizar"
              >
                <IconRefresh className="h-4 w-4" />
                <span className="hidden sm:inline">Actualizar</span>
              </button>
              <NotificationHeaderMenu />
              <span className="hidden max-w-[8rem] truncate text-sm text-zinc-600 xl:inline">
                {user.name}
                <span className="text-zinc-400"> · {ROLE_LABEL[user.role]}</span>
              </span>
              <button
                type="button"
                onClick={() => void logout()}
                className="inline-flex h-11 min-w-11 items-center justify-center gap-1.5 rounded-2xl border border-orange-100 bg-white px-3 text-sm font-medium text-zinc-600 hover:bg-orange-50 lg:hidden"
                aria-label="Salir"
              >
                <IconLogOut className="h-4 w-4" />
              </button>
            </div>
          </div>
        </header>

        <main
          className={`mx-auto w-full max-w-7xl flex-1 ${
            isHome
              ? "min-h-0 overflow-x-hidden px-3 py-3 sm:px-6 sm:py-4 lg:py-3"
              : "px-3 py-5 sm:px-6 sm:py-8"
          }`}
        >
          {children}
        </main>

        {!isHome && (
          <footer className="hidden border-t border-orange-100/80 bg-white/60 px-4 py-3 lg:block">
            <p className="text-center text-xs text-orange-900/40">CCP ERP · Control de compras</p>
          </footer>
        )}
      </div>
    </div>
  );
}
