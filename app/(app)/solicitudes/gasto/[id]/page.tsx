"use client";

import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { FilePickButton } from "@/components/file-pick-button";
import { LoadingScreen } from "@/components/ui/loading-screen";
import { useFeedback } from "@/components/ui/feedback-provider";
import { useSession } from "@/components/session-provider";
import {
  DIRECT_EXPENSE_STATUS_LABEL,
  canActOnDirectExpense,
  canCorrectDirectExpense,
  canResolveDirectExpenseDifference,
  canValidateDirectExpense,
  describeDirectExpenseGate,
  directExpensePendingRoles,
} from "@/lib/domain/solicitudes";
import type { DirectExpenseDto, ObraDto } from "@/lib/domain/types";
import { ROLE_LABEL } from "@/lib/domain/labels";
import {
  formatAmountInput,
  formatDateShort,
  formatMoney,
  parseAmountInput,
  sanitizeAmountInput,
} from "@/lib/format";

function DirectExpenseDetailInner() {
  const { id } = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const { user } = useSession();
  const router = useRouter();
  const { showSuccess, showError } = useFeedback();
  const [expense, setExpense] = useState<DirectExpenseDto | null>(null);
  const [obras, setObras] = useState<ObraDto[]>([]);
  const [busy, setBusy] = useState(false);
  const [payAmount, setPayAmount] = useState("");
  const [payReference, setPayReference] = useState("");
  const [expectInvoice, setExpectInvoice] = useState(true);
  const [editing, setEditing] = useState(searchParams.get("edit") === "1");
  const [editForm, setEditForm] = useState({
    obraId: "",
    category: "",
    supplierName: "",
    costCenter: "",
    estimatedAmount: "",
    amountPaidSoFar: "",
    justification: "",
  });

  const load = useCallback(async () => {
    const [res, oRes] = await Promise.all([
      fetch(`/api/direct-expenses/${id}`, { credentials: "include" }),
      fetch("/api/obras", { credentials: "include" }),
    ]);
    if (res.ok) {
      const d = (await res.json()) as { expense: DirectExpenseDto };
      setExpense(d.expense);
      const remaining =
        d.expense.amountRemaining > 0 ? d.expense.amountRemaining : d.expense.estimatedAmount;
      if (remaining > 0) setPayAmount(formatAmountInput(remaining));
      setEditForm({
        obraId: d.expense.obraId,
        category: d.expense.category,
        supplierName: d.expense.supplierName,
        costCenter: d.expense.costCenter,
        estimatedAmount: formatAmountInput(d.expense.estimatedAmount),
        amountPaidSoFar: formatAmountInput(d.expense.amountPaidSoFar),
        justification: d.expense.justification,
      });
    }
    if (oRes.ok) {
      const d = (await oRes.json()) as { obras: ObraDto[] };
      setObras(d.obras.filter((o) => o.active));
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (searchParams.get("edit") === "1") setEditing(true);
  }, [searchParams]);

  const comprobantes = useMemo(
    () => expense?.files.filter((f) => f.kind === "comprobante_pago") ?? [],
    [expense]
  );
  const facturas = useMemo(
    () => expense?.files.filter((f) => f.kind === "factura") ?? [],
    [expense]
  );

  if (!expense) return <LoadingScreen message="Cargando gasto directo" />;

  const pendingRoles = directExpensePendingRoles(expense.status);
  const canAct = user ? canActOnDirectExpense(expense.status, user.role) : false;
  const canCorrect = user ? canCorrectDirectExpense(expense.status, user.role) : false;
  const isPagos = user?.role === "pagos";
  const needsPayment = expense.status === "sent";
  const paymentDone = expense.status === "paid" || expense.amountPaidSoFar > 0.01;
  const canMarkAwaiting = isPagos && expense.status === "paid";
  const canUploadComprobante =
    isPagos && (expense.status === "sent" || expense.status === "paid" || expense.status === "awaiting_invoice");
  const canUploadFactura =
    ["pagos", "recepcion", "contabilidad"].includes(user?.role ?? "") &&
    (expense.status === "paid" || expense.status === "awaiting_invoice");

  async function postAction(body: Record<string, unknown>, successMsg?: string) {
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
      showSuccess(successMsg ?? "Acción registrada.");
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
      showSuccess(
        kind === "comprobante_pago"
          ? "Comprobante bancario subido. La factura del proveedor es otro documento."
          : "Factura del proveedor subida."
      );
    } catch (e) {
      showError(e instanceof Error ? e.message : "Error.");
    } finally {
      setBusy(false);
    }
  }

  async function saveCorrection(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await fetch(`/api/direct-expenses/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          obraId: editForm.obraId,
          category: editForm.category,
          supplierName: editForm.supplierName,
          costCenter: editForm.costCenter,
          estimatedAmount: parseAmountInput(editForm.estimatedAmount),
          amountPaidSoFar: parseAmountInput(editForm.amountPaidSoFar),
          justification: editForm.justification,
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "No se pudo guardar.");
      await load();
      setEditing(false);
      router.replace(`/solicitudes/gasto/${id}`);
      showSuccess("Corrección guardada.");
    } catch (err) {
      showError(err instanceof Error ? err.message : "Error.");
    } finally {
      setBusy(false);
    }
  }

  async function reopenToPaid() {
    setBusy(true);
    try {
      const res = await fetch(`/api/direct-expenses/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ reopenToPaid: true }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "No se pudo revertir.");
      await load();
      showSuccess("Volvió a estado Pagada. Puedes corregir o marcar de nuevo esperando factura.");
    } catch (err) {
      showError(err instanceof Error ? err.message : "Error.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase text-teal-600">Proceso B · Gasto directo</p>
          <h1 className="text-2xl font-bold text-zinc-900">{expense.category || expense.obraName}</h1>
          <p className="mt-1 text-sm text-zinc-500">
            {expense.obraName} · {DIRECT_EXPENSE_STATUS_LABEL[expense.status]}
          </p>
        </div>
        {canCorrect && !editing && (
          <button
            type="button"
            className="btn-secondary text-sm"
            onClick={() => {
              setEditing(true);
              router.replace(`/solicitudes/gasto/${id}?edit=1`);
            }}
          >
            Corregir datos
          </button>
        )}
      </header>

      <section className="card border-teal-100 bg-teal-50/30 p-4">
        <p className="text-sm font-medium text-zinc-900">{describeDirectExpenseGate(expense.status)}</p>
        {pendingRoles.length > 0 && (
          <p className="mt-1 text-sm text-zinc-600">
            Le toca a {pendingRoles.map((r) => ROLE_LABEL[r]).join(" / ")}.
          </p>
        )}
      </section>

      {editing && canCorrect ? (
        <form onSubmit={(ev) => void saveCorrection(ev)} className="card space-y-4 border-amber-200 p-5">
          <div>
            <h2 className="font-bold text-zinc-900">Corregir gasto</h2>
            <p className="mt-0.5 text-xs text-zinc-500">
              Usa esto si hubo un error en proveedor, montos, obra o concepto. El expediente no debe estar cerrado.
            </p>
          </div>
          <label className="block text-sm">
            <span className="font-medium text-zinc-700">Obra</span>
            <select
              className="mt-1 w-full rounded-xl border px-3 py-2"
              value={editForm.obraId}
              onChange={(ev) => setEditForm((f) => ({ ...f, obraId: ev.target.value }))}
              required
            >
              {obras.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </select>
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="font-medium text-zinc-700">Concepto / categoría</span>
              <input
                className="mt-1 w-full rounded-xl border px-3 py-2"
                value={editForm.category}
                onChange={(ev) => setEditForm((f) => ({ ...f, category: ev.target.value }))}
              />
            </label>
            <label className="block text-sm">
              <span className="font-medium text-zinc-700">Proveedor</span>
              <input
                className="mt-1 w-full rounded-xl border px-3 py-2"
                value={editForm.supplierName}
                onChange={(ev) => setEditForm((f) => ({ ...f, supplierName: ev.target.value }))}
                placeholder="Nombre del proveedor"
              />
            </label>
            <label className="block text-sm">
              <span className="font-medium text-zinc-700">Monto total</span>
              <input
                className="mt-1 w-full rounded-xl border px-3 py-2 tabular-nums"
                inputMode="decimal"
                value={editForm.estimatedAmount}
                onChange={(ev) =>
                  setEditForm((f) => ({ ...f, estimatedAmount: sanitizeAmountInput(ev.target.value) }))
                }
              />
            </label>
            <label className="block text-sm">
              <span className="font-medium text-zinc-700">Monto pagado</span>
              <input
                className="mt-1 w-full rounded-xl border px-3 py-2 tabular-nums"
                inputMode="decimal"
                value={editForm.amountPaidSoFar}
                onChange={(ev) =>
                  setEditForm((f) => ({ ...f, amountPaidSoFar: sanitizeAmountInput(ev.target.value) }))
                }
              />
            </label>
            <label className="block text-sm sm:col-span-2">
              <span className="font-medium text-zinc-700">Centro de costo</span>
              <input
                className="mt-1 w-full rounded-xl border px-3 py-2"
                value={editForm.costCenter}
                onChange={(ev) => setEditForm((f) => ({ ...f, costCenter: ev.target.value }))}
              />
            </label>
            <label className="block text-sm sm:col-span-2">
              <span className="font-medium text-zinc-700">Justificación</span>
              <textarea
                className="mt-1 w-full rounded-xl border px-3 py-2"
                rows={3}
                value={editForm.justification}
                onChange={(ev) => setEditForm((f) => ({ ...f, justification: ev.target.value }))}
              />
            </label>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="submit" disabled={busy} className="btn-primary">
              Guardar corrección
            </button>
            <button
              type="button"
              disabled={busy}
              className="btn-secondary"
              onClick={() => {
                setEditing(false);
                router.replace(`/solicitudes/gasto/${id}`);
              }}
            >
              Cancelar
            </button>
            {expense.status === "awaiting_invoice" && (
              <button type="button" disabled={busy} className="btn-ghost text-violet-800" onClick={() => void reopenToPaid()}>
                Quitar «Esperando factura»
              </button>
            )}
          </div>
        </form>
      ) : (
        <section className="card space-y-3 p-5 text-sm">
          <p>
            <span className="text-zinc-500">Monto estimado:</span>{" "}
            {formatMoney(expense.estimatedAmount, expense.currency)}
          </p>
          <p>
            <span className="text-zinc-500">Pagado:</span>{" "}
            {formatMoney(expense.amountPaidSoFar, expense.currency)}
            {expense.amountRemaining > 0.01 && (
              <span className="text-orange-700">
                {" "}
                · Saldo {formatMoney(expense.amountRemaining, expense.currency)}
              </span>
            )}
          </p>
          <p>
            <span className="text-zinc-500">Proveedor:</span> {expense.supplierName || "—"}
          </p>
          <p>
            <span className="text-zinc-500">CC:</span> {expense.costCenter || "—"}
          </p>
          <p className="whitespace-pre-wrap">{expense.justification}</p>
          {expense.sentAt && (
            <p className="text-xs text-zinc-400">Enviada {formatDateShort(expense.sentAt)}</p>
          )}
        </section>
      )}

      <section className="card p-5">
        <h2 className="text-sm font-bold text-zinc-900">Documentos</h2>
        <p className="mt-1 text-xs text-zinc-500">
          El <strong>comprobante</strong> es el PDF del banco. La <strong>factura</strong> es el PDF/CFDI del
          proveedor.
        </p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-zinc-100 bg-zinc-50/60 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Comprobante de pago</p>
            {comprobantes.length === 0 ? (
              <p className="mt-2 text-xs text-zinc-400">Sin comprobante aún</p>
            ) : (
              <ul className="mt-2 space-y-1">
                {comprobantes.map((f) => (
                  <li key={f.id}>
                    <a
                      href={`/api/solicitud-files/${f.id}?kind=expense`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-medium text-teal-800 hover:underline"
                    >
                      {f.originalFileName}
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="rounded-xl border border-zinc-100 bg-zinc-50/60 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Factura del proveedor</p>
            {facturas.length === 0 ? (
              <p className="mt-2 text-xs text-zinc-400">Sin factura aún</p>
            ) : (
              <ul className="mt-2 space-y-1">
                {facturas.map((f) => (
                  <li key={f.id}>
                    <a
                      href={`/api/solicitud-files/${f.id}?kind=expense`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-medium text-violet-800 hover:underline"
                    >
                      {f.originalFileName}
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </section>

      {canAct && expense.status !== "completed" && !editing && (
        <section className="card space-y-5 border-dashed border-orange-200 p-5">
          <h2 className="font-bold text-zinc-900">Tu tarea</h2>

          {needsPayment && isPagos && (
            <div className="space-y-3 rounded-xl border border-orange-100 bg-orange-50/40 p-4">
              <div>
                <h3 className="text-sm font-semibold text-zinc-900">1. Registrar pago</h3>
                <p className="mt-0.5 text-xs text-zinc-600">
                  Captura el monto transferido. Cuando el saldo quede en cero, el gasto pasa a «Pagada».
                </p>
              </div>
              <input
                value={payAmount}
                onChange={(e) => setPayAmount(sanitizeAmountInput(e.target.value))}
                onBlur={() =>
                  setPayAmount((v) => {
                    const n = parseAmountInput(v);
                    return n > 0 ? formatAmountInput(n) : v.trim();
                  })
                }
                placeholder="Monto del pago"
                inputMode="decimal"
                className="w-full rounded-xl border px-3 py-2 tabular-nums"
              />
              <input
                value={payReference}
                onChange={(e) => setPayReference(e.target.value)}
                placeholder="Referencia bancaria"
                className="w-full rounded-xl border px-3 py-2"
              />
              <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-violet-200 bg-violet-50/60 px-3 py-2.5">
                <span className="relative mt-0.5 inline-flex h-5 w-5 shrink-0">
                  <input
                    type="checkbox"
                    checked={expectInvoice}
                    onChange={(e) => setExpectInvoice(e.target.checked)}
                    className="peer absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
                    aria-label="Se espera factura del proveedor"
                  />
                  <span
                    className={`flex h-5 w-5 items-center justify-center rounded-md border-2 transition ${
                      expectInvoice
                        ? "border-violet-700 bg-violet-700 text-white"
                        : "border-violet-300 bg-white text-transparent"
                    }`}
                    aria-hidden
                  >
                    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M3.5 8.5 6.5 11.5 12.5 4.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-violet-950">
                    Se espera factura del proveedor
                  </span>
                  <span className="mt-0.5 block text-xs text-violet-900/75">
                    Si el pago salda el gasto, pasará a «Esperando factura» sin un paso extra. Desmárcalo si no
                    habrá factura.
                  </span>
                </span>
              </label>
              <button
                type="button"
                disabled={busy}
                className="btn-primary"
                onClick={() =>
                  void postAction(
                    {
                      action: "register_payment",
                      amount: parseAmountInput(payAmount),
                      reference: payReference,
                      expectInvoice,
                    },
                    expectInvoice
                      ? "Pago registrado. Si saldó el gasto, quedó en «Esperando factura»."
                      : "Pago registrado."
                  )
                }
              >
                Registrar pago
              </button>
            </div>
          )}

          {canUploadComprobante && (
            <div className="space-y-3 rounded-xl border border-sky-100 bg-sky-50/40 p-4">
              <div>
                <h3 className="text-sm font-semibold text-zinc-900">
                  {needsPayment ? "2. " : ""}Subir comprobante bancario
                </h3>
                <p className="mt-0.5 text-xs text-zinc-600">
                  PDF del banco. <strong>No es la factura del proveedor.</strong>
                </p>
              </div>
              <FilePickButton
                disabled={busy}
                label={comprobantes.length > 0 ? "Subir otro comprobante" : "Subir comprobante de pago"}
                hint="PDF del banco"
                onPick={(f) => void uploadFile("comprobante_pago", f)}
              />
            </div>
          )}

          {canMarkAwaiting && (
            <div className="space-y-3 rounded-xl border border-violet-200 bg-violet-50/50 p-4">
              <div>
                <h3 className="text-sm font-semibold text-violet-950">Marcar espera de factura</h3>
                <p className="mt-0.5 text-xs text-violet-900/80">
                  Solo si al registrar el pago no marcaste «Se espera factura».
                </p>
              </div>
              <button
                type="button"
                disabled={busy}
                className="btn-primary bg-violet-700 hover:bg-violet-800"
                onClick={() =>
                  void postAction(
                    { action: "mark_awaiting_invoice" },
                    "Marcado como esperando factura."
                  )
                }
              >
                Marcar «Esperando factura»
              </button>
            </div>
          )}

          {canUploadFactura && (
            <div className="space-y-3 rounded-xl border border-emerald-100 bg-emerald-50/40 p-4">
              <div>
                <h3 className="text-sm font-semibold text-zinc-900">
                  {canMarkAwaiting ? "O bien: " : ""}Subir factura del proveedor
                </h3>
                <p className="mt-0.5 text-xs text-zinc-600">PDF/CFDI fiscal del proveedor.</p>
              </div>
              <FilePickButton
                disabled={busy}
                label="Subir factura PDF"
                hint="del proveedor"
                onPick={(f) => void uploadFile("factura", f)}
              />
            </div>
          )}

          {paymentDone && expense.status === "sent" && isPagos && (
            <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900">
              Hay abonos, pero aún hay saldo ({formatMoney(expense.amountRemaining, expense.currency)}).
              Completa el pago o corrige montos con «Corregir datos».
            </p>
          )}

          {user && canValidateDirectExpense(expense.status, user.role) && (
            <div className="flex flex-wrap gap-3 border-t border-zinc-100 pt-4">
              <button
                type="button"
                disabled={busy}
                className="btn-primary"
                onClick={() => void postAction({ action: "accounting_complete" }, "Expediente cerrado.")}
              >
                Validar y cerrar expediente
              </button>
              <button
                type="button"
                disabled={busy}
                className="btn-danger"
                onClick={() =>
                  void postAction({
                    action: "accounting_flag_difference",
                    comment: "Observación contable",
                  })
                }
              >
                Marcar diferencia
              </button>
            </div>
          )}

          {user && canResolveDirectExpenseDifference(expense.status, user.role) && (
            <button
              type="button"
              disabled={busy}
              className="btn-primary"
              onClick={() => void postAction({ action: "accounting_resolve" }, "Diferencia resuelta.")}
            >
              Resolver y cerrar
            </button>
          )}
        </section>
      )}

      <div className="flex flex-wrap gap-3 text-sm">
        <Link href="/pagos#proceso-b" className="text-teal-700 underline">
          Volver a Pagos (Proceso B)
        </Link>
        <Link href="/inicio" className="text-zinc-500 underline">
          Inicio
        </Link>
      </div>
    </div>
  );
}

export default function DirectExpenseDetailPage() {
  return (
    <Suspense fallback={<LoadingScreen message="Cargando gasto directo" />}>
      <DirectExpenseDetailInner />
    </Suspense>
  );
}
