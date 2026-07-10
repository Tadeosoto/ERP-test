"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { DirectExpenseDto, Role } from "@/lib/domain/types";
import { DIRECT_EXPENSE_STATUS_LABEL } from "@/lib/domain/solicitudes";
import { formatDateShort, formatMoney } from "@/lib/format";

type Tab = "pendientes" | "todos";

const PENDING = new Set(["sent", "paid", "awaiting_invoice", "invoice_received", "difference"]);

/** Estados que Recepción/Contabilidad suelen atender (factura y cierre). */
const INVOICE_FOCUS = new Set(["paid", "awaiting_invoice", "invoice_received", "difference"]);

function statusTone(status: DirectExpenseDto["status"]): string {
  switch (status) {
    case "sent":
      return "bg-orange-100 text-orange-800 ring-orange-200/80";
    case "paid":
      return "bg-sky-100 text-sky-800 ring-sky-200/80";
    case "awaiting_invoice":
      return "bg-violet-100 text-violet-800 ring-violet-200/80";
    case "invoice_received":
      return "bg-amber-100 text-amber-900 ring-amber-200/80";
    case "difference":
      return "bg-red-100 text-red-800 ring-red-200/80";
    case "completed":
      return "bg-emerald-100 text-emerald-800 ring-emerald-200/80";
    default:
      return "bg-zinc-100 text-zinc-700 ring-zinc-200/80";
  }
}

function actionLabel(status: DirectExpenseDto["status"], role?: Role): string {
  const invoiceRoles = role === "recepcion" || role === "contabilidad";
  switch (status) {
    case "sent":
      return invoiceRoles ? "Ver detalle" : "Registrar pago";
    case "paid":
    case "awaiting_invoice":
      return "Subir factura";
    case "invoice_received":
    case "difference":
      return "Validar";
    default:
      return "Ver detalle";
  }
}

function canShowEdit(role?: Role): boolean {
  return !role || role === "pagos";
}

/** Panel compacto para Inicio (Administración / Recepción / Contabilidad). */
export function PagosDirectExpensesPanel({
  expenses,
  role,
}: {
  expenses: DirectExpenseDto[];
  role?: Role;
}) {
  const pending = expenses.filter((e) =>
    role === "recepcion" || role === "contabilidad" ? INVOICE_FOCUS.has(e.status) : PENDING.has(e.status)
  );
  if (pending.length === 0) return null;

  const subtitle =
    role === "recepcion" || role === "contabilidad"
      ? "Sin OC — sube factura y valida el expediente"
      : "Sin OC — registra pago, comprobante y factura";

  return (
    <section className="card shrink-0 border-teal-100 p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-base font-bold text-zinc-900 sm:text-lg">Gastos directos (Proceso B)</h2>
          <p className="text-xs text-zinc-500">{subtitle}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-teal-100 px-3 py-1 text-xs font-semibold text-teal-800">
            {pending.length} pendiente{pending.length === 1 ? "" : "s"}
          </span>
          <Link href="/pagos#proceso-b" className="text-xs font-semibold text-teal-700 hover:underline">
            Ver en Pagos →
          </Link>
        </div>
      </div>
      <ul className="mt-3 divide-y divide-teal-50">
        {pending.slice(0, 6).map((e) => (
          <li key={e.id} className="flex flex-wrap items-center justify-between gap-2 py-3 first:pt-0">
            <Link href={`/solicitudes/gasto/${e.id}`} className="min-w-0 flex-1 hover:opacity-90">
              <p className="truncate text-sm font-semibold text-zinc-900">
                {e.category || e.obraName}
                {e.supplierName ? ` · ${e.supplierName}` : ""}
              </p>
              <p className="truncate text-xs text-zinc-600">
                {e.obraName} · {formatMoney(e.estimatedAmount, e.currency)}
                {e.amountPaidSoFar > 0 ? ` · pagado ${formatMoney(e.amountPaidSoFar, e.currency)}` : ""}
              </p>
              <p className="text-xs text-zinc-400">
                {e.createdByName}
                {e.sentAt ? ` · ${formatDateShort(e.sentAt)}` : ""} · {DIRECT_EXPENSE_STATUS_LABEL[e.status]}
              </p>
            </Link>
            <div className="flex shrink-0 flex-wrap gap-1.5">
              <Link
                href={`/solicitudes/gasto/${e.id}`}
                className="btn-primary bg-teal-700 text-xs hover:bg-teal-800"
              >
                {actionLabel(e.status, role)}
              </Link>
              {canShowEdit(role) && e.status !== "completed" && (
                <Link
                  href={`/solicitudes/gasto/${e.id}?edit=1`}
                  className="rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-50"
                >
                  Editar
                </Link>
              )}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Listado completo para la página Pagos (y detalle de obra). */
export function PagosProcesoBListPanel({
  expenses,
  title = "Gastos directos (Proceso B)",
  subtitle = "Pagos sin orden de compra — mismo módulo, expediente aparte",
  emptyMessage = "No hay gastos directos registrados.",
  role,
}: {
  expenses: DirectExpenseDto[];
  title?: string;
  subtitle?: string;
  emptyMessage?: string;
  role?: Role;
}) {
  const [tab, setTab] = useState<Tab>("pendientes");

  const pending = useMemo(() => expenses.filter((e) => PENDING.has(e.status)), [expenses]);
  const rows = useMemo(
    () => (tab === "pendientes" ? pending : expenses.filter((e) => e.status !== "draft")),
    [tab, pending, expenses]
  );

  return (
    <section id="proceso-b" className="overflow-hidden rounded-2xl border border-teal-200/80 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-teal-100 bg-teal-50/40 px-4 py-3">
        <div>
          <h2 className="text-base font-bold text-zinc-900">{title}</h2>
          <p className="text-xs text-zinc-500">{subtitle}</p>
        </div>
        <span className="rounded-full bg-teal-100 px-3 py-1 text-xs font-semibold text-teal-800">
          {pending.length} pendiente{pending.length === 1 ? "" : "s"}
        </span>
      </div>

      <div className="flex gap-1 border-b border-zinc-100 px-3 pt-2">
        {(
          [
            { key: "pendientes" as const, label: `Pendientes (${pending.length})` },
            { key: "todos" as const, label: `Todos (${expenses.filter((e) => e.status !== "draft").length})` },
          ] as const
        ).map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`rounded-t-lg px-3 py-2 text-xs font-semibold sm:text-sm ${
              tab === t.key ? "bg-teal-100 text-teal-900" : "text-zinc-600 hover:bg-zinc-50"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-zinc-50/80 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
            <tr>
              <th className="px-4 py-2.5">Concepto / Obra</th>
              <th className="px-4 py-2.5">Proveedor</th>
              <th className="px-4 py-2.5 text-right">Total</th>
              <th className="px-4 py-2.5 text-right">Pagado</th>
              <th className="px-4 py-2.5 text-right">Saldo</th>
              <th className="px-4 py-2.5">Estado</th>
              <th className="px-4 py-2.5">Actualizado</th>
              <th className="px-4 py-2.5 text-right">Acción</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-sm text-zinc-500">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              rows.map((e) => (
                <tr key={e.id} className="hover:bg-teal-50/30">
                  <td className="px-4 py-2.5">
                    <Link
                      href={`/solicitudes/gasto/${e.id}`}
                      className="font-semibold text-teal-900 hover:underline"
                    >
                      {e.category || "Gasto directo"}
                    </Link>
                    <Link
                      href={`/obras/${e.obraId}`}
                      className="mt-0.5 block max-w-[12rem] truncate text-xs text-sky-800 hover:underline"
                    >
                      {e.obraName}
                    </Link>
                    <p className="text-[11px] text-zinc-400">{e.createdByName}</p>
                  </td>
                  <td className="max-w-[9rem] truncate px-4 py-2.5 text-zinc-700">{e.supplierName || "—"}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums font-medium">
                    {formatMoney(e.estimatedAmount, e.currency)}
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-emerald-700">
                    {formatMoney(e.amountPaidSoFar, e.currency)}
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-orange-700">
                    {formatMoney(e.amountRemaining, e.currency)}
                  </td>
                  <td className="px-4 py-2.5">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${statusTone(e.status)}`}
                    >
                      {DIRECT_EXPENSE_STATUS_LABEL[e.status]}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-xs tabular-nums text-zinc-600">
                    {formatDateShort(e.updatedAt)}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <div className="inline-flex flex-wrap items-center justify-end gap-1.5">
                      <Link
                        href={`/solicitudes/gasto/${e.id}`}
                        className="inline-flex rounded-lg border border-teal-200 bg-teal-50 px-2.5 py-1.5 text-xs font-semibold text-teal-800 hover:bg-teal-100"
                      >
                        {actionLabel(e.status, role)}
                      </Link>
                      {canShowEdit(role) && e.status !== "completed" && e.status !== "draft" && (
                        <Link
                          href={`/solicitudes/gasto/${e.id}?edit=1`}
                          className="inline-flex rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-50"
                        >
                          Editar
                        </Link>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
