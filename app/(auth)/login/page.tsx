"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { CcpLogoIcon } from "@/components/ccp-logo";
import { useSession } from "@/components/session-provider";
import { IconLogIn } from "@/components/ui/action-icons";
import { LoadingScreen } from "@/components/ui/loading-screen";
import { DEMO_USERS } from "@/lib/auth/demo-users";

const ROLE_ORDER = [
  "Administración",
  "Compras",
  "Dirección",
  "Contabilidad",
  "Recepción",
  "Ingeniería",
] as const;

export default function LoginPage() {
  const { user, ready, login, quickLogin } = useSession();
  const router = useRouter();
  const [email, setEmail] = useState<string>(DEMO_USERS[0].email);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const grouped = useMemo(() => {
    const map = new Map<string, (typeof DEMO_USERS)[number][]>();
    for (const label of ROLE_ORDER) map.set(label, []);
    for (const u of DEMO_USERS) {
      const list = map.get(u.roleLabel) ?? [];
      list.push(u);
      map.set(u.roleLabel, list);
    }
    return ROLE_ORDER.map((label) => ({ label, users: map.get(label) ?? [] })).filter(
      (g) => g.users.length > 0
    );
  }, []);

  useEffect(() => {
    if (!ready) return;
    if (user) router.replace("/inicio");
  }, [ready, user, router]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const r = await login(email, password);
    setBusy(false);
    if (!r.ok) {
      setError(r.error);
      return;
    }
    router.replace("/inicio");
  }

  async function enterAs(userEmail: string) {
    setEmail(userEmail);
    setError(null);
    setBusy(true);
    const r = await quickLogin(userEmail);
    setBusy(false);
    if (!r.ok) setError(r.error);
    else router.replace("/inicio");
  }

  if (!ready) {
    return (
      <LoadingScreen
        message="Cargando Sesión"
        viewport
        tone="light"
        className="bg-gradient-to-br from-orange-400 via-orange-500 to-teal-700"
      />
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-orange-400 via-orange-500 to-teal-700 px-4 py-12">
      <div className="w-full max-w-md rounded-3xl border border-white/20 bg-white p-8 shadow-xl">
        <div className="mb-4 flex justify-center">
          <CcpLogoIcon size="lg" priority />
        </div>
        <h1 className="text-center text-3xl font-bold text-orange-950">CCP ERP</h1>
        <p className="mt-3 text-center text-base text-zinc-600">
          Elige tu nombre para entrar (acceso de prueba). También puedes usar correo y contraseña{" "}
          <code className="rounded bg-orange-50 px-2 py-1 text-orange-800">ccp2026</code>
        </p>

        <div className="mt-6">
          <p className="text-center text-base font-semibold text-zinc-800">Acceso rápido</p>
          <p className="mt-1 text-center text-sm text-zinc-500">Un clic para entrar · sin contraseña aún</p>
          <div className="mt-3 max-h-[min(28rem,55vh)] space-y-4 overflow-y-auto pr-1">
            {grouped.map((group) => (
              <div key={group.label}>
                <p className="mb-1.5 px-1 text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
                  {group.label}
                </p>
                <ul className="space-y-2">
                  {group.users.map((u) => (
                    <li key={u.email}>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void enterAs(u.email)}
                        className="flex w-full items-center gap-3 rounded-2xl border-2 border-orange-200 bg-orange-50/80 px-4 py-3 text-left transition hover:border-orange-400 hover:bg-orange-100"
                      >
                        <IconLogIn className="h-5 w-5 shrink-0 text-orange-600" />
                        <span className="flex min-w-0 flex-1 flex-col">
                          <span className="text-base font-semibold text-zinc-900">{u.name}</span>
                          <span className="truncate text-sm text-zinc-600">{u.email}</span>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <details className="mt-8 group">
          <summary className="cursor-pointer text-center text-sm font-medium text-zinc-500 hover:text-orange-800">
            Entrar con correo y contraseña
          </summary>
          <form onSubmit={submit} className="mt-4 space-y-4 border-t border-orange-100 pt-6">
            <label className="block">
              <span className="text-base font-medium text-zinc-700">Correo</span>
              <input
                type="email"
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-2 w-full min-h-12 rounded-2xl border border-orange-100 px-4 text-base outline-none ring-teal-200 focus:ring-2"
                required
              />
            </label>
            <label className="block">
              <span className="text-base font-medium text-zinc-700">Contraseña</span>
              <input
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-2 w-full min-h-12 rounded-2xl border border-orange-100 px-4 text-base outline-none ring-teal-200 focus:ring-2"
                required
              />
            </label>
            <button type="submit" disabled={busy} className="btn-primary w-full">
              <IconLogIn />
              Entrar
            </button>
          </form>
        </details>

        {error && (
          <p className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-base leading-relaxed text-red-700">
            {error}
          </p>
        )}
      </div>
      <Link href="/inicio" className="mt-6 text-base text-white/90 underline-offset-4 hover:underline">
        Ir a obras (requiere sesión)
      </Link>
    </div>
  );
}
