"use client";

import Link from "next/link";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useSession } from "@/components/session-provider";
import { useFeedback } from "@/components/ui/feedback-provider";
import {
  canComprasEditOrder,
  canDeleteOrder,
  canRegisterPayment,
  canUploadInvoice,
  canUploadOcPdf,
  canUploadPaymentReceipt,
} from "@/lib/domain/transitions";
import { hasPaymentReceipt } from "@/lib/dashboard/pagos-dashboard";
import type { PurchaseOrderDto, Role } from "@/lib/domain/types";

type IconKind =
  | "folder"
  | "pay"
  | "invoice"
  | "upload"
  | "xml"
  | "receipt"
  | "log"
  | "edit"
  | "delete"
  | "ocPdf";

type MenuEntry =
  | { kind: "separator" }
  | {
      kind: "link";
      label: string;
      href: string;
      icon: IconKind;
      disabled?: boolean;
      danger?: boolean;
    }
  | {
      kind: "action";
      label: string;
      icon: IconKind;
      onClick: () => void;
      danger?: boolean;
      disabled?: boolean;
    };

function MenuIcon({ kind, danger }: { kind: IconKind; danger?: boolean }) {
  const cls = `h-4 w-4 shrink-0 ${danger ? "text-red-500" : "text-zinc-500"}`;
  switch (kind) {
    case "folder":
      return (
        <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
        </svg>
      );
    case "pay":
      return (
        <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8V6m0 12v-2m9-4a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    case "invoice":
    case "receipt":
      return (
        <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      );
    case "upload":
    case "ocPdf":
      return (
        <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
        </svg>
      );
    case "xml":
      return (
        <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
        </svg>
      );
    case "log":
      return (
        <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    case "edit":
      return (
        <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
      );
    case "delete":
      return (
        <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      );
  }
}

function buildMenuEntries(
  order: PurchaseOrderDto,
  role: Role | undefined,
  onDelete: () => void
): MenuEntry[] {
  const base = `/ordenes/${order.id}`;
  const hasXml = order.files.some((f) => f.originalFileName.toLowerCase().endsWith(".xml"));
  const hasOcPdf = order.files.some((f) => f.kind === "oc_pdf");
  const entries: MenuEntry[] = [];

  if (role === "compras") {
    const canEdit = canComprasEditOrder(order.status, role);
    const canDel = canDeleteOrder(order.status, role, order.amountPaidSoFar);
    const canUpload = canUploadOcPdf(order.status, role);

    entries.push({
      kind: "link",
      label: "Editar OC",
      href: `/ordenes/nueva?orderId=${order.id}`,
      icon: "edit",
      disabled: !canEdit,
    });
    entries.push({
      kind: "link",
      label: hasOcPdf ? "Reemplazar PDF de OC" : "Subir PDF de OC",
      href: `${base}#tarea`,
      icon: "ocPdf",
      disabled: !canUpload,
    });
    entries.push({
      kind: "action",
      label: "Eliminar OC",
      icon: "delete",
      onClick: onDelete,
      danger: true,
      disabled: !canDel,
    });
    entries.push({ kind: "separator" });
  }

  if (role === "pagos") {
    const canPay = canRegisterPayment(order.status, role);
    const canReceipt = canUploadPaymentReceipt(order.status, role) && !hasPaymentReceipt(order);

    entries.push({
      kind: "link",
      label: "Registrar pago",
      href: `${base}#pagos`,
      icon: "pay",
      disabled: !canPay,
    });
    entries.push({
      kind: "link",
      label: hasPaymentReceipt(order) ? "Ver comprobante" : "Subir comprobante",
      href: `${base}#tarea`,
      icon: "receipt",
      disabled: !canReceipt && !hasPaymentReceipt(order),
    });
    entries.push({ kind: "separator" });
  }

  entries.push(
    { kind: "link", label: "Ver expediente", href: base, icon: "folder" },
    { kind: "link", label: "Consultar pagos", href: `${base}#pagos`, icon: "pay" },
    { kind: "link", label: "Consultar facturas", href: `${base}#facturas`, icon: "invoice" }
  );

  if (role && canUploadInvoice(order.status, role)) {
    entries.push({
      kind: "link",
      label: "Subir factura",
      href: `${base}#tarea`,
      icon: "upload",
    });
  }

  entries.push(
    {
      kind: "link",
      label: "Ver XML",
      href: hasXml ? `${base}#facturas` : base,
      icon: "xml",
      disabled: !hasXml,
    },
    { kind: "link", label: "Ver comprobantes", href: `${base}#documentos`, icon: "receipt" },
    { kind: "link", label: "Ver bitácora", href: `${base}#comentarios`, icon: "log" }
  );

  return entries;
}

type MenuPosition = { top: number; left: number; openUp: boolean };

function computeMenuPosition(trigger: HTMLElement, menuHeight: number): MenuPosition {
  const rect = trigger.getBoundingClientRect();
  const gap = 4;
  const menuWidth = 220;
  const spaceBelow = window.innerHeight - rect.bottom - gap;
  const spaceAbove = rect.top - gap;
  const openUp = spaceBelow < menuHeight && spaceAbove > spaceBelow;

  let top = openUp ? rect.top - menuHeight - gap : rect.bottom + gap;
  top = Math.max(8, Math.min(top, window.innerHeight - menuHeight - 8));

  let left = rect.right - menuWidth;
  left = Math.max(8, Math.min(left, window.innerWidth - menuWidth - 8));

  return { top, left, openUp };
}

function countMenuRows(entries: MenuEntry[]): number {
  return entries.reduce((n, e) => (e.kind === "separator" ? n + 1 : n + 1), 0);
}

export function OrderActionMenu({
  order,
  onOrderMutated,
  primaryLabel = "Expediente",
  primaryHref,
  appearance = "default",
  showDropdown = true,
}: {
  order: PurchaseOrderDto;
  onOrderMutated?: () => void;
  primaryLabel?: string;
  primaryHref?: string;
  appearance?: "default" | "neutral";
  showDropdown?: boolean;
}) {
  const { user } = useSession();
  const { showSuccess, showError } = useFeedback();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [position, setPosition] = useState<MenuPosition | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const base = `/ordenes/${order.id}`;
  const primaryLink = primaryHref ?? base;

  const deleteOrder = useCallback(async () => {
    if (!window.confirm("¿Eliminar esta orden de compra? Esta acción no se puede deshacer.")) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/orders/${order.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "No se pudo eliminar la orden.");
      setOpen(false);
      showSuccess("Orden eliminada.");
      onOrderMutated?.();
    } catch (err) {
      showError(err instanceof Error ? err.message : "No se pudo eliminar la orden.");
    } finally {
      setBusy(false);
    }
  }, [order.id, onOrderMutated, showError, showSuccess]);

  const entries = useMemo(
    () => buildMenuEntries(order, user?.role, () => void deleteOrder()),
    [order, user?.role, deleteOrder]
  );

  const rowCount = countMenuRows(entries);

  const updatePosition = useCallback(() => {
    const trigger = triggerRef.current;
    const menu = menuRef.current;
    if (!trigger) return;
    const height = menu?.offsetHeight ?? rowCount * 36 + 8;
    setPosition(computeMenuPosition(trigger, height));
  }, [rowCount]);

  useEffect(() => setMounted(true), []);

  useLayoutEffect(() => {
    if (!open || !triggerRef.current) return;

    const measure = () => {
      const trigger = triggerRef.current;
      if (!trigger) return;
      const height = menuRef.current?.offsetHeight ?? rowCount * 40;
      setPosition(computeMenuPosition(trigger, height));
    };

    measure();
    requestAnimationFrame(measure);
  }, [open, rowCount]);

  useEffect(() => {
    if (!open) setPosition(null);
  }, [open]);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(e: MouseEvent) {
      const target = e.target as Node;
      if (rootRef.current?.contains(target)) return;
      if (menuRef.current?.contains(target)) return;
      setOpen(false);
    }

    function onReposition() {
      updatePosition();
    }

    document.addEventListener("mousedown", onPointerDown);
    window.addEventListener("resize", onReposition);
    window.addEventListener("scroll", onReposition, true);

    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      window.removeEventListener("resize", onReposition);
      window.removeEventListener("scroll", onReposition, true);
    };
  }, [open, updatePosition]);

  const menu =
    open && mounted
      ? createPortal(
          <div
            ref={menuRef}
            role="menu"
            style={{
              top: position?.top ?? -9999,
              left: position?.left ?? 0,
              visibility: position ? "visible" : "hidden",
            }}
            className="fixed z-[200] min-w-[13.5rem] overflow-hidden rounded-xl border border-zinc-200 bg-white py-1 shadow-xl ring-1 ring-black/5"
          >
            {entries.map((entry, i) => {
              if (entry.kind === "separator") {
                return <div key={`sep-${i}`} className="my-1 border-t border-zinc-100" role="separator" />;
              }

              if (entry.kind === "action") {
                return (
                  <button
                    key={entry.label}
                    type="button"
                    role="menuitem"
                    disabled={busy || entry.disabled}
                    title={entry.disabled ? "No disponible en este estado de la OC" : undefined}
                    className={`flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm disabled:cursor-not-allowed disabled:opacity-40 ${
                      entry.danger ? "text-red-700 hover:bg-red-50" : "text-zinc-700 hover:bg-orange-50"
                    }`}
                    onClick={() => {
                      if (!entry.disabled) entry.onClick();
                    }}
                  >
                    <MenuIcon kind={entry.icon} danger={entry.danger} />
                    {entry.label}
                  </button>
                );
              }

              if (entry.disabled) {
                return (
                  <span
                    key={entry.label}
                    role="menuitem"
                    title="No disponible en este estado de la OC"
                    className="flex cursor-not-allowed items-center gap-2.5 px-3 py-2 text-sm text-zinc-300"
                  >
                    <MenuIcon kind={entry.icon} />
                    {entry.label}
                  </span>
                );
              }

              return (
                <Link
                  key={entry.label}
                  href={entry.href}
                  role="menuitem"
                  className={`flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-orange-50 ${
                    entry.danger ? "text-red-700" : "text-zinc-700"
                  }`}
                  onClick={() => setOpen(false)}
                >
                  <MenuIcon kind={entry.icon} danger={entry.danger} />
                  {entry.label}
                </Link>
              );
            })}
          </div>,
          document.body
        )
      : null;

  const primaryClass =
    appearance === "neutral"
      ? `inline-flex h-9 items-center border border-zinc-300 bg-white px-3 text-xs font-semibold text-zinc-900 shadow-sm transition hover:bg-zinc-50 ${
          showDropdown ? "rounded-l-lg rounded-r-none border-r-0" : "rounded-lg"
        }`
      : "inline-flex h-8 items-center rounded-lg border border-teal-200 bg-white px-2.5 text-xs font-semibold text-teal-800 shadow-sm transition hover:bg-teal-50";

  const dropdownClass =
    appearance === "neutral"
      ? "inline-flex h-9 w-8 shrink-0 items-center justify-center rounded-r-lg rounded-l-none border border-zinc-300 bg-white text-zinc-600 shadow-sm hover:bg-zinc-50"
      : "inline-flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-600 shadow-sm hover:bg-zinc-50";

  return (
    <div ref={rootRef} className="relative inline-flex items-center justify-end">
      <Link
        href={primaryLink}
        className={primaryClass}
        onClick={(e) => e.stopPropagation()}
      >
        {primaryLabel}
      </Link>
      {showDropdown && (
        <button
          ref={triggerRef}
          type="button"
          aria-expanded={open}
          aria-haspopup="menu"
          aria-label="Más acciones"
          className={dropdownClass}
          onClick={(e) => {
            e.stopPropagation();
            setOpen((v) => !v);
          }}
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      )}
      {menu}
    </div>
  );
}
