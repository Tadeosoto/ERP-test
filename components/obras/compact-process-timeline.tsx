"use client";

import type { OrderStatus } from "@/lib/domain/types";
import { OBRA_PROCESS_STEPS, obraProcessPhase } from "@/lib/dashboard/obra-order-table";

type NodeState = "done" | "current" | "upcoming";

function nodeState(phase: number, step: number, complete: boolean): NodeState {
  if (complete) return "done";
  if (phase > step) return "done";
  if (phase === step) return "current";
  return "upcoming";
}

export function CompactProcessTimeline({ status }: { status: OrderStatus }) {
  const phase = obraProcessPhase(status);
  const complete = status === "completed";

  return (
    <div className="flex min-w-[11rem] items-center gap-0.5" title="Progreso del proceso">
      {OBRA_PROCESS_STEPS.map((s, i) => {
        const state = nodeState(phase, s.step, complete);
        const dot =
          state === "done"
            ? "bg-emerald-500 text-white"
            : state === "current"
              ? status === "engineerRejected"
                ? "bg-red-500 text-white ring-2 ring-red-200"
                : status === "awaitingEngineer"
                  ? "bg-orange-500 text-white ring-2 ring-orange-200"
                  : status === "invoiceReceived"
                    ? "bg-violet-500 text-white ring-2 ring-violet-200"
                    : "bg-sky-500 text-white ring-2 ring-sky-200"
              : "bg-zinc-200 text-zinc-400";
        const line = state === "done" ? "bg-emerald-400" : "bg-zinc-200";
        return (
          <div key={s.step} className="flex items-center">
            <span
              className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[9px] font-bold ${dot}`}
              title={s.label}
            >
              {state === "done" ? (
                <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                s.step
              )}
            </span>
            {i < OBRA_PROCESS_STEPS.length - 1 && (
              <span className={`mx-0.5 h-0.5 w-2 shrink-0 rounded ${line}`} aria-hidden />
            )}
          </div>
        );
      })}
    </div>
  );
}

export function ProcessTimelineLegend() {
  const items = [
    { cls: "bg-emerald-500", label: "Completada" },
    { cls: "bg-sky-500", label: "En proceso" },
    { cls: "bg-orange-500", label: "Pendiente aprobación" },
    { cls: "bg-violet-500", label: "Factura recibida" },
    { cls: "bg-red-500", label: "Corrección solicitada" },
    { cls: "bg-zinc-300", label: "Pendiente" },
  ];
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-zinc-500">
      {items.map((it) => (
        <span key={it.label} className="inline-flex items-center gap-1.5">
          <span className={`h-2.5 w-2.5 rounded-full ${it.cls}`} />
          {it.label}
        </span>
      ))}
    </div>
  );
}
