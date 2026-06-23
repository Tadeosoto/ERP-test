"use client";

import { useEffect, useState } from "react";
import { getRoleQuickGuide } from "@/lib/dashboard/role-quick-guides";
import type { Role } from "@/lib/domain/types";
import { ROLE_LABEL } from "@/lib/domain/labels";

function RoleQuickGuideModal({
  role,
  open,
  onClose,
}: {
  role: Role;
  open: boolean;
  onClose: () => void;
}) {
  const guide = getRoleQuickGuide(role);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[120] flex items-end justify-center sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="role-guide-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-zinc-900/45 backdrop-blur-[2px]"
        onClick={onClose}
        aria-label="Cerrar guía"
      />
      <div className="safe-bottom relative flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-3xl border border-sky-100 bg-white shadow-2xl sm:max-w-lg sm:rounded-3xl">
        <div className="shrink-0 border-b border-sky-100 bg-gradient-to-r from-sky-50 to-white px-5 py-4 sm:px-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-sky-700">
                {ROLE_LABEL[role]}
              </p>
              <h2 id="role-guide-title" className="mt-1 text-lg font-bold text-zinc-900 sm:text-xl">
                {guide.title}
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-zinc-200 text-zinc-500 hover:bg-zinc-50"
              aria-label="Cerrar"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <p className="mt-2 text-sm leading-relaxed text-zinc-600">{guide.intro}</p>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 sm:px-6">
          <div className="space-y-5">
            {guide.sections.map((section) => (
              <section key={section.heading}>
                <h3 className="text-sm font-bold text-zinc-900">{section.heading}</h3>
                <ol className="mt-2 list-decimal space-y-2 pl-5 text-sm leading-relaxed text-zinc-700">
                  {section.steps.map((step) => (
                    <li key={step}>{step}</li>
                  ))}
                </ol>
              </section>
            ))}
          </div>
        </div>

        <div className="shrink-0 border-t border-zinc-100 px-5 py-4 sm:px-6">
          <button type="button" onClick={onClose} className="btn-primary w-full">
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
}

export function RoleQuickGuideBanner({ role, compact = false }: { role: Role; compact?: boolean }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div
        className={`flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-sky-100 bg-gradient-to-r from-sky-50/90 to-white shadow-sm ${
          compact ? "px-3 py-2" : "gap-3 px-4 py-3"
        }`}
      >
        <div className="flex min-w-0 items-center gap-2.5">
          <span
            className={`inline-flex shrink-0 items-center justify-center rounded-xl bg-sky-100 text-sky-700 ${
              compact ? "h-8 w-8" : "h-9 w-9"
            }`}
          >
            <svg className={compact ? "h-4 w-4" : "h-5 w-5"} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </span>
          <div className="min-w-0">
            <p className={`font-semibold text-zinc-900 ${compact ? "text-xs" : "text-sm"}`}>¿Cómo funciona?</p>
            {!compact && (
              <p className="mt-0.5 text-xs text-zinc-600 sm:text-sm">
                Consulta tus tareas y el paso a paso para {ROLE_LABEL[role].toLowerCase()}.
              </p>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={`inline-flex shrink-0 items-center justify-center rounded-xl border border-sky-200 bg-white font-semibold text-sky-800 shadow-sm transition hover:bg-sky-50 ${
            compact ? "h-8 px-3 text-xs" : "h-9 px-4 text-sm"
          }`}
        >
          Ver guía rápida
        </button>
      </div>
      <RoleQuickGuideModal role={role} open={open} onClose={() => setOpen(false)} />
    </>
  );
}
