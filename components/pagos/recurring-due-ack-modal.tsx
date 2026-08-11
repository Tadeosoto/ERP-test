"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useSession } from "@/components/session-provider";
import { useNotifications } from "@/lib/hooks/use-notifications";
import { formatDateTime } from "@/lib/format";
import { RECURRING_DUE_REMINDER_TYPE } from "@/lib/domain/recurring-commitments";

/**
 * Modal bloqueante para Administración: avisos de compromisos recurrentes
 * cercanos a vencer. Solo se cierra con «Enterado».
 */
export function RecurringDueAckModal() {
  const { user } = useSession();
  const { notifications, refresh } = useNotifications(20_000);
  const [busy, setBusy] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const pending = useMemo(
    () =>
      notifications.filter(
        (n) =>
          n.type === RECURRING_DUE_REMINDER_TYPE &&
          n.requiresAcknowledgement &&
          !n.acknowledged
      ),
    [notifications]
  );

  const acknowledge = useCallback(async () => {
    if (pending.length === 0) return;
    setBusy(true);
    try {
      await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          action: "acknowledge",
          ids: pending.map((n) => n.id),
        }),
      });
      await refresh();
    } finally {
      setBusy(false);
    }
  }, [pending, refresh]);

  if (!mounted || !user || user.role !== "pagos" || pending.length === 0) {
    return null;
  }

  return createPortal(
    <div className="fixed inset-0 z-[300] flex items-end justify-center sm:items-center sm:p-4">
      <div className="absolute inset-0 bg-zinc-900/55" aria-hidden />
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="recurring-ack-title"
        aria-describedby="recurring-ack-desc"
        className="relative flex max-h-[90dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl"
      >
        <div className="border-b border-amber-100 bg-amber-50/80 px-5 py-4 sm:px-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-800">
            Aviso obligatorio · Administración
          </p>
          <h2 id="recurring-ack-title" className="mt-1 text-lg font-bold text-zinc-900">
            Compromisos próximos a vencer
          </h2>
          <p id="recurring-ack-desc" className="mt-1 text-sm text-zinc-600">
            Debes confirmar que estás enterado. Este aviso se repite cada día desde 3 días antes de
            la fecha límite.
          </p>
        </div>

        <ul className="min-h-0 flex-1 space-y-2 overflow-y-auto px-5 py-4 sm:px-6">
          {pending.map((n) => (
            <li
              key={n.id}
              className="rounded-2xl border border-amber-100 bg-amber-50/40 px-4 py-3 text-sm text-zinc-800"
            >
              <p>{n.message}</p>
              <time dateTime={n.createdAt} className="mt-1 block text-[11px] text-zinc-500">
                {formatDateTime(n.createdAt)}
              </time>
            </li>
          ))}
        </ul>

        <div className="border-t border-zinc-100 px-5 py-4 sm:px-6">
          <button
            type="button"
            disabled={busy}
            onClick={() => void acknowledge()}
            className="btn-primary w-full min-h-12 text-base"
          >
            {busy ? "Guardando…" : "Enterado"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
