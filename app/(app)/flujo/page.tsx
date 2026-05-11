"use client";

import Link from "next/link";
import { ProcessFlowDiagram } from "@/components/process-flow-diagram";
import { useCases } from "@/lib/data/use-cases";
import { FLOW_STEPS } from "@/lib/domain/flow";
import { ROLE_LABEL } from "@/lib/domain/labels";
import { formatMoney } from "@/lib/format";

export default function FlujoPage() {
  const cases = useCases();
  const sorted = [...cases].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900">Mapa del proceso</h1>
        <p className="mt-2 max-w-3xl text-sm text-zinc-600">
          Vista general del flujo de compras (cada expediente es como un «proyecto» u obra).{" "}
          <strong className="font-medium text-zinc-800">Todos pueden ver</strong> este mapa y el avance; las
          acciones las confirma solo el rol que corresponde en cada etapa.
        </p>
      </div>

      <section className="rounded-3xl border border-orange-100 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-zinc-900">Flujo estándar</h2>
        <p className="mt-1 text-sm text-zinc-600">
          Flechas = orden del proceso. Respuesta rápida por área en cada nodo.
        </p>
        <div className="mt-6 overflow-x-auto pb-2">
          <ProcessFlowDiagram />
        </div>
        <ol className="mt-8 grid gap-3 sm:grid-cols-2">
          {FLOW_STEPS.map((s) => (
            <li
              key={s.step}
              className="flex gap-3 rounded-2xl border border-orange-50 bg-orange-50/50 px-4 py-3 text-sm"
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-orange-600 text-xs font-bold text-white">
                {s.step}
              </span>
              <div>
                <p className="font-semibold text-zinc-900">{s.shortTitle}</p>
                <p className="text-zinc-600">{s.detail}</p>
                {s.primaryRole && (
                  <p className="mt-1 text-xs text-orange-800/90">
                    Quien avanza aquí: {ROLE_LABEL[s.primaryRole]}
                  </p>
                )}
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-zinc-900">Cómo va cada expediente</h2>
            <p className="mt-1 text-sm text-zinc-600">
              Mismo orden para todas las compras u obras. Pulsa una fila para abrir el detalle.
            </p>
          </div>
          <Link href="/dashboard" className="text-sm font-medium text-orange-700 underline">
            Ir al panel
          </Link>
        </div>

        {sorted.length === 0 ? (
          <p className="rounded-3xl border border-dashed border-orange-200 bg-white py-12 text-center text-zinc-500">
            Aún no hay expedientes.
          </p>
        ) : (
          <ul className="space-y-4">
            {sorted.map((c) => (
              <li
                key={c.id}
                className="rounded-3xl border border-orange-100 bg-white p-5 shadow-sm transition hover:border-orange-200"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <Link href={`/cases/${c.id}`} className="text-lg font-semibold text-zinc-900 hover:text-orange-700">
                      {c.title}
                    </Link>
                    <p className="mt-0.5 text-sm text-zinc-500">{c.supplierName}</p>
                    <p className="mt-2 text-sm font-medium tabular-nums text-orange-800">
                      {formatMoney(c.amountOc, c.currency)}
                    </p>
                  </div>
                  <div className="w-full min-w-[min(100%,280px)] shrink-0 lg:max-w-xl">
                    <p className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-400">
                      Avance en el flujo
                    </p>
                    <div className="overflow-x-auto pb-1">
                      <ProcessFlowDiagram status={c.status} />
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
