"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { Role } from "@/lib/domain/types";
import { clearSession, readSession, writeSession, type Session } from "@/lib/auth/session";
import { DEMO_PASSWORD, findUserByEmail } from "@/lib/auth/users";
import { seedIfEmpty } from "@/lib/data/repository";

type Ctx = {
  session: Session | null;
  login: (email: string, password: string) => { ok: true } | { ok: false; error: string };
  logout: () => void;
  ready: boolean;
};

const SessionContext = createContext<Ctx | null>(null);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      seedIfEmpty();
      setSession(readSession());
    } finally {
      setReady(true);
    }
  }, []);

  const login = useCallback((email: string, password: string) => {
    if (password !== DEMO_PASSWORD) {
      return { ok: false as const, error: "Contraseña incorrecta (demo: demo2026)." };
    }
    const user = findUserByEmail(email);
    if (!user) return { ok: false as const, error: "Usuario no encontrado." };
    const next: Session = {
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    };
    writeSession(next);
    setSession(next);
    return { ok: true as const };
  }, []);

  const logout = useCallback(() => {
    clearSession();
    setSession(null);
  }, []);

  const value = useMemo(() => ({ session, login, logout, ready }), [session, login, logout, ready]);

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): Ctx {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("SessionProvider requerido");
  return ctx;
}

export function useOptionalRole(): Role | null {
  return useSession().session?.role ?? null;
}
