"use client";

import type { PurchaseCase, CaseStatus } from "@/lib/domain/types";
import { FLOW_STEPS, flowPhaseNumber } from "@/lib/domain/flow";

function activeStep(status: CaseStatus): number {
  return flowPhaseNumber(status);
}

export function CaseTimeline({ c }: { c: PurchaseCase }) {
  const a = activeStep(c.status);
  return (
    <ol className="space-y-2 border-l-2 border-orange-200 pl-4">
      {FLOW_STEPS.map((s) => {
        const n = s.step;
        const done = a > n;
        const cur = !done && a === n;
        return (
          <li
            key={s.step}
            className={`text-sm ${
              done ? "font-medium text-orange-800" : cur ? "font-semibold text-orange-600" : "text-zinc-400"
            }`}
          >
            {n}. {s.detail}
          </li>
        );
      })}
    </ol>
  );
}
