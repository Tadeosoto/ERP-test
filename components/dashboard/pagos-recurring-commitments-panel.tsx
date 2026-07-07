"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useConfirmDelete } from "@/components/ui/confirm-delete-provider";
import { useFeedback } from "@/components/ui/feedback-provider";
import {
  COMMITMENT_FREQUENCY_LABEL,
  COMMITMENT_WORKFLOW_LABEL,
  COMMITMENT_WORKFLOW_TONE,
  relativeDayLabel,
  supplierInitials,
  type CommitmentFrequency,
  type CommitmentWorkflowStatus,
} from "@/lib/domain/recurring-commitments";
import type { RecurringCommitmentDto } from "@/lib/domain/types";
import { formatDateShort } from "@/lib/format";

const PAGE_SIZES = [5, 10, 15] as const;

function CommitmentActionMenu({
  commitment,
  onEdit,
  onDeleted,
}: {
  commitment: RecurringCommitmentDto;
  onEdit: () => void;
  onDeleted: () => void;
}) {
  const { confirmDelete } = useConfirmDelete();
  const { showSuccess, showError } = useFeedback();
  const [open, setOpen] = useState(false);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 });
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!open || !btnRef.current) return;
    const rect = btnRef.current.getBoundingClientRect();
    setMenuPos({ top: rect.bottom + 4, left: rect.right - 160 });
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: MouseEvent) {
      const t = e.target as Node;
      if (menuRef.current?.contains(t) || btnRef.current?.contains(t)) return;
      setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  const deleteCommitment = useCallback(async () => {
    const ok = await confirmDelete({
      title: "Eliminar compromiso",
      message: `Se eliminará el compromiso con ${commitment.supplierName} — ${commitment.concept}.`,
    });
    if (!ok) return;
    try {
      const res = await fetch(`/api/recurring-commitments/${commitment.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "No se pudo eliminar.");
      showSuccess("Compromiso eliminado.");
      onDeleted();
    } catch (e) {
      showError(e instanceof Error ? e.message : "No se pudo eliminar.");
    }
  }, [commitment, confirmDelete, onDeleted, showError, showSuccess]);

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        aria-label="Acciones"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-zinc-200 bg-white text-zinc-600 shadow-sm hover:bg-zinc-50"
      >
        <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
          <circle cx="5" cy="12" r="2" />
          <circle cx="12" cy="12" r="2" />
          <circle cx="19" cy="12" r="2" />
        </svg>
      </button>
      {open &&
        createPortal(
          <div
            ref={menuRef}
            className="fixed z-[200] min-w-[10rem] rounded-xl border border-zinc-200 bg-white py-1 shadow-lg ring-1 ring-black/5"
            style={{ top: menuPos.top, left: menuPos.left }}
          >
            <button
              type="button"
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-zinc-800 hover:bg-orange-50"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                setOpen(false);
                onEdit();
              }}
            >
              Editar
            </button>
            <button
              type="button"
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-red-700 hover:bg-red-50"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                setOpen(false);
                void deleteCommitment();
              }}
            >
              Eliminar
            </button>
          </div>,
          document.body
        )}
    </>
  );
}

export function PagosRecurringCommitmentsPanel({
  commitments,
  onNew,
  onEdit,
  onMutated,
}: {
  commitments: RecurringCommitmentDto[];
  onNew: () => void;
  onEdit: (c: RecurringCommitmentDto) => void;
  onMutated: () => void;
}) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<(typeof PAGE_SIZES)[number]>(15);

  const totalPages = Math.max(1, Math.ceil(commitments.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageStart = (safePage - 1) * pageSize;
  const pageItems = commitments.slice(pageStart, pageStart + pageSize);

  const th =
    "px-2 py-2 text-[10px] font-semibold uppercase tracking-wide text-zinc-500 whitespace-nowrap";

  return (
    <section className="card flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="shrink-0 border-b border-orange-50 px-3 py-3 sm:px-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-zinc-900 sm:text-lg">Compromisos recurrentes</h2>
              <button
                type="button"
                title="Servicios y gastos que se repiten periódicamente"
                className="text-zinc-400 hover:text-zinc-600"
                aria-label="Información"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M12 18a6 6 0 100-12 6 6 0 000 12z" />
                </svg>
              </button>
            </div>
            <p className="mt-0.5 text-[11px] text-zinc-500">Servicios y gastos recurrentes programados.</p>
          </div>
          <button type="button" onClick={onNew} className="shrink-0 text-sm font-semibold text-sky-700 hover:underline">
            + Nuevo compromiso
          </button>
        </div>
      </div>

      <div className="hidden min-h-0 flex-1 overflow-auto lg:block">
        <table className="w-full table-fixed border-collapse text-left">
          <colgroup>
            <col className="w-[28%]" />
            <col className="w-[11%]" />
            <col className="w-[16%]" />
            <col className="w-[14%]" />
            <col className="w-[14%]" />
            <col className="w-[9%]" />
          </colgroup>
          <thead className="sticky top-0 z-10 bg-orange-50/95 backdrop-blur-sm">
            <tr className="border-b border-orange-100">
              <th className={th}>Proveedor / Concepto</th>
              <th className={th}>Frecuencia</th>
              <th className={th}>Próx. recepción</th>
              <th className={th}>Vence</th>
              <th className={th}>Estado</th>
              <th className={`${th} text-right`}>Acción</th>
            </tr>
          </thead>
          <tbody>
            {pageItems.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-sm text-zinc-500">
                  No hay compromisos registrados. Crea el primero con «+ Nuevo compromiso».
                </td>
              </tr>
            ) : (
              pageItems.map((c, i) => {
                const wf = c.workflowStatus as CommitmentWorkflowStatus;
                return (
                  <tr
                    key={c.id}
                    className={`border-b border-orange-50/80 ${i % 2 === 1 ? "bg-zinc-50/40" : "bg-white"}`}
                  >
                    <td className="max-w-0 px-2 py-2.5 align-middle">
                      <div className="flex min-w-0 items-center gap-2">
                        <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sky-100 text-xs font-bold text-sky-800">
                          {supplierInitials(c.supplierName)}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-zinc-900">{c.supplierName}</p>
                          <p className="truncate text-xs text-zinc-500">{c.concept}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-2 py-2.5 text-xs text-zinc-700">
                      {COMMITMENT_FREQUENCY_LABEL[c.frequency as CommitmentFrequency] ?? c.frequency}
                    </td>
                    <td className="px-2 py-2.5 text-xs">
                      <p className="font-medium tabular-nums text-zinc-800">
                        {formatDateShort(c.nextReceptionDate)}
                      </p>
                      <p className="text-[11px] text-zinc-500">{relativeDayLabel(c.nextReceptionDate)}</p>
                    </td>
                    <td className="px-2 py-2.5 text-xs">
                      <p className="font-medium tabular-nums text-zinc-800">{formatDateShort(c.dueDate)}</p>
                      <p className="text-[11px] text-zinc-500">{relativeDayLabel(c.dueDate)}</p>
                    </td>
                    <td className="px-2 py-2.5">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ring-inset ${COMMITMENT_WORKFLOW_TONE[wf] ?? COMMITMENT_WORKFLOW_TONE.pending}`}
                      >
                        {COMMITMENT_WORKFLOW_LABEL[wf] ?? c.workflowStatus}
                      </span>
                    </td>
                    <td className="px-2 py-2.5 text-right">
                      <CommitmentActionMenu
                        commitment={c}
                        onEdit={() => onEdit(c)}
                        onDeleted={onMutated}
                      />
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="divide-y divide-orange-50 lg:hidden">
        {pageItems.map((c) => {
          const wf = c.workflowStatus as CommitmentWorkflowStatus;
          return (
            <div key={c.id} className="flex items-start justify-between gap-2 px-3 py-3">
              <div className="min-w-0">
                <p className="font-semibold text-zinc-900">{c.supplierName}</p>
                <p className="text-xs text-zinc-500">{c.concept}</p>
                <p className="mt-1 text-xs text-zinc-600">
                  Próx. {formatDateShort(c.nextReceptionDate)} · Vence {formatDateShort(c.dueDate)}
                </p>
                <span
                  className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ring-inset ${COMMITMENT_WORKFLOW_TONE[wf]}`}
                >
                  {COMMITMENT_WORKFLOW_LABEL[wf]}
                </span>
              </div>
              <CommitmentActionMenu commitment={c} onEdit={() => onEdit(c)} onDeleted={onMutated} />
            </div>
          );
        })}
      </div>

      <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 border-t border-orange-50 px-3 py-2">
        <p className="mr-auto text-xs text-zinc-500">
          {commitments.length === 0
            ? "0 compromisos"
            : `${pageStart + 1}–${Math.min(pageStart + pageSize, commitments.length)} de ${commitments.length}`}
        </p>
        <select
          value={pageSize}
          onChange={(e) => {
            setPageSize(Number(e.target.value) as (typeof PAGE_SIZES)[number]);
            setPage(1);
          }}
          className="h-8 rounded-lg border border-orange-100 bg-white px-2 text-xs"
        >
          {PAGE_SIZES.map((n) => (
            <option key={n} value={n}>
              {n} / pág.
            </option>
          ))}
        </select>
        <button
          type="button"
          disabled={safePage <= 1}
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          className="h-8 min-w-8 rounded-lg border border-orange-100 px-2 text-xs disabled:opacity-40"
        >
          ‹
        </button>
        <span className="min-w-10 text-center text-xs tabular-nums">
          {safePage}/{totalPages}
        </span>
        <button
          type="button"
          disabled={safePage >= totalPages}
          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          className="h-8 min-w-8 rounded-lg border border-orange-100 px-2 text-xs disabled:opacity-40"
        >
          ›
        </button>
      </div>
    </section>
  );
}
