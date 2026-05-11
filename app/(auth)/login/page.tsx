"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { DEMO_PASSWORD, DEMO_USERS } from "@/lib/auth/users";
import { ROLE_LABEL } from "@/lib/domain/labels";
import { useSession } from "@/components/session-provider";

export default function LoginPage() {
  const { session, ready, login } = useSession();
  const router = useRouter();
  const [email, setEmail] = useState(DEMO_USERS[0]?.email ?? "");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!ready) return;
    if (session) router.replace("/dashboard");
  }, [ready, session, router]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const r = login(email, password);
    if (!r.ok) {
      setError(r.error);
      return;
    }
    router.replace("/dashboard");
  }

  function quick(userEmail: string) {
    setEmail(userEmail);
    const r = login(userEmail, DEMO_PASSWORD);
    setError(null);
    if (!r.ok) setError(r.error);
    else router.replace("/dashboard");
  }

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-orange-400 via-orange-500 to-orange-700 text-white">
        Cargando…
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-orange-400 via-orange-500 to-orange-700 px-4 py-12">
      <div className="w-full max-w-md rounded-3xl border border-white/20 bg-white p-8 shadow-xl">
        <h1 className="text-center text-2xl font-bold text-orange-950">CCP ERP</h1>
        <p className="mt-2 text-center text-sm text-zinc-600">
          Demo instalaciones eléctricas · contraseña{" "}
          <code className="rounded bg-orange-50 px-1.5 py-0.5 text-orange-800">{DEMO_PASSWORD}</code>
        </p>

        <form onSubmit={submit} className="mt-8 space-y-4">
          <div>
            <label htmlFor="email" className="text-sm font-medium text-zinc-700">
              Correo
            </label>
            <input
              id="email"
              type="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-2xl border border-orange-100 bg-orange-50/50 px-4 py-3 text-zinc-900 outline-none ring-orange-200 focus:ring-2"
              required
            />
          </div>
          <div>
            <label htmlFor="password" className="text-sm font-medium text-zinc-700">
              Contraseña
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-2xl border border-orange-100 bg-orange-50/50 px-4 py-3 outline-none ring-orange-200 focus:ring-2"
              required
            />
          </div>
          {error && (
            <p className="rounded-2xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
          )}
          <button
            type="submit"
            className="w-full rounded-2xl bg-orange-600 py-3 font-semibold text-white shadow-sm transition hover:bg-orange-700"
          >
            Entrar
          </button>
        </form>

        <div className="mt-8 border-t border-orange-100 pt-6">
          <p className="text-center text-sm font-medium text-zinc-700">Acceso rápido</p>
          <ul className="mt-3 space-y-2">
            {DEMO_USERS.map((u) => (
              <li key={u.id}>
                <button
                  type="button"
                  onClick={() => quick(u.email)}
                  className="flex w-full flex-col rounded-2xl border border-orange-100 px-4 py-3 text-left transition hover:bg-orange-50"
                >
                  <span className="font-medium text-zinc-900">{u.name}</span>
                  <span className="text-xs text-zinc-500">
                    {ROLE_LABEL[u.role]} · {u.email}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>

        <p className="mt-6 text-center text-xs text-zinc-400">
          Datos solo en este navegador (localStorage).
        </p>
      </div>
      <Link href="/dashboard" className="mt-6 text-sm text-white/90 underline-offset-4 hover:underline">
        Ir al panel (requiere sesión)
      </Link>
    </div>
  );
}
