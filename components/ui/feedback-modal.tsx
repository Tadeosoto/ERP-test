"use client";

import { useEffect } from "react";

type FeedbackModalProps = {
  open: boolean;
  variant: "success" | "error";
  message: string;
  onClose: () => void;
};

function SuccessIcon({ className }: { className: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
    </svg>
  );
}

function ErrorIcon({ className }: { className: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

export function FeedbackModal({ open, variant, message, onClose }: FeedbackModalProps) {
  const isSuccess = variant === "success";

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
      className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="feedback-modal-title"
      aria-describedby="feedback-modal-message"
    >
      <button
        type="button"
        className="absolute inset-0 bg-zinc-900/45 backdrop-blur-[2px]"
        onClick={onClose}
        aria-label="Cerrar"
      />
      <div className="safe-bottom relative max-h-[90dvh] w-full overflow-y-auto rounded-t-3xl border border-orange-100 bg-white p-6 text-center shadow-2xl sm:max-w-md sm:rounded-3xl sm:p-8">
        <div
          className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full sm:h-20 sm:w-20 ${
            isSuccess ? "bg-emerald-100" : "bg-red-100"
          }`}
        >
          {isSuccess ? (
            <SuccessIcon className="h-9 w-9 text-emerald-600 sm:h-10 sm:w-10" />
          ) : (
            <ErrorIcon className="h-9 w-9 text-red-600 sm:h-10 sm:w-10" />
          )}
        </div>
        <h2 id="feedback-modal-title" className="mt-4 text-lg font-bold text-zinc-900 sm:mt-5 sm:text-xl">
          {isSuccess ? "¡Tarea completada!" : "No se pudo completar"}
        </h2>
        <p
          id="feedback-modal-message"
          className="mt-2 text-sm leading-relaxed text-zinc-600 sm:mt-3 sm:text-base"
        >
          {message}
        </p>
        <button type="button" onClick={onClose} className="btn-primary mt-5 w-full sm:mt-6">
          Entendido
        </button>
      </div>
    </div>
  );
}
