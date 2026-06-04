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
    refresh();
    const id = setInterval(() => {
      if (document.visibilityState === "visible") refresh();
    }, pollMs);
    return () => clearInterval(id);
  }, [refresh, pollMs]);

  const markAllRead = useCallback(async () => {
    await fetch("/api/notifications", { method: "POST", credentials: "include" });
    await refresh();
  }, [refresh]);

  return { notifications, unreadCount, loading, refresh, markAllRead };
}
