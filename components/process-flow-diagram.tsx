"use client";

import type { OrderProcessKind, OrderStatus } from "@/lib/domain/types";
import {
  flowPhaseNumber,
  flowStepsForProcess,
  isFlowComplete,
  type FlowStepDef,
} from "@/lib/domain/flow";

function Arrow() {
  return (
    <span className="flex shrink-0 items-center justify-center text-teal-300" aria-hidden>
      <svg className="h-4 w-6 sm:h-5 sm:w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
      </svg>
    </span>
  );
}

function ArrowDown() {
  return (
    <span className="flex justify-center py-1 text-teal-300" aria-hidden>
      <svg className="h-6 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    </span>
  );
}

type NodeState = "done" | "current" | "upcoming" | "legend";

function nodeState(phase: number, step: number, complete: boolean, legend: boolean): NodeState {
  if (legend) return "legend";
  if (complete) return "done";
  if (phase > step) return "done";
  if (phase === step) return "current";
  return "upcoming";
}

function StepNode({
  step,
  shortTitle,
  state,
}: {
  step: number;
  shortTitle: string;
  state: NodeState;
}) {
  const base =
    state === "done"
      ? "border-teal-600 bg-teal-600 text-white shadow-md"
      : state === "current"
        ? "border-orange-600 bg-white text-orange-800 ring-2 ring-orange-400 ring-offset-2"
        : state === "legend"
          ? "border-teal-200 bg-white text-teal-900 shadow-sm"
          : "border-orange-100 bg-orange-50/80 text-zinc-400";
  return (
    <div className="flex min-w-0 flex-col items-center gap-1">
      <div
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border-2 text-xs font-bold sm:h-12 sm:w-12 ${base}`}
        title={shortTitle}
      >
        {state === "done" ? (
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        ) : (
          <span>{step}</span>
        )}
      </div>
      <span className="max-w-[4.5rem] text-center text-[10px] font-medium leading-tight text-zinc-600 sm:text-xs">
        {shortTitle}
      </span>
    </div>
  );
}

function DiagramRow({
  steps,
  phase,
  complete,
  legend,
}: {
  steps: readonly FlowStepDef[];
  phase: number;
  complete: boolean;
  legend: boolean;
}) {
  return (
    <>
      <div className="hidden flex-wrap items-start justify-center gap-1 sm:flex lg:gap-2">
        {steps.map((s, i) => (
          <div key={`${s.step}-${s.shortTitle}`} className="flex items-start">
            <StepNode
              step={s.step}
              shortTitle={s.shortTitle}
              state={nodeState(phase, s.step, complete, legend)}
            />
            {i < steps.length - 1 && <Arrow />}
          </div>
        ))}
      </div>
      <div className="flex flex-col items-center sm:hidden">
        {steps.map((s, i) => (
          <div key={`${s.step}-${s.shortTitle}-m`} className="flex flex-col items-center">
            <StepNode
              step={s.step}
              shortTitle={s.shortTitle}
              state={nodeState(phase, s.step, complete, legend)}
            />
            {i < steps.length - 1 && <ArrowDown />}
          </div>
        ))}
      </div>
    </>
  );
}

export function ProcessFlowDiagram({
  status,
  processKind = "a",
  className = "",
}: {
  status?: OrderStatus | null;
  /** Variante visual: a (OC + Ingeniería), c (OC → Administración), b (gasto directo). */
  processKind?: OrderProcessKind | "b";
  className?: string;
}) {
  const legend = status == null;
  const steps = flowStepsForProcess(processKind);
  const kindForPhase: OrderProcessKind = processKind === "b" ? "a" : processKind;
  const phase = legend
    ? 0
    : processKind === "b"
      ? 0
      : flowPhaseNumber(status!, kindForPhase);
  const complete = legend ? false : isFlowComplete(status!);

  const label =
    processKind === "c" ? "Proceso C" : processKind === "b" ? "Proceso B" : "Proceso A";

  return (
    <div className={className}>
      {!legend && (
        <p className="mb-2 text-center text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
          {label}
        </p>
      )}
      <DiagramRow steps={steps} phase={phase} complete={complete} legend={legend} />
      {complete && !legend && (
        <p className="mt-3 text-center text-base font-medium text-teal-700">Proceso completado</p>
      )}
    </div>
  );
}
