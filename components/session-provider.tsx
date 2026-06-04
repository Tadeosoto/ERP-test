"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { SessionUser } from "@/lib/domain/types";

type Ctx = {
  user: SessionUser | null;
  ready: boolean;
  login: (email: string, password: string) => Promise<{ ok: true } | { ok: false; error: string }>;
  quickLogin: (email: string) => Promise<{ ok: true } | { ok: false; error: string }>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
};

const SessionContext = createContext<Ctx | null>(null);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [ready, setReady] = useState(false);

  const refreshUser = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me", { credentials: "include" });
      if (res.ok) {
        const data = (await res.json()) as { user: SessionUser };
        setUser(data.user);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    }
  }, []);

  useEffect(() => {
    refreshUser().finally(() => setReady(true));
  }, [refreshUser]);

  const login = useCallback(async (email: string, password: string) => {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ email, password }),
    });
    const data = (await res.json()) as { user?: SessionUser; error?: string };
    if (!res.ok) return { ok: false as const, error: data.error ?? "Error al entrar." };
    setUser(data.user ?? null);
    return { ok: true as const };
  }, []);

  const quickLogin = useCallback(async (email: string) => {
    const res = await fetch("/api/auth/quick-login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ email }),
    });
    const data = (await res.json()) as { user?: SessionUser; error?: string };
    if (!res.ok) return { ok: false as const, error: data.error ?? "Error al entrar." };
    setUser(data.user ?? null);
    return { ok: true as const };
  }, []);

  const logout = useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, ready, login, quickLogin, logout, refreshUser }),
    [user, ready, login, quickLogin, logout, refreshUser]
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): Ctx {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("SessionProvider requerido");
  return ctx;
}
