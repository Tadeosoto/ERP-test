"use client";

import Link from "next/link";
import { useMemo } from "react";
import type { InvoiceFirstCommitmentDto, Role } from "@/lib/domain/types";
import { INVOICE_FIRST_STATUS_LABEL } from "@/lib/domain/proceso-c";
import { formatDateShort, formatMoney } from "@/lib/format";

function actionFor(role: Role, status: InvoiceFirstCommitmentDto["status"]): string {
  if (role === "pagos" && status === "awaiting_oc") return "Solicitar OC";
  if (role === "compras" && status === "oc_requested") return "Generar OC";
  return "Ver detalle";
}

/** Panel de facturas Proceso C pendientes de acción (Administración / Compras). */
export function PagosProcesoCPanel({
  commitments,
  role,
  compact = false,
}: {
  commitments: InvoiceFirstCommitmentDto[];
  role: Role;
  compact?: boolean;
}) {
  const pending = useMemo(() => {
    if (role === "pagos") return commitments.filter((c) => c.status === "awaiting_oc");
    if (role === "compras") {
      return commitments.filter((c) => c.status === "oc_requested" && !c.purchaseOrderId);
    }
    return [];
  }, [commitments, role]);

  if (pending.length === 0) return null;

  const subtitle =
    role === "pagos"
      ? "Factura primero — revisa y solicita la OC a Compras"
      : "Factura primero — genera la OC vinculada";

  return (
    <section className={`card shrink-0 border-violet-100 ${compact ? "px-3 py-2.5" : "p-4 sm:p-5"}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <h2 className={`font-bold text-zinc-900 ${compact ? "text-sm" : "text-base sm:text-lg"}`}>
            Facturas (Proceso C)
          </h2>
          {!compact && <p className="text-xs text-zinc-500">{subtitle}</p>}
        </div>
        <span className="rounded-full bg-violet-100 px-2.5 py-0.5 text-[11px] font-semibold text-violet-800">
          {pending.length} pendiente{pending.length === 1 ? "" : "s"}
        </span>
      </div>
      <ul className={compact ? "mt-1.5 divide-y divide-violet-50" : "mt-3 divide-y divide-violet-50"}>
        {pending.slice(0, compact ? 4 : 6).map((c) => (
          <li
            key={c.id}
            className={`flex items-center justify-between gap-3 ${compact ? "py-1.5" : "flex-wrap py-3 first:pt-0"}`}
          >
            <Link href={`/compromisos-c/${c.id}`} className="min-w-0 flex-1 hover:opacity-90">
              <p className={`truncate font-semibold text-zinc-900 ${compact ? "text-xs" : "text-sm"}`}>
                {c.invoiceFolio}
                <span className="ml-1 font-medium text-zinc-500">· {c.supplierName}</span>
              </p>
              <p className={`truncate text-zinc-600 ${compact ? "text-[10px]" : "text-xs"}`}>
                {c.obraName ?? "Sin obra"} · {formatMoney(c.displayTotal, c.currency)}
                {compact
                  ? ` · ${formatDateShort(c.invoiceDate)}`
                  : null}
              </p>
              {!compact && (
                <p className="text-xs text-zinc-400">
                  {formatDateShort(c.invoiceDate)} · {INVOICE_FIRST_STATUS_LABEL[c.status]}
                </p>
              )}
            </Link>
            <Link
              href={
                role === "compras" && c.status === "oc_requested"
                  ? `/ordenes/nueva?compromisoFacturaId=${c.id}`
                  : `/compromisos-c/${c.id}`
              }
              className={`btn-primary shrink-0 bg-violet-700 hover:bg-violet-800 ${
                compact ? "px-2.5 py-1 text-[11px]" : "text-xs"
              }`}
            >
              {actionFor(role, c.status)}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
