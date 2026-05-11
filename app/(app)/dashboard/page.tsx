"use client";

import Link from "next/link";
import { ExpedienteCard } from "@/components/expediente-card";
import { MiniCalendar } from "@/components/mini-calendar";
import { useSession } from "@/components/session-provider";
import { useCases } from "@/lib/data/use-cases";
import { formatMoney } from "@/lib/format";
import { canRoleAdvance } from "@/lib/domain/transitions";
import { RoleGuidancePanel } from "@/components/role-guidance-panel";
import { STATUS_LABEL } from "@/lib/domain/labels";

export default function DashboardPage() {
  const cases = useCases();
  const { session } = useSession();

  const sorted = [...cases].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );

  const mine = session
    ? sorted.filter((c) => canRoleAdvance(session.role, c.status))
    : [];

  const totalAmount = sorted.reduce((s, c) => s + c.amountOc, 0);
  const currency = sorted[0]?.currency ?? "MXN";

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900">Panel</h1>
          <p className="mt-1 text-sm text-zinc-600">
            Expedientes de compra · flujo digital (sin carpeta física entre pisos)
          </p>
        </div>
        {session?.role === "costos" && (
          <Link
            href="/cases/new"
            className="rounded-full bg-orange-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-orange-700"
          >
            + Nueva OC
          </Link>
        )}
      </div>

      {session && <RoleGuidancePanel role={session.role} />}

      <section className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-3xl border border-orange-100 bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-zinc-500">Total expedientes</p>
          <p className="mt-2 text-3xl font-bold tabular-nums text-orange-700">{sorted.length}</p>
          <p className="mt-1 text-xs text-emerald-600">Demo en navegador</p>
        </div>
        <div className="rounded-3xl border border-orange-100 bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-zinc-500">Mis pendientes</p>
          <p className="mt-2 text-3xl font-bold tabular-nums text-orange-700">{mine.length}</p>
          <p className="mt-1 text-xs text-zinc-500">Según tu rol actual</p>
        </div>
        <div className="rounded-3xl border border-orange-100 bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-zinc-500">Suma importes OC</p>
          <p className="mt-2 text-2xl font-bold tabular-nums text-orange-700">
            {formatMoney(totalAmount, currency)}
          </p>
          <p className="mt-1 text-xs text-zinc-500">Todos los expedientes listados</p>
        </div>
      </section>

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-zinc-900">Expedientes</h2>
            <span className="text-sm text-zinc-500">{sorted.length} activos en lista</span>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {sorted.length === 0 ? (
              <p className="col-span-2 rounded-3xl border border-dashed border-orange-200 bg-white/80 py-12 text-center text-zinc-500">
                No hay expedientes. Crea una OC desde{" "}
                <Link href="/cases/new" className="font-medium text-orange-700 underline">
                  Nueva OC
                </Link>
                .
              </p>
            ) : (
              sorted.map((c) => <ExpedienteCard key={c.id} c={c} />)
            )}
          </div>
        </div>
        <div className="space-y-6">
          <MiniCalendar />
          <div className="rounded-3xl border border-orange-100 bg-white p-5 shadow-sm">
            <h3 className="font-semibold text-zinc-900">Leyenda estados</h3>
            <ul className="mt-3 space-y-2 text-sm text-zinc-600">
              {(Object.keys(STATUS_LABEL) as Array<keyof typeof STATUS_LABEL>).slice(0, 5).map((k) => (
                <li key={k}>
                  <span className="font-medium text-zinc-800">{STATUS_LABEL[k]}</span>
                </li>
              ))}
              <li className="text-xs text-zinc-400">… ver detalle en cada tarjeta</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
