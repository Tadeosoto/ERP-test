"use client";

import { useCallback, useEffect, useState } from "react";
import type { NotificationDto } from "@/lib/domain/types";

export function useNotifications(pollMs = 35000) {
  const [notifications, setNotifications] = useState<NotificationDto[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications", { credentials: "include" });
      if (!res.ok) return;
      const data = (await res.json()) as {
        notifications: NotificationDto[];
        unreadCount: number;
      };
      setNotifications(data.notifications);
      setUnreadCount(data.unreadCount);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    // pollMs <= 0 = solo carga inicial (sin intervalo). Evita setInterval(0) que satura la API.
    if (pollMs <= 0) return;
    const id = setInterval(() => {
      if (document.visibilityState === "visible") void refresh();
    }, pollMs);
    return () => clearInterval(id);
  }, [refresh, pollMs]);

  const markAllRead = useCallback(async () => {
    // Quitar el badge de inmediato; el POST confirma en servidor.
    setUnreadCount(0);
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    await fetch("/api/notifications", { method: "POST", credentials: "include" });
    await refresh();
  }, [refresh]);

  return { notifications, unreadCount, loading, refresh, markAllRead };
}
