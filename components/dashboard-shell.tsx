"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type MouseEvent as ReactMouseEvent } from "react";
import { NotificationHeaderMenu } from "@/components/dashboard/notification-header-menu";
import { CcpLogoIcon } from "@/components/ccp-logo";
import { useSession } from "@/components/session-provider";
import { ROLE_LABEL } from "@/lib/domain/labels";
import type { Role } from "@/lib/domain/types";
import { IconLogOut, IconRefresh } from "@/components/ui/action-icons";
import { usePendingMaterialRequestsCount } from "@/lib/hooks/use-pending-material-requests-count";

const SIDEBAR_W = "w-[17.5rem]";
const SIDEBAR_PL = "lg:pl-[17.5rem]";
/** Altura compartida sidebar (marca) + header principal en desktop */
const TOP_BAR_H = "lg:h-[4.5rem]";

type NavItem = {
  href: string;
  label: string;
  icon: string;
  shortLabel?: string;
};

type NavSection = {
  id: string;
  label: string;
  items: NavItem[];
};

function navSectionsForRole(role: Role): NavSection[] {
  const inicio: NavItem = { href: "/inicio", label: "Inicio", icon: "home" };
  const obras: NavItem = { href: "/obras", label: "Obras", icon: "grid" };
  const pagos: NavItem = { href: "/pagos", label: "Pagos", icon: "pay" };
  const expedientes: NavItem = { href: "/expedientes", label: "Expedientes", icon: "folder" };
  const proveedores: NavItem = { href: "/proveedores", label: "Proveedores", icon: "suppliers" };
  const flujo: NavItem = { href: "/flujo", label: "Mapa del proceso", icon: "flow", shortLabel: "Mapa" };
  const movimientos: NavItem = {
    href: "/movimientos",
    label: "Movimientos",
    icon: "activity",
    shortLabel: "Movs",
  };
  const ordenes: NavItem = {
    href: "/ordenes",
    label: "Órdenes de compra",
    icon: "orders",
    shortLabel: "Órdenes",
  };
  const facturas: NavItem = { href: "/facturas", label: "Facturas", icon: "invoice" };
  const agregarFactura: NavItem = {
    href: "/agregar-factura",
    label: "Agregar Factura",
    icon: "invoice",
    shortLabel: "Factura",
  };
  const reportes: NavItem = { href: "/reportes", label: "Reportes", icon: "reports" };
  const solicitudes: NavItem = {
    href: "/solicitudes/nueva",
    label: "Solicitudes",
    icon: "solicitudes",
  };
  const solicitudesIngenieria: NavItem = {
    href: "/solicitudes-ingenieria",
    label: "Solicitudes Ingeniería",
    icon: "solicitudes",
    shortLabel: "Sol. Ing.",
  };

  if (role === "pagos") {
    return [
      {
        id: "trabajo",
        label: "Trabajo",
        items: [
          inicio,
          pagos,
          { href: "/compromisos", label: "Compromisos", icon: "calendar", shortLabel: "Comprom." },
          ordenes,
          solicitudesIngenieria,
          facturas,
        ],
      },
      { id: "docs", label: "Documentos", items: [expedientes] },
      { id: "catalogos", label: "Catálogos", items: [obras, proveedores] },
      { id: "consulta", label: "Consulta", items: [flujo, movimientos] },
    ];
  }

  if (role === "direccion") {
    return [
      {
        id: "trabajo",
        label: "Trabajo",
        items: [
          inicio,
          pagos,
          { href: "/compromisos", label: "Compromisos", icon: "calendar", shortLabel: "Comprom." },
          agregarFactura,
        ],
      },
      { id: "docs", label: "Documentos", items: [expedientes] },
      { id: "catalogos", label: "Catálogos", items: [obras, proveedores] },
      { id: "consulta", label: "Consulta", items: [reportes, flujo, movimientos] },
    ];
  }

  if (role === "ingeniero") {
    return [
      { id: "trabajo", label: "Trabajo", items: [inicio, solicitudes] },
      { id: "docs", label: "Documentos", items: [expedientes] },
      { id: "catalogos", label: "Catálogos", items: [obras] },
      { id: "consulta", label: "Consulta", items: [pagos, flujo, movimientos] },
    ];
  }

  if (role === "recepcion") {
    return [
      { id: "trabajo", label: "Trabajo", items: [inicio] },
      { id: "docs", label: "Documentos", items: [expedientes] },
      { id: "catalogos", label: "Catálogos", items: [obras] },
      { id: "consulta", label: "Consulta", items: [pagos, flujo, movimientos] },
    ];
  }

  if (role === "compras") {
    return [
      { id: "trabajo", label: "Trabajo", items: [inicio, ordenes, solicitudesIngenieria] },
      { id: "docs", label: "Documentos", items: [expedientes] },
      { id: "catalogos", label: "Catálogos", items: [obras, proveedores] },
      { id: "consulta", label: "Consulta", items: [pagos, flujo, movimientos] },
    ];
  }

  // contabilidad y demás
  return [
    { id: "trabajo", label: "Trabajo", items: [inicio] },
    { id: "docs", label: "Documentos", items: [expedientes] },
    { id: "catalogos", label: "Catálogos", items: [obras, proveedores] },
    { id: "consulta", label: "Consulta", items: [pagos, flujo, movimientos] },
  ];
}

/** Destinos críticos en mobile (máx. 4) + el resto en “Más”. */
function mobilePrimaryHrefs(role: Role): string[] {
  if (role === "pagos") return ["/inicio", "/pagos", "/compromisos", "/ordenes"];
  if (role === "direccion") return ["/inicio", "/pagos", "/compromisos", "/reportes"];
  if (role === "compras") return ["/inicio", "/ordenes", "/expedientes", "/obras"];
  if (role === "ingeniero") return ["/inicio", "/solicitudes/nueva", "/expedientes", "/obras"];
  return ["/inicio", "/pagos", "/expedientes", "/obras"];
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
  if (name === "activity")
    return (
      <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.75}
          d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
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
  if (name === "calendar")
    return (
      <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.75}
          d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
        />
      </svg>
    );
  if (name === "more")
    return (
      <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.75}
          d="M12 6v.01M12 12v.01M12 18v.01M12 7a1 1 0 110-2 1 1 0 010 2zm0 6a1 1 0 110-2 1 1 0 010 2zm0 6a1 1 0 110-2 1 1 0 010 2z"
        />
      </svg>
    );
  return null;
}

function navActive(
  pathname: string | null,
  href: string,
  searchParams: URLSearchParams,
  hash: string
): boolean {
  if (!pathname) return false;
  const estado = searchParams.get("estado");
  if (href === "/inicio") return pathname === "/inicio";
  if (href === "/expedientes") return pathname.startsWith("/expedientes");
  if (href === "/agregar-factura") return pathname.startsWith("/agregar-factura");
  if (href === "/facturas") return pathname.startsWith("/facturas") || pathname.startsWith("/compromisos-c");
  if (href === "/compromisos") return pathname === "/compromisos";
  if (href === "/pagos") return pathname.startsWith("/pagos");
  if (href === "/ordenes") return pathname === "/ordenes" || pathname.startsWith("/ordenes/");
  if (href === "/movimientos") return pathname.startsWith("/movimientos");
  if (href === "/obras?estado=pago") {
    return pathname.startsWith("/obras") && estado === "pago";
  }
  if (href === "/obras?estado=documentos") {
    return pathname.startsWith("/obras") && estado === "documentos";
  }
  if (href === "/obras") return pathname.startsWith("/obras") && !estado;
  if (href === "/proveedores") return pathname.startsWith("/proveedores");
  if (href === "/reportes") return pathname.startsWith("/reportes");
  if (href === "/solicitudes-ingenieria") return pathname.startsWith("/solicitudes-ingenieria");
  if (href === "/solicitudes/nueva") return pathname.startsWith("/solicitudes") && !pathname.startsWith("/solicitudes-ingenieria");
  return pathname === href || pathname.startsWith(`${href}/`);
}

function SidebarNavLink({
  item,
  active,
  compact,
  badgeCount,
  onNavigate,
}: {
  item: NavItem;
  active: boolean;
  compact?: boolean;
  badgeCount?: number;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const label = compact && item.shortLabel ? item.shortLabel : item.label;

  function handleClick(e: ReactMouseEvent<HTMLAnchorElement>) {
    onNavigate?.();
    const hashIdx = item.href.indexOf("#");
    if (hashIdx === -1) return;
    const path = item.href.slice(0, hashIdx);
    const frag = item.href.slice(hashIdx);
    const onSamePage =
      pathname === path || (path === "/pagos" && Boolean(pathname?.startsWith("/pagos")));
    if (!onSamePage) return;
    e.preventDefault();
    if (window.location.hash !== frag) {
      window.location.hash = frag;
    } else {
      document.getElementById(frag.slice(1))?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  return (
    <Link
      href={item.href}
      title={item.label}
      onClick={handleClick}
      className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors ${
        compact ? "flex-col gap-1 px-1 py-2 text-[10px]" : ""
      } ${
        active
          ? "bg-orange-50 font-semibold text-orange-900"
          : "font-medium text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
      }`}
    >
      <span className="relative shrink-0">
        <NavIcon name={item.icon} />
        {compact && badgeCount != null && badgeCount > 0 && (
          <span
            className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-teal-600 px-0.5 text-[9px] font-bold text-white ring-2 ring-white"
            aria-hidden
          >
            {badgeCount > 9 ? "9+" : badgeCount}
          </span>
        )}
      </span>
      <span className={`${compact ? "leading-tight" : "min-w-0 flex-1 truncate"}`}>{label}</span>
      {!compact && badgeCount != null && badgeCount > 0 && (
        <span
          className="ml-auto flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-teal-600 px-1 text-[10px] font-bold tabular-nums text-white"
          aria-label={`${badgeCount} solicitud${badgeCount === 1 ? "" : "es"} pendiente${badgeCount === 1 ? "" : "s"}`}
        >
          {badgeCount > 9 ? "9+" : badgeCount}
        </span>
      )}
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
  const { pendingCount, refreshPendingCount } = usePendingMaterialRequestsCount(user?.role);
  const [moreOpen, setMoreOpen] = useState(false);
  const [hash, setHash] = useState("");
  const isHome = pathname === "/inicio";

  useEffect(() => {
    setHash(typeof window !== "undefined" ? window.location.hash : "");
    function onHash() {
      setHash(window.location.hash);
    }
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, [pathname]);
  const isWideLayout =
    isHome ||
    pathname === "/obras" ||
    pathname === "/ordenes" ||
    pathname === "/proveedores" ||
    pathname === "/reportes" ||
    pathname === "/pagos" ||
    pathname === "/compromisos" ||
    pathname === "/facturas" ||
    pathname === "/expedientes" ||
    pathname === "/movimientos" ||
    pathname === "/solicitudes-ingenieria" ||
    (pathname?.startsWith("/obras/") ?? false) ||
    (pathname?.startsWith("/ordenes/") ?? false) ||
    (pathname?.startsWith("/expedientes/") ?? false);
  const contentWidth = isWideLayout ? "max-w-none" : "max-w-7xl";
  const contentPad = isWideLayout
    ? "px-4 py-4 sm:px-5 sm:py-5 lg:px-6 lg:py-5 xl:px-8"
    : "px-4 py-5 sm:px-6 sm:py-6";

  const sections = useMemo(
    () => (user ? navSectionsForRole(user.role) : []),
    [user]
  );
  const allItems = useMemo(() => sections.flatMap((s) => s.items), [sections]);
  const primaryHrefs = useMemo(
    () => (user ? mobilePrimaryHrefs(user.role) : []),
    [user]
  );
  const mobilePrimary = useMemo(
    () => allItems.filter((item) => primaryHrefs.includes(item.href)),
    [allItems, primaryHrefs]
  );
  const mobileMore = useMemo(
    () => allItems.filter((item) => !primaryHrefs.includes(item.href)),
    [allItems, primaryHrefs]
  );

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

  async function handleRefresh() {
    await onRefresh?.();
    await refreshPendingCount();
  }

  function navBadgeCount(href: string): number | undefined {
    if (href !== "/solicitudes-ingenieria" || pendingCount <= 0) return undefined;
    return pendingCount;
  }

  return (
    <div className="flex min-h-screen bg-zinc-100">
      <aside
        className={`fixed inset-y-0 left-0 z-40 hidden ${SIDEBAR_W} flex-col border-r border-zinc-200 bg-white lg:flex`}
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

        <nav className="flex flex-1 flex-col gap-4 overflow-y-auto px-3 py-4" aria-label="Navegación principal">
          {sections.map((section) => (
            <div key={section.id}>
              <p className="dash-label mb-1.5 px-3">{section.label}</p>
              <div className="flex flex-col gap-0.5">
                {section.items.map((item) => (
                  <SidebarNavLink
                    key={item.href}
                    item={item}
                    active={navActive(pathname, item.href, searchParams, hash)}
                    badgeCount={navBadgeCount(item.href)}
                  />
                ))}
              </div>
            </div>
          ))}
        </nav>

        <SidebarUserMenu name={user.name} role={ROLE_LABEL[user.role]} />
      </aside>

      <nav
        className="safe-bottom fixed inset-x-0 bottom-0 z-40 flex border-t border-zinc-200 bg-white/95 px-1 py-1 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] backdrop-blur lg:hidden"
        aria-label="Navegación principal"
      >
        {mobilePrimary.map((item) => (
          <div key={item.href} className="min-w-0 flex-1">
            <SidebarNavLink
              item={item}
              active={navActive(pathname, item.href, searchParams, hash)}
              compact
              badgeCount={navBadgeCount(item.href)}
            />
          </div>
        ))}
        {mobileMore.length > 0 && (
          <div className="min-w-0 flex-1">
            <button
              type="button"
              onClick={() => setMoreOpen(true)}
              className={`flex w-full flex-col items-center gap-1 rounded-xl px-1 py-2 text-[10px] transition-colors ${
                mobileMore.some((i) => navActive(pathname, i.href, searchParams, hash))
                  ? "bg-zinc-200/70 font-semibold text-zinc-900"
                  : "font-medium text-zinc-600"
              }`}
            >
              <NavIcon name="more" />
              <span>Más</span>
            </button>
          </div>
        )}
      </nav>

      {moreOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Más opciones">
          <button
            type="button"
            className="absolute inset-0 bg-zinc-900/40"
            aria-label="Cerrar"
            onClick={() => setMoreOpen(false)}
          />
          <div className="safe-bottom absolute inset-x-0 bottom-0 max-h-[70dvh] overflow-y-auto rounded-t-3xl border border-zinc-200 bg-white px-4 pb-6 pt-4 shadow-2xl">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-bold text-zinc-900">Más</p>
              <button
                type="button"
                className="rounded-xl px-3 py-1.5 text-sm font-medium text-zinc-600 hover:bg-zinc-50"
                onClick={() => setMoreOpen(false)}
              >
                Cerrar
              </button>
            </div>
            <div className="flex flex-col gap-1">
              {mobileMore.map((item) => (
                <SidebarNavLink
                  key={item.href}
                  item={item}
                  active={navActive(pathname, item.href, searchParams, hash)}
                  badgeCount={navBadgeCount(item.href)}
                  onNavigate={() => setMoreOpen(false)}
                />
              ))}
            </div>
          </div>
        </div>
      )}

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
                className="inline-flex h-11 min-w-11 items-center justify-center gap-2 rounded-2xl border border-zinc-200 bg-white px-3 text-sm font-medium text-zinc-600 hover:bg-zinc-50 sm:min-w-0"
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
                className="inline-flex h-11 min-w-11 items-center justify-center gap-1.5 rounded-2xl border border-zinc-200 bg-white px-3 text-sm font-medium text-zinc-600 hover:bg-zinc-50 lg:hidden"
                aria-label="Salir"
              >
                <IconLogOut className="h-4 w-4" />
              </button>
            </div>
          </div>
        </header>

        <main
          className={`mx-auto w-full ${contentWidth} flex-1 bg-zinc-100 ${mainLayout} ${contentPad}`}
        >
          {children}
        </main>

        {!isHome && (
          <footer className="hidden border-t border-zinc-200/80 bg-zinc-100 px-4 py-3 lg:block">
            <p className="dash-caption text-center">CCP ERP · Control de compras</p>
          </footer>
        )}
      </div>
    </div>
  );
}
