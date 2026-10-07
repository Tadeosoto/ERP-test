"use client";

import { useEffect, useState } from "react";

export type ConfirmDeleteModalProps = {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  busy?: boolean;
  /** Segundo paso: texto más fuerte y botón bloqueado unos segundos. */
  finalStep?: boolean;
  /** ms antes de habilitar el botón de confirmar (anti-clic por pánico). */
  confirmUnlockMs?: number;
  onConfirm: () => void;
  onCancel: () => void;
};

function TrashIcon({ className }: { className: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
      />
    </svg>
  );
}

export function ConfirmDeleteModal({
  open,
  title,
  message,
  confirmLabel = "Eliminar",
  cancelLabel = "Cancelar",
  busy = false,
  finalStep = false,
  confirmUnlockMs = 0,
  onConfirm,
  onCancel,
}: ConfirmDeleteModalProps) {
  const [unlockAt, setUnlockAt] = useState(0);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && !busy) onCancel();
      // Evita confirmar con Enter por accidente en el segundo paso.
      if (finalStep && (e.key === "Enter" || e.key === " ")) {
        e.preventDefault();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prev;
    };
  }, [open, busy, onCancel, finalStep]);

  useEffect(() => {
    if (!open || confirmUnlockMs <= 0) {
      setUnlockAt(0);
      return;
    }
    const at = Date.now() + confirmUnlockMs;
    setUnlockAt(at);
    setNow(Date.now());
    const id = window.setInterval(() => setNow(Date.now()), 200);
    return () => window.clearInterval(id);
  }, [open, confirmUnlockMs, finalStep, title, message]);

  if (!open) return null;

  const locked = unlockAt > 0 && now < unlockAt;
  const secondsLeft = locked ? Math.ceil((unlockAt - now) / 1000) : 0;
  const confirmDisabled = busy || locked;

  return (
    <div
      className="fixed inset-0 z-[250] flex items-end justify-center sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-delete-title"
      aria-describedby="confirm-delete-message"
    >
      <button
        type="button"
        className="absolute inset-0 bg-zinc-900/45 backdrop-blur-[2px]"
        onClick={() => {
          if (!busy) onCancel();
        }}
        aria-label="Cerrar"
        disabled={busy}
      />
      <div
        className={`safe-bottom relative w-full overflow-hidden rounded-t-3xl border bg-white shadow-2xl sm:max-w-md sm:rounded-3xl ${
          finalStep ? "border-red-200" : "border-orange-100"
        }`}
      >
        <div className="px-6 pb-6 pt-8 text-center sm:px-8 sm:pb-8">
          <div
            className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full sm:h-[4.5rem] sm:w-[4.5rem] ${
              finalStep ? "bg-red-200" : "bg-red-100"
            }`}
          >
            <TrashIcon className="h-8 w-8 text-red-600 sm:h-9 sm:w-9" />
          </div>
          <h2 id="confirm-delete-title" className="mt-4 text-lg font-bold text-zinc-900 sm:mt-5 sm:text-xl">
            {title}
          </h2>
          <p
            id="confirm-delete-message"
            className="mt-2 whitespace-pre-line text-sm leading-relaxed text-zinc-600 sm:mt-3 sm:text-base"
          >
            {message}
          </p>
          {finalStep ? (
            <p className="mt-3 text-sm font-semibold text-red-700">Esta eliminación es permanente.</p>
          ) : (
            <p className="mt-3 text-xs font-medium text-red-700/90">Esta acción no se puede deshacer.</p>
          )}
        </div>
        <div className="flex flex-col-reverse gap-2 border-t border-zinc-100 bg-zinc-50/80 px-4 py-4 sm:flex-row sm:justify-end sm:px-6">
          <button type="button" disabled={busy} className="btn-secondary w-full sm:w-auto" onClick={onCancel}>
            {cancelLabel}
          </button>
          <button
            type="button"
            disabled={confirmDisabled}
            className="btn-danger w-full sm:w-auto"
            onClick={onConfirm}
          >
            {busy ? "Eliminando…" : locked ? `Espera ${secondsLeft}s…` : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
