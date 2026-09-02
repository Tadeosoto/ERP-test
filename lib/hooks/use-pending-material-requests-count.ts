"use client";

import { useCallback, useEffect, useState } from "react";
import type { MaterialRequestDto } from "@/lib/domain/types";
import { canActAsCompras } from "@/lib/domain/transitions";
import type { Role } from "@/lib/domain/types";

export function usePendingMaterialRequestsCount(role: Role | undefined, pollMs = 35000) {
  const [count, setCount] = useState(0);
  const enabled = role ? canActAsCompras(role) : false;

  const refresh = useCallback(async () => {
    if (!enabled) {
      setCount(0);
      return;
    }
    try {
      const res = await fetch("/api/material-requests?status=sent", { credentials: "include" });
      if (!res.ok) return;
      const data = (await res.json()) as { requests: MaterialRequestDto[] };
      setCount(data.requests.length);
    } catch {
      /* ignore */
    }
  }, [enabled]);

  useEffect(() => {
    void refresh();
    if (!enabled) return;
    const id = setInterval(() => {
      if (document.visibilityState === "visible") void refresh();
    }, pollMs);
    return () => clearInterval(id);
  }, [refresh, pollMs, enabled]);

  return { pendingCount: count, refreshPendingCount: refresh };
}
