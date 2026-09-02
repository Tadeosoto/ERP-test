"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { PagosRecurringCommitmentsPanel } from "@/components/dashboard/pagos-recurring-commitments-panel";
import { CompromisoRecurrenteModal } from "@/components/pagos/compromiso-recurrente-modal";
import { useSession } from "@/components/session-provider";
import { LoadingScreen } from "@/components/ui/loading-screen";
import {
  daysUntil,
  type CommitmentWorkflowStatus,
} from "@/lib/domain/recurring-commitments";
import { canManageRecurringCommitments } from "@/lib/domain/transitions";
import type { RecurringCommitmentDto, SupplierDto } from "@/lib/domain/types";
import { formatMoney } from "@/lib/format";

type FilterKey = "todos" | "pending" | "awaiting_invoice" | "paid" | "due_soon";

function FilterChip({
  active,
  label,
  count,
  onClick,
}: {
  active: boolean;
  label: string;
  count: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm transition ${
        active
          ? "border-orange-300 bg-orange-50 font-semibold text-orange-950"
          : "border-zinc-200 bg-white font-medium text-zinc-600 hover:bg-zinc-50"
      }`}
    >
      {label}
      <span
        className={`rounded-md px-1.5 py-0.5 text-xs tabular-nums ${
          active ? "bg-orange-100 text-orange-900" : "bg-zinc-100 text-zinc-600"
        }`}
      >
        {count}
      </span>
    </button>
  );
}

export function CompromisosRecurrentesView({
  onRegisterRefresh,
}: {
  onRegisterRefresh?: (fn: () => void) => void;
}) {
  const { user } = useSession();
  const [commitments, setCommitments] = useState<RecurringCommitmentDto[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterKey>("todos");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<RecurringCommitmentDto | null>(null);

  const canManage = Boolean(user && canManageRecurringCommitments(user.role));

  const load = useCallback(async () => {
    const [comRes, supRes] = await Promise.all([
      fetch("/api/recurring-commitments", { credentials: "include" }),
      fetch("/api/suppliers", { credentials: "include" }),
    ]);
    if (comRes.ok) {
      const d = (await comRes.json()) as { commitments: RecurringCommitmentDto[] };
      setCommitments(d.commitments);
    }
    if (supRes.ok) {
      const d = (await supRes.json()) as { suppliers: SupplierDto[] };
      setSuppliers(d.suppliers);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
    onRegisterRefresh?.(() => void load());
  }, [load, onRegisterRefresh]);

  const counts = useMemo(() => {
    let pending = 0;
    let awaiting = 0;
    let paid = 0;
    let dueSoon = 0;
    let estimated = 0;
    for (const c of commitments) {
      const wf = c.workflowStatus as CommitmentWorkflowStatus;
      if (wf === "pending") pending += 1;
      else if (wf === "awaiting_invoice") awaiting += 1;
      else if (wf === "paid") paid += 1;
      const days = daysUntil(c.dueDate);
      if (wf !== "paid" && days <= 7) dueSoon += 1;
      if (c.estimatedAmount != null) estimated += c.estimatedAmount;
    }
    return {
      total: commitments.length,
      pending,
      awaiting,
      paid,
      dueSoon,
      estimated,
      currency: commitments[0]?.currency ?? "MXN",
    };
  }, [commitments]);

  const filtered = useMemo(() => {
    if (filter === "todos") return commitments;
    if (filter === "due_soon") {
      return commitments.filter((c) => {
        if (c.workflowStatus === "paid") return false;
        return daysUntil(c.dueDate) <= 7;
      });
    }
    return commitments.filter((c) => c.workflowStatus === filter);
  }, [commitments, filter]);

  function openNew() {
    setEditing(null);
    setModalOpen(true);
  }

  function openEdit(c: RecurringCommitmentDto) {
    setEditing(c);
    setModalOpen(true);
  }

  if (loading) return <LoadingScreen message="Cargando compromisos" />;

  return (
    <div className="flex min-h-0 flex-col gap-5 lg:gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="dash-page-title">Compromisos recurrentes</h1>
          <p className="dash-body mt-1 text-zinc-600">
            Servicios y gastos que se repiten (luz, renta, etc.). Alta, seguimiento y vencimientos.
          </p>
        </div>
        {canManage && (
          <button type="button" className="btn-primary !min-h-10 !px-4 !text-sm" onClick={openNew}>
            + Nuevo compromiso
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="dash-panel border-l-4 border-l-sky-500 px-4 py-3">
          <p className="dash-label text-zinc-500">Activos</p>
          <p className="dash-metric mt-1 text-zinc-900">{counts.total}</p>
          <p className="dash-caption mt-1 text-zinc-500">Compromisos vigentes</p>
        </div>
        <div className="dash-panel border-l-4 border-l-amber-500 px-4 py-3">
          <p className="dash-label text-zinc-500">Pendientes / factura</p>
          <p className="dash-metric mt-1 text-zinc-900">
            {counts.pending + counts.awaiting}
          </p>
          <p className="dash-caption mt-1 text-zinc-500">
            {counts.pending} pend. · {counts.awaiting} esperando factura
          </p>
        </div>
        <div className="dash-panel border-l-4 border-l-orange-500 px-4 py-3">
          <p className="dash-label text-zinc-500">Vencen en 7 días</p>
          <p className="dash-metric mt-1 text-zinc-900">{counts.dueSoon}</p>
          <p className="dash-caption mt-1 text-zinc-500">Incluye vencidos sin pagar</p>
        </div>
        <div className="dash-panel border-l-4 border-l-violet-500 px-4 py-3">
          <p className="dash-label text-zinc-500">Monto estimado</p>
          <p className="dash-metric mt-1 text-zinc-900">
            {formatMoney(counts.estimated, counts.currency)}
          </p>
          <p className="dash-caption mt-1 text-zinc-500">Suma de montos capturados</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <FilterChip
          active={filter === "todos"}
          label="Todos"
          count={counts.total}
          onClick={() => setFilter("todos")}
        />
        <FilterChip
          active={filter === "pending"}
          label="Pendientes"
          count={counts.pending}
          onClick={() => setFilter("pending")}
        />
        <FilterChip
          active={filter === "awaiting_invoice"}
          label="Esperando factura"
          count={counts.awaiting}
          onClick={() => setFilter("awaiting_invoice")}
        />
        <FilterChip
          active={filter === "due_soon"}
          label="Vencen pronto"
          count={counts.dueSoon}
          onClick={() => setFilter("due_soon")}
        />
        <FilterChip
          active={filter === "paid"}
          label="Pagados"
          count={counts.paid}
          onClick={() => setFilter("paid")}
        />
      </div>

      <PagosRecurringCommitmentsPanel
        commitments={filtered}
        onNew={openNew}
        onEdit={openEdit}
        onMutated={() => void load()}
        variant="page"
        canManage={canManage}
        hideChrome
      />

      {canManage && (
        <CompromisoRecurrenteModal
          open={modalOpen}
          onClose={() => {
            setModalOpen(false);
            setEditing(null);
          }}
          onSaved={() => void load()}
          suppliers={suppliers}
          editing={editing}
        />
      )}
    </div>
  );
}
