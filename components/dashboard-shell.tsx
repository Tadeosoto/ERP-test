"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { NotificationHeaderMenu } from "@/components/dashboard/notification-header-menu";
import { CcpLogoIcon } from "@/components/ccp-logo";
import { useSession } from "@/components/session-provider";
import { ROLE_LABEL } from "@/lib/domain/labels";
import type { Role } from "@/lib/domain/types";
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

const consultaNav = [
  { href: "/pagos", label: "Pagos", icon: "pay" },
  { href: "/expedientes", label: "Expedientes", icon: "folder" },
] as const;

const ingenieroNav = [{ href: "/solicitudes/nueva", label: "Solicitudes", icon: "solicitudes" }] as const;

const pagosNav = [{ href: "/ordenes", label: "Órdenes de compra", icon: "orders" }] as const;

const recepcionConsultaNav = [{ href: "/expedientes", label: "Expedientes", icon: "folder" }] as const;

const direccionNav = [
  { href: "/inicio", label: "Inicio", icon: "home" },
  { href: "/obras", label: "Obras", icon: "grid" },
  { href: "/pagos", label: "Pagos", icon: "pay" },
  { href: "/expedientes", label: "Expedientes", icon: "folder" },
  { href: "/agregar-factura", label: "Agregar Factura", icon: "invoice" },
  { href: "/proveedores", label: "Proveedores", icon: "suppliers" },
  { href: "/reportes", label: "Reportes", icon: "reports" },
  { href: "/flujo", label: "Mapa del proceso", icon: "flow", shortLabel: "Mapa" },
] as const;

type NavItem =
  | (typeof primaryNav)[number]
  | (typeof secondaryNav)[number]
  | (typeof ingenieroNav)[number]
  | (typeof pagosNav)[number]
  | (typeof direccionNav)[number]
  | (typeof consultaNav)[number]
  | (typeof recepcionConsultaNav)[number];

function consultaNavForRole(role: Role) {
  if (role === "recepcion") return recepcionConsultaNav;
  return consultaNav;
}

function secondaryNavForRole(role: Role) {
  if (role === "recepcion") return [] as const;
  return secondaryNav;
}

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
  if (name === "solicitudes")
    return (
      <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.75}
          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
        />
      </svg>
    );
  if (name === "orders")
    return (
      <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.75}
          d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
        />
      </svg>
    );
  if (name === "pay")
    return (
      <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.75}
          d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8V6m0 12v-2m9-4a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    );
  if (name === "folder")
    return (
      <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.75}
          d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
        />
      </svg>
    );
  if (name === "invoice")
    return (
      <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.75}
          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
        />
      </svg>
    );
  if (name === "reports")
    return (
      <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.75}
          d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
        />
      </svg>
    );
  return null;
}

function navActive(pathname: string | null, href: string, searchParams: URLSearchParams): boolean {
  if (!pathname) return false;
  const estado = searchParams.get("estado");
  if (href === "/inicio") return pathname === "/inicio";
  if (href === "/expedientes") return pathname.startsWith("/expedientes");
  if (href === "/agregar-factura") return pathname.startsWith("/agregar-factura");
  if (href === "/pagos") return pathname.startsWith("/pagos");
  if (href === "/ordenes") return pathname === "/ordenes";
  if (href === "/obras?estado=pago") {
    return pathname.startsWith("/obras") && estado === "pago";
  }
  if (href === "/obras?estado=documentos") {
    return pathname.startsWith("/obras") && estado === "documentos";
  }
  if (href === "/obras") return pathname.startsWith("/obras") && !estado;
  if (href === "/proveedores") return pathname.startsWith("/proveedores");
  if (href === "/reportes") return pathname.startsWith("/reportes");
  if (href === "/solicitudes/nueva") return pathname.startsWith("/solicitudes");
  return pathname === href || pathname.startsWith(`${href}/`);
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
  const searchParams = useSearchParams();
  const { user, logout } = useSession();
  const isHome = pathname === "/inicio";
  const isWideLayout =
    isHome ||
    pathname === "/obras" ||
    pathname === "/ordenes" ||
    pathname === "/proveedores" ||
    pathname === "/reportes" ||
    pathname === "/pagos" ||
    pathname === "/expedientes" ||
    (pathname?.startsWith("/obras/") ?? false);
  const contentWidth = isWideLayout ? "max-w-none" : "max-w-7xl";
  const contentPad = isWideLayout
    ? "px-4 py-3 sm:px-5 sm:py-4 lg:px-6 lg:py-3 xl:px-8"
    : "px-3 py-5 sm:px-6 sm:py-8";
  if (!user) return null;

  const homeFixedViewport =
    isHome && !["pagos", "contabilidad", "recepcion", "direccion"].includes(user.role);
  const mainLayout = isHome
    ? homeFixedViewport
      ? "flex min-h-0 flex-1 flex-col overflow-y-auto lg:overflow-hidden"
      : "flex min-h-0 flex-1 flex-col overflow-y-auto"
    : isWideLayout
      ? "min-h-0 overflow-x-hidden"
      : "";

  const sidebarPrimaryNav =
    user.role === "direccion"
      ? direccionNav
      : user.role === "pagos"
        ? ([
            { href: "/inicio", label: "Inicio", icon: "home" },
            { href: "/obras", label: "Obras", icon: "grid" },
            ...pagosNav,
          ] as const)
        : primaryNav;

  const roleConsultaNav = consultaNavForRole(user.role);
  const roleSecondaryNav = secondaryNavForRole(user.role);

  const mobileNav =
    user.role === "direccion"
      ? [...direccionNav]
      : [...sidebarPrimaryNav, ...roleConsultaNav, ...roleSecondaryNav];

  async function handleRefresh() {
    await onRefresh?.();
  }

  const mobileNavItems = mobileNav;

  return (
    <div className="flex min-h-screen bg-white">
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
          {sidebarPrimaryNav.map((item) => (
            <SidebarNavLink key={item.href} item={item} active={navActive(pathname, item.href, searchParams)} />
          ))}

          {user.role === "ingeniero" &&
            ingenieroNav.map((item) => (
              <SidebarNavLink key={item.href} item={item} active={navActive(pathname, item.href, searchParams)} />
            ))}

          {user.role !== "direccion" && (
            <>
              <div className="my-2 border-t border-zinc-200" role="separator" />
              {roleConsultaNav.map((item) => (
                <SidebarNavLink key={item.href} item={item} active={navActive(pathname, item.href, searchParams)} />
              ))}
              {roleSecondaryNav.map((item) => (
                <SidebarNavLink key={item.href} item={item} active={navActive(pathname, item.href, searchParams)} />
              ))}
            </>
          )}
        </nav>

        <SidebarUserMenu name={user.name} role={ROLE_LABEL[user.role]} />
      </aside>

      <nav
        className="safe-bottom fixed inset-x-0 bottom-0 z-40 flex border-t border-zinc-200 bg-white/95 px-1 py-1 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] backdrop-blur lg:hidden"
        aria-label="Navegación principal"
      >
        {mobileNavItems.map((item) => (
          <div key={item.href} className="min-w-0 flex-1">
            <SidebarNavLink
              item={item}
              active={navActive(pathname, item.href, searchParams)}
              compact
            />
          </div>
        ))}
      </nav>

      <div
        className={`flex flex-1 flex-col ${SIDEBAR_PL} pb-[calc(4.75rem+env(safe-area-inset-bottom,0px))] lg:pb-0 ${
          homeFixedViewport ? "min-h-screen lg:h-dvh lg:max-h-dvh lg:overflow-hidden" : "min-h-screen"
        }`}
      >
        <header
          className={`sticky top-0 z-30 overflow-visible border-b border-zinc-200 bg-white/90 px-3 py-2.5 backdrop-blur sm:px-6 sm:py-3 ${TOP_BAR_H} lg:py-0`}
        >
          <div className={`mx-auto flex h-full w-full ${contentWidth} items-center justify-between gap-2 sm:gap-3`}>
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
          className={`mx-auto w-full ${contentWidth} flex-1 ${mainLayout} ${contentPad}`}
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
