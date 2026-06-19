"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { FilePickButton } from "@/components/file-pick-button";
import { LoadingScreen } from "@/components/ui/loading-screen";
import { useFeedback } from "@/components/ui/feedback-provider";
import { useSession } from "@/components/session-provider";
import {
  DIRECT_EXPENSE_STATUS_LABEL,
  describeDirectExpenseGate,
  directExpensePendingRole,
} from "@/lib/domain/solicitudes";
import type { DirectExpenseDto } from "@/lib/domain/types";
import { ROLE_LABEL } from "@/lib/domain/labels";
import { formatDateShort, formatMoney } from "@/lib/format";

export default function DirectExpenseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useSession();
  const router = useRouter();
  const { showSuccess, showError } = useFeedback();
  const [expense, setExpense] = useState<DirectExpenseDto | null>(null);
  const [busy, setBusy] = useState(false);
  const [payAmount, setPayAmount] = useState("");
  const [payReference, setPayReference] = useState("");

  const load = useCallback(async () => {
    const res = await fetch(`/api/direct-expenses/${id}`, { credentials: "include" });
    if (res.ok) {
      const d = (await res.json()) as { expense: DirectExpenseDto };
      setExpense(d.expense);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!expense) return <LoadingScreen message="Cargando gasto directo" />;

  const pendingRole = directExpensePendingRole(expense.status);
  const canAct = user ? pendingRole === user.role : false;

  async function postAction(body: Record<string, unknown>) {
    setBusy(true);
    try {
      const res = await fetch(`/api/direct-expenses/${id}/actions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Error.");
      await load();
      router.refresh();
      showSuccess("Acción registrada.");
    } catch (e) {
      showError(e instanceof Error ? e.message : "Error.");
    } finally {
      setBusy(false);
    }
  }

  async function uploadFile(kind: string, file: File) {
    setBusy(true);
    try {
      const fd = new FormData();
      fd.set("kind", kind);
      fd.set("file", file);
      const res = await fetch(`/api/direct-expenses/${id}/actions`, {
        method: "PUT",
        credentials: "include",
        body: fd,
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Error al subir.");
      await load();
      showSuccess("Archivo subido.");
    } catch (e) {
      showError(e instanceof Error ? e.message : "Error.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <header>
        <p className="text-xs font-bold uppercase text-teal-600">Proceso B · Gasto directo</p>
        <h1 className="text-2xl font-bold text-zinc-900">{expense.category || expense.obraName}</h1>
        <p className="mt-1 text-sm text-zinc-500">
          {expense.obraName} · {DIRECT_EXPENSE_STATUS_LABEL[expense.status]}
        </p>
      </header>

      <section className="card border-teal-100 bg-teal-50/30 p-4">
        <p className="text-sm font-medium text-zinc-900">{describeDirectExpenseGate(expense.status)}</p>
        {pendingRole && (
          <p className="mt-1 text-sm text-zinc-600">Le toca a {ROLE_LABEL[pendingRole]}.</p>
        )}
      </section>

      <section className="card space-y-3 p-5 text-sm">
        <p><span className="text-zinc-500">Monto estimado:</span> {formatMoney(expense.estimatedAmount, expense.currency)}</p>
        <p><span className="text-zinc-500">Proveedor:</span> {expense.supplierName || "—"}</p>
        <p><span className="text-zinc-500">CC:</span> {expense.costCenter || "—"}</p>
        <p className="whitespace-pre-wrap">{expense.justification}</p>
        {expense.sentAt && <p className="text-xs text-zinc-400">Enviada {formatDateShort(expense.sentAt)}</p>}
      </section>

      {(canAct || user?.role === "contabilidad") && expense.status !== "completed" && (
        <section className="card border-dashed border-orange-200 p-5">
          <h2 className="font-bold text-zinc-900">Tu tarea</h2>

          {user?.role === "pagos" && expense.status === "sent" && (
            <div className="mt-4 space-y-3">
              <input value={payAmount} onChange={(e) => setPayAmount(e.target.value)} placeholder="Monto del pago" className="w-full rounded-xl border px-3 py-2" />
              <input value={payReference} onChange={(e) => setPayReference(e.target.value)} placeholder="Referencia" className="w-full rounded-xl border px-3 py-2" />
              <button type="button" disabled={busy} className="btn-primary" onClick={() => void postAction({ action: "register_payment", amount: Number(payAmount), reference: payReference })}>
                Registrar pago
              </button>
              <FilePickButton disabled={busy} label="Subir comprobante" hint="PDF del banco" onPick={(f) => void uploadFile("comprobante_pago", f)} />
            </div>
          )}

          {user?.role === "pagos" && expense.status === "paid" && (
            <div className="mt-4 space-y-3">
              <button type="button" disabled={busy} className="btn-primary" onClick={() => void postAction({ action: "mark_awaiting_invoice" })}>
                Marcar esperando factura
              </button>
              <FilePickButton disabled={busy} label="Subir factura" hint="PDF del proveedor" onPick={(f) => void uploadFile("factura", f)} />
            </div>
          )}

          {["pagos", "recepcion"].includes(user?.role ?? "") && expense.status === "awaiting_invoice" && (
            <div className="mt-4">
              <FilePickButton disabled={busy} label="Subir factura PDF" hint="del proveedor" onPick={(f) => void uploadFile("factura", f)} />
            </div>
          )}

          {user?.role === "contabilidad" && expense.status === "invoice_received" && (
            <div className="mt-4 flex flex-wrap gap-3">
              <button type="button" disabled={busy} className="btn-primary" onClick={() => void postAction({ action: "accounting_complete" })}>
                Cerrar expediente
              </button>
              <button type="button" disabled={busy} className="btn-danger" onClick={() => void postAction({ action: "accounting_flag_difference", comment: "Observación contable" })}>
                Marcar diferencia
              </button>
            </div>
          )}

          {user?.role === "contabilidad" && expense.status === "difference" && (
            <button type="button" disabled={busy} className="btn-primary mt-4" onClick={() => void postAction({ action: "accounting_resolve" })}>
              Resolver y cerrar
            </button>
          )}
        </section>
      )}

      <Link href="/inicio" className="text-sm text-zinc-500 underline">Volver al inicio</Link>
    </div>
  );
}
