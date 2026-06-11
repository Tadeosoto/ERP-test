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
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
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
      <div className="relative w-full max-w-md rounded-3xl border border-orange-100 bg-white p-8 text-center shadow-2xl">
        <div
          className={`mx-auto flex h-20 w-20 items-center justify-center rounded-full ${
            isSuccess ? "bg-emerald-100" : "bg-red-100"
          }`}
        >
          {isSuccess ? (
            <SuccessIcon className="h-10 w-10 text-emerald-600" />
          ) : (
            <ErrorIcon className="h-10 w-10 text-red-600" />
          )}
        </div>
        <h2 id="feedback-modal-title" className="mt-5 text-xl font-bold text-zinc-900">
          {isSuccess ? "¡Tarea completada!" : "No se pudo completar"}
        </h2>
        <p id="feedback-modal-message" className="mt-3 text-base leading-relaxed text-zinc-600">
          {message}
        </p>
        <button type="button" onClick={onClose} className="btn-primary mt-6 w-full">
          Entendido
        </button>
      </div>
    </div>
  );
}
