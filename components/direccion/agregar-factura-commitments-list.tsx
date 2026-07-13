"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useSession } from "@/components/session-provider";
import { useConfirmDelete } from "@/components/ui/confirm-delete-provider";
import { useFeedback } from "@/components/ui/feedback-provider";
import {
  AGREGAR_FACTURA_KPI_META,
  commitmentDisplayStatus,
  commitmentStatusTone,
  filterAgregarFacturaKpi,
  type AgregarFacturaKpiKey,
} from "@/lib/dashboard/direccion-proceso-c-dashboard";
import {
  canDeleteInvoiceFirstCommitment,
  canEditInvoiceFirstCommitment,
} from "@/lib/domain/proceso-c";
import type { InvoiceFirstCommitmentDto } from "@/lib/domain/types";
import { formatDateShort, formatMoney } from "@/lib/format";

const actionBtn =
  "inline-flex rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 disabled:opacity-40";
const dangerBtn =
  "inline-flex rounded-lg border border-red-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-40";

function RowActions({
  commitment,
  onMutated,
}: {
  commitment: InvoiceFirstCommitmentDto;
  onMutated?: () => void;
}) {
  const { user } = useSession();
  const { confirmDelete } = useConfirmDelete();
  const { showSuccess, showError } = useFeedback();
  const [busy, setBusy] = useState(false);
  const role = user?.role;
  const canEdit = role ? canEditInvoiceFirstCommitment(role) : false;
  const canDelete = role
    ? canDeleteInvoiceFirstCommitment(
        role,
        commitment.status,
        Boolean(commitment.purchaseOrderId),
        commitment.amountPaidSoFar
      )
    : false;

  return (
    <div className="inline-flex flex-wrap items-center justify-end gap-1.5">
      <Link href={`/compromisos-c/${commitment.id}`} className={actionBtn}>
        Ver
      </Link>
      {canEdit && (
        <Link href={`/compromisos-c/${commitment.id}?edit=1`} className={actionBtn}>
          Editar
        </Link>
      )}
      {canDelete && (
        <button
          type="button"
          disabled={busy}
          className={dangerBtn}
          onClick={async () => {
            const ok = await confirmDelete({
              title: "¿Eliminar factura?",
              message: `Se eliminará «${commitment.invoiceFolio}» (${commitment.supplierName}). Si tiene OC sin pagos, también se eliminará.`,
              confirmLabel: "Eliminar",
            });
            if (!ok) return;
            setBusy(true);
            try {
              const res = await fetch(`/api/invoice-first-commitments/${commitment.id}`, {
                method: "DELETE",
                credentials: "include",
              });
              const data = (await res.json().catch(() => ({}))) as { error?: string };
              if (!res.ok) {
                showError(data.error ?? "No se pudo eliminar la factura.");
                return;
              }
              showSuccess("Factura eliminada.");
              onMutated?.();
            } finally {
              setBusy(false);
            }
          }}
        >
          Eliminar
        </button>
      )}
    </div>
  );
}

export function AgregarFacturaCommitmentsList({
  kpiKey,
  commitments,
  onClose,
  onMutated,
}: {
  kpiKey: AgregarFacturaKpiKey;
  commitments: InvoiceFirstCommitmentDto[];
  onClose: () => void;
  onMutated?: () => void;
}) {
  const meta = AGREGAR_FACTURA_KPI_META[kpiKey];
  const rows = useMemo(() => filterAgregarFacturaKpi(commitments, kpiKey), [commitments, kpiKey]);

  return (
    <section
      id="agregar-factura-lista"
      className="scroll-mt-4 rounded-2xl border border-zinc-200 bg-white shadow-sm"
      aria-label={meta.title}
    >
      <div className="flex flex-col gap-2 border-b border-zinc-100 px-4 py-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-base font-bold text-zinc-900">{meta.title}</h2>
          <p className="mt-0.5 text-xs text-zinc-600">{meta.description}</p>
          <p className="mt-1 text-xs font-semibold text-violet-800">
            {rows.length} registro{rows.length === 1 ? "" : "s"}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-50"
        >
          Cerrar listado
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-zinc-50/80 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
            <tr>
              <th className="px-4 py-2.5">Factura</th>
              <th className="px-4 py-2.5">Proveedor</th>
              <th className="px-4 py-2.5">Obra</th>
              <th className="px-4 py-2.5 text-right">Monto</th>
              <th className="px-4 py-2.5">Estado</th>
              <th className="px-4 py-2.5">Registrada</th>
              <th className="px-4 py-2.5 text-right">Acción</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-sm text-zinc-500">
                  {meta.empty}
                </td>
              </tr>
            ) : (
              rows.map((c) => (
                <tr key={c.id} className="hover:bg-violet-50/30">
                  <td className="px-4 py-2.5 font-semibold text-violet-900">{c.invoiceFolio}</td>
                  <td className="max-w-[9rem] truncate px-4 py-2.5 text-zinc-700">{c.supplierName}</td>
                  <td className="max-w-[9rem] truncate px-4 py-2.5 text-sky-800">{c.obraName ?? "—"}</td>
                  <td className="px-4 py-2.5 text-right font-semibold tabular-nums">
                    {formatMoney(c.displayTotal, c.currency)}
                  </td>
                  <td className="px-4 py-2.5">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${commitmentStatusTone(c)}`}
                    >
                      {commitmentDisplayStatus(c)}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 tabular-nums text-zinc-600">
                    {formatDateShort(c.createdAt)}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <RowActions commitment={c} onMutated={onMutated} />
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
