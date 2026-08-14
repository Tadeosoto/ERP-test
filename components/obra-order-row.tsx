"use client";

import Link from "next/link";
import { useState } from "react";
import { ProcessFlowDiagram } from "@/components/process-flow-diagram";
import { SystemStatusBadge } from "@/components/ui/system-status-badge";
import { describeGate, flowProgressPercent, formatPendingRoles } from "@/lib/domain/flow";
import { PAYMENT_LABEL_TEXT, PAYMENT_TYPE_TEXT } from "@/lib/domain/labels";
import type { PurchaseOrderDto } from "@/lib/domain/types";
import { IconClipboard } from "@/components/ui/action-icons";
import { formatDate, formatMoney } from "@/lib/format";

export function ObraOrderRow({ order }: { order: PurchaseOrderDto }) {
  const [open, setOpen] = useState(false);
  const pendingLabel = formatPendingRoles(order.status);
  const progress = flowProgressPercent(order.status);

  return (
    <article className="card overflow-hidden transition hover:border-orange-200">
      <div className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1 pr-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-teal-600">Obra</p>
            <p className="mt-0.5 break-words text-base font-medium text-teal-800">{order.obraName}</p>
            <Link
              href={`/ordenes/${order.id}`}
              className="mt-3 block break-words text-xl font-bold leading-snug text-zinc-900 hover:text-orange-700"
            >
              {order.title}
            </Link>
            <p className="mt-2 break-words text-base text-zinc-600">{order.supplierName}</p>
          </div>
          <p className="shrink-0 text-right text-sm leading-snug text-zinc-500 sm:whitespace-nowrap">
            Creada el {formatDate(order.createdAt)}
          </p>
        </div>

        <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-5">
          <div className="grid min-w-0 flex-1 grid-cols-2 gap-x-5 gap-y-4 sm:grid-cols-4">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">A cargo</p>
              <p className="mt-1 break-words text-base font-semibold text-zinc-900">{pendingLabel}</p>
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Estado</p>
              <div className="mt-1">
                <SystemStatusBadge status={order.status} size="sm" />
              </div>
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Modalidad</p>
              <p className="mt-1 break-words text-base font-semibold text-zinc-900">
                {order.paymentType
                  ? PAYMENT_TYPE_TEXT[order.paymentType]
                  : order.suggestedPaymentType === "parcialidades"
                    ? "Parcialidades (propuesto)"
                    : "—"}
              </p>
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Saldo</p>
              <p className="mt-1 break-words text-base font-semibold text-orange-800">
                {PAYMENT_LABEL_TEXT[order.paymentLabel]}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="flex h-12 w-12 shrink-0 items-center justify-center self-end rounded-2xl border border-orange-100 bg-orange-50 text-orange-800 hover:bg-orange-100 sm:self-start"
            aria-expanded={open}
            aria-label={open ? "Contraer detalle" : "Expandir detalle"}
          >
            <svg
              className={`h-5 w-5 transition-transform ${open ? "rotate-180" : ""}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>
      </div>

      <div className="border-t border-orange-50 bg-orange-50/30 px-5 py-3">
        <div className="flex items-center gap-3">
          <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-orange-100">
            <div
              className="absolute inset-y-0 left-0 rounded-full bg-teal-600 transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="shrink-0 rounded-full bg-teal-600 px-3 py-1 text-sm font-bold text-white">
            {progress}%
          </span>
        </div>
      </div>

      {open && (
        <div className="space-y-4 border-t border-orange-100 bg-white px-5 py-5">
          <p className="text-base text-zinc-700">{describeGate(order.status, order.paymentType)}</p>
          <p className="text-base tabular-nums text-orange-800">
            {formatMoney(order.amountPaidSoFar, order.currency)} pagado de{" "}
            {formatMoney(order.totalAmount, order.currency)}
          </p>
          <ProcessFlowDiagram status={order.status} processKind={order.processKind} />
          <Link href={`/ordenes/${order.id}`} className="btn-primary">
            <IconClipboard />
            Ver detalle y tareas
          </Link>
        </div>
      )}
    </article>
  );
}
