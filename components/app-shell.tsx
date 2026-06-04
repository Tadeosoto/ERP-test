"use client";

import { createContext, useCallback, useContext, useRef, useState } from "react";
import { DashboardShell } from "@/components/dashboard-shell";

type RefreshCtx = { register: (fn: () => void) => void };

const RefreshContext = createContext<RefreshCtx>({ register: () => {} });

export function usePageRefreshRegister() {
  return useContext(RefreshContext).register;
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const refreshRef = useRef<(() => void) | null>(null);
  const [, bump] = useState(0);

  const register = useCallback((fn: () => void) => {
    refreshRef.current = fn;
    bump((n) => n + 1);
  }, []);

  const onRefresh = useCallback(async () => {
    refreshRef.current?.();
  }, []);

  return (
    <RefreshContext.Provider value={{ register }}>
      <DashboardShell onRefresh={onRefresh}>{children}</DashboardShell>
    </RefreshContext.Provider>
  );
}
