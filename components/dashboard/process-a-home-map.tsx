"use client";

import Link from "next/link";
import { ProcessFlowDiagram } from "@/components/process-flow-diagram";
import { FLOW_STEPS_A } from "@/lib/domain/flow";
import type { Role } from "@/lib/domain/types";

/** Pasos del Proceso A donde el rol actúa de forma principal. */
export const PROCESS_A_ROLE_STEPS: Record<Role, number[]> = {
  ingeniero: [1, 2, 4],
  compras: [3, 7],
  pagos: [1, 5, 6],
  direccion: [5],
  recepcion: [7],
  contabilidad: [7],
};

export function ProcessAHomeMap({
  role,
  compact = true,
}: {
  role: Role;
  compact?: boolean;
}) {
  const highlight = PROCESS_A_ROLE_STEPS[role] ?? [];
  const mySteps = FLOW_STEPS_A.filter((s) => highlight.includes(s.step));

  return (
    <section className="dash-panel p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="dash-section-title">Proceso A — OC por obra</h2>
          <p className="dash-caption mt-1 max-w-2xl">
            Flujo general: de la obra al pago saldado. Tus pasos están resaltados.
          </p>
        </div>
        <Link
          href="/flujo"
          className="shrink-0 text-sm font-semibold text-orange-700 hover:text-orange-900"
        >
          Ver mapa completo →
        </Link>
      </div>

      <div className="mt-4 overflow-x-auto pb-1">
        <ProcessFlowDiagram processKind="a" highlightSteps={highlight} />
      </div>

      {!compact && mySteps.length > 0 ? (
        <ul className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {mySteps.map((s) => (
            <li
              key={s.step}
              className="rounded-xl border border-orange-100 bg-orange-50/50 px-3 py-2.5 text-sm"
            >
              <p className="font-semibold text-zinc-900">
                {s.step}. {s.shortTitle}
              </p>
              <p className="mt-0.5 text-xs text-zinc-600">{s.detail}</p>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
