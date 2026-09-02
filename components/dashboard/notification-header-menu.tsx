"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { FloatingCallout } from "@/components/ui/callout-bubble";
import { useSession } from "@/components/session-provider";
import {
  isNotificationActionable,
  notificationActionHref,
  notificationActionLabel,
} from "@/lib/dashboard/notification-actions";
import { useNotifications } from "@/lib/hooks/use-notifications";
import { formatDateTime } from "@/lib/format";

export function NotificationHeaderMenu() {
  const { user } = useSession();
  const { notifications, unreadCount, refresh, markAllRead } = useNotifications();
  const [open, setOpen] = useState(false);
  const [dismissedId, setDismissedId] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  const latest = notifications[0] ?? null;
  const showBubble = Boolean(latest && latest.id !== dismissedId && !open);

  const actionHref = latest && user ? notificationActionHref(latest, user.role) : null;
  const actionable = latest && user ? isNotificationActionable(latest, user.role) : false;
  const actionLabel = latest && user ? notificationActionLabel(latest, user.role) : undefined;

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  useEffect(() => {
    if (latest && dismissedId && latest.id !== dismissedId) {
      setDismissedId(null);
    }
  }, [latest, dismissedId]);

  const preview = notifications.slice(0, 5);

  return (
    <div ref={ref} className="relative shrink-0 self-center">
      <button
        type="button"
        onClick={() => {
          setOpen((v) => !v);
          void refresh();
        }}
        className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-orange-100 bg-white text-orange-800 transition hover:bg-orange-50"
        aria-label={`Notificaciones${unreadCount ? `, ${unreadCount} sin leer` : ""}`}
        aria-expanded={open}
      >
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -bottom-0.5 -right-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-teal-600 px-1 text-[10px] font-bold text-white ring-2 ring-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {showBubble && latest && (
        <FloatingCallout
          title="Aviso reciente"
          message={latest.message}
          timestamp={latest.createdAt}
          actionLabel={actionable ? actionLabel : undefined}
          href={
            actionable
              ? actionHref ?? undefined
              : latest.orderId
                ? `/ordenes/${latest.orderId}`
                : latest.materialRequestId
                  ? `/solicitudes/material/${latest.materialRequestId}`
                  : "/notificaciones"
          }
          onDismiss={() => setDismissedId(latest.id)}
          align="right"
          placement="below"
          widthClass="w-[min(16rem,calc(100vw-4rem))]"
        />
      )}

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-[min(22rem,calc(100vw-2rem))] rounded-2xl border border-orange-100 bg-white py-2 shadow-lg">
          <div className="flex items-center justify-between border-b border-orange-50 px-4 py-2">
            <p className="text-sm font-semibold text-zinc-800">Notificaciones</p>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={() => void markAllRead()}
                className="text-xs font-medium text-teal-700 hover:underline"
              >
                Marcar leídas
              </button>
            )}
          </div>
          <ul className="max-h-64 overflow-y-auto">
            {preview.length === 0 ? (
              <li className="px-4 py-6 text-center text-sm text-zinc-400">Sin avisos.</li>
            ) : (
              preview.map((n) => {
                const href =
                  user && isNotificationActionable(n, user.role)
                    ? notificationActionHref(n, user.role)
                    : n.orderId
                      ? `/ordenes/${n.orderId}`
                      : n.materialRequestId
                        ? `/solicitudes/material/${n.materialRequestId}`
                        : null;
                return (
                  <li
                    key={n.id}
                    className={`border-b border-orange-50/80 last:border-0 ${!n.read ? "bg-teal-50/20" : ""}`}
                  >
                    {href ? (
                      <Link
                        href={href}
                        onClick={() => setOpen(false)}
                        className="block px-4 py-3 hover:bg-orange-50/50"
                      >
                        <span className="block text-sm text-zinc-700">{n.message}</span>
                        <time
                          dateTime={n.createdAt}
                          className="mt-1 block text-[11px] tabular-nums text-zinc-400"
                        >
                          {formatDateTime(n.createdAt)}
                        </time>
                      </Link>
                    ) : (
                      <div className="px-4 py-3">
                        <p className="text-sm text-zinc-700">{n.message}</p>
                        <time
                          dateTime={n.createdAt}
                          className="mt-1 block text-[11px] tabular-nums text-zinc-400"
                        >
                          {formatDateTime(n.createdAt)}
                        </time>
                      </div>
                    )}
                  </li>
                );
              })
            )}
          </ul>
          <Link
            href="/notificaciones"
            onClick={() => setOpen(false)}
            className="block border-t border-orange-50 px-4 py-3 text-center text-sm font-medium text-orange-700 hover:bg-orange-50/40"
          >
            Ver todas →
          </Link>
        </div>
      )}
    </div>
  );
}
