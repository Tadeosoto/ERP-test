"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { CcpLogoIcon } from "@/components/ccp-logo";
import { useSession } from "@/components/session-provider";
import { IconLogIn } from "@/components/ui/action-icons";

const QUICK_USERS = [
  { email: "carolina@ccp.local", name: "Rosa Carolina", role: "Pagos" },
  { email: "paty@ccp.local", name: "Paty", role: "Compras" },
  { email: "santiago@ccp.local", name: "Santiago", role: "Ingeniero" },
  { email: "recepcion@ccp.local", name: "Recepción", role: "Recepción" },
  { email: "helena@ccp.local", name: "Helena", role: "Contabilidad" },
];

export default function LoginPage() {
  const { user, ready, login } = useSession();
  const router = useRouter();
  const [email, setEmail] = useState(QUICK_USERS[0].email);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!ready) return;
    if (user) router.replace("/obras");
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
    router.replace("/obras");
  }

  async function quick(userEmail: string) {
    setEmail(userEmail);
    setError(null);
    setBusy(true);
    const r = await login(userEmail, password || "ccp2026");
    setBusy(false);
    if (!r.ok) setError(r.error);
    else router.replace("/obras");
  }

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-orange-400 via-orange-500 to-teal-700 text-lg text-white">
        Cargando…
      </div>
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
          Compras y pagos · contraseña inicial{" "}
          <code className="rounded bg-orange-50 px-2 py-1 text-orange-800">ccp2026</code>
        </p>

        <form onSubmit={submit} className="mt-8 space-y-4">
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
          {error && (
            <p className="rounded-2xl bg-red-50 px-4 py-3 text-base text-red-700">{error}</p>
          )}
          <button type="submit" disabled={busy} className="btn-primary w-full">
            <IconLogIn />
            Entrar
          </button>
        </form>

        <div className="mt-8 border-t border-orange-100 pt-6">
          <p className="text-center text-base font-medium text-zinc-700">Acceso rápido</p>
          <ul className="mt-3 space-y-2">
            {QUICK_USERS.map((u) => (
              <li key={u.email}>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void quick(u.email)}
                  className="flex w-full items-center gap-3 rounded-2xl border border-orange-100 px-4 py-3 text-left transition hover:bg-orange-50"
                >
                  <IconLogIn className="h-5 w-5 shrink-0 text-orange-600" />
                  <span className="flex min-w-0 flex-1 flex-col">
                  <span className="text-base font-semibold text-zinc-900">{u.name}</span>
                  <span className="text-sm text-zinc-500">
                    {u.role} · {u.email}
                  </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <Link href="/obras" className="mt-6 text-base text-white/90 underline-offset-4 hover:underline">
        Ir a obras (requiere sesión)
      </Link>
    </div>
  );
}
