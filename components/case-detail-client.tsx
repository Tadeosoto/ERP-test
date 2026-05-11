"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { CaseTimeline } from "@/components/case-timeline";
import { ProcessFlowDiagram } from "@/components/process-flow-diagram";
import { useSession } from "@/components/session-provider";
import { upsertCase } from "@/lib/data/repository";
import { useCase } from "@/lib/data/use-cases";
import { describeGate, sessionHintForCase } from "@/lib/domain/flow";
import { ROLE_LABEL, STATUS_LABEL } from "@/lib/domain/labels";
import {
  accountingReconcile,
  amountsRoughlyMatch,
  canRoleAdvance,
  engineerApprove,
  getPendingRole,
  receptionCapture,
  registerInvoiceAndSendToReception,
  registerPayment,
  requestInvoice,
} from "@/lib/domain/transitions";
import { formatMoney } from "@/lib/format";

export function CaseDetailClient({ caseId }: { caseId: string }) {
  const { session } = useSession();
  const c = useCase(caseId);
  const [err, setErr] = useState<string | null>(null);

  const pendingRole = c ? getPendingRole(c.status) : null;
  const canAct = c && session ? canRoleAdvance(session.role, c.status) : false;

  const [engComment, setEngComment] = useState("");
  const [payRef, setPayRef] = useState("");
  const [payAmount, setPayAmount] = useState("");
  const [payAt, setPayAt] = useState("");
  const [payReceiptName, setPayReceiptName] = useState("");
  const [invFolio, setInvFolio] = useState("");
  const [invAmount, setInvAmount] = useState("");
  const [invAt, setInvAt] = useState("");
  const [invFileName, setInvFileName] = useState("");
  const [recvNotes, setRecvNotes] = useState("");
  const [accBalanced, setAccBalanced] = useState(true);
  const [accNotes, setAccNotes] = useState("");

  const mismatchWarning = useMemo(() => {
    if (!c?.payment || !c.invoice) return false;
    return !amountsRoughlyMatch(c);
  }, [c]);

  if (!c) {
    return (
      <div className="rounded-3xl border border-orange-100 bg-white p-8 text-center shadow-sm">
        <p className="text-zinc-600">Expediente no encontrado.</p>
        <Link href="/dashboard" className="mt-4 inline-block text-orange-700 underline">
          Volver al panel
        </Link>
      </div>
    );
  }

  const now = () => new Date().toISOString();

  function handleEngineerApprove(e: React.FormEvent) {
    e.preventDefault();
    if (!session || !c) return;
    setErr(null);
    try {
      const next = engineerApprove(c, session.userId, engComment || undefined, now());
      upsertCase(next);
      setEngComment("");
    } catch (er) {
      setErr(er instanceof Error ? er.message : "Error");
    }
  }

  function handlePayment(e: React.FormEvent) {
    e.preventDefault();
    if (!c) return;
    setErr(null);
    const amount = Number.parseFloat(payAmount.replace(",", "."));
    if (Number.isNaN(amount) || amount <= 0) {
      setErr("Importe de pago válido requerido.");
      return;
    }
    const paidAt = payAt ? new Date(payAt).toISOString() : now();
    try {
      const next = registerPayment(
        c,
        {
          reference: payRef,
          amount,
          paidAt,
          receiptFile:
            payReceiptName.trim() ?
              { name: payReceiptName.trim(), sizeBytes: 12000 }
            : undefined,
        },
        now()
      );
      upsertCase(next);
      setPayRef("");
      setPayAmount("");
      setPayAt("");
      setPayReceiptName("");
    } catch (er) {
      setErr(er instanceof Error ? er.message : "Error");
    }
  }

  function handleRequestInvoice() {
    if (!c) return;
    setErr(null);
    try {
      upsertCase(requestInvoice(c, now()));
    } catch (er) {
      setErr(er instanceof Error ? er.message : "Error");
    }
  }

  function handleInvoice(e: React.FormEvent) {
    e.preventDefault();
    if (!c) return;
    setErr(null);
    const amount = Number.parseFloat(invAmount.replace(",", "."));
    if (Number.isNaN(amount) || amount <= 0) {
      setErr("Importe factura válido requerido.");
      return;
    }
    const issuedAt = invAt ? new Date(invAt).toISOString() : now();
    try {
      const next = registerInvoiceAndSendToReception(
        c,
        {
          folio: invFolio,
          amount,
          issuedAt,
          file:
            invFileName.trim() ?
              { name: invFileName.trim(), sizeBytes: 95000 }
            : undefined,
        },
        now()
      );
      upsertCase(next);
      setInvFolio("");
      setInvAmount("");
      setInvAt("");
      setInvFileName("");
    } catch (er) {
      setErr(er instanceof Error ? er.message : "Error");
    }
  }

  function handleReception(e: React.FormEvent) {
    e.preventDefault();
    if (!session || !c) return;
    setErr(null);
    try {
      upsertCase(receptionCapture(c, session.userId, recvNotes, now()));
      setRecvNotes("");
    } catch (er) {
      setErr(er instanceof Error ? er.message : "Error");
    }
  }

  function handleAccounting(e: React.FormEvent) {
    e.preventDefault();
    if (!session || !c) return;
    setErr(null);
    try {
      upsertCase(accountingReconcile(c, session.userId, accBalanced, accNotes, now()));
      setAccNotes("");
    } catch (er) {
      setErr(er instanceof Error ? er.message : "Error");
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href="/dashboard" className="text-sm font-medium text-orange-700 hover:underline">
            ← Panel
          </Link>
          <h1 className="mt-2 text-3xl font-bold text-zinc-900">{c.title}</h1>
          <p className="mt-1 text-sm text-zinc-600">{c.supplierName}</p>
          <span className="mt-3 inline-flex rounded-full bg-orange-100 px-3 py-1 text-xs font-semibold text-orange-900">
            {STATUS_LABEL[c.status]}
          </span>
        </div>
        <div className="rounded-3xl border border-orange-100 bg-white px-5 py-4 text-right shadow-sm">
          <p className="text-xs font-medium text-zinc-500">Importe OC</p>
          <p className="text-2xl font-bold tabular-nums text-orange-700">
            {formatMoney(c.amountOc, c.currency)}
          </p>
        </div>
      </div>

      {session && (
        <div className="rounded-3xl border border-orange-200 bg-gradient-to-br from-white to-orange-50/60 p-5 shadow-sm">
          <p className="text-sm font-medium text-zinc-900">{describeGate(c.status)}</p>
          <p className="mt-2 text-sm leading-relaxed text-zinc-600">
            {sessionHintForCase(session.role, c.status, canAct)}
          </p>
          <Link
            href="/flujo"
            className="mt-3 inline-block text-sm font-semibold text-orange-700 underline underline-offset-2 hover:text-orange-800"
          >
            Ver mapa del proceso con todos los expedientes
          </Link>
        </div>
      )}

      <div className="rounded-3xl border border-orange-100 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-zinc-900">Avance visual en el flujo</h2>
        <p className="mt-1 text-xs text-zinc-500">
          Misma secuencia para todas las compras; aquí ves en qué paso va este expediente.
        </p>
        <div className="mt-4 overflow-x-auto pb-2">
          <ProcessFlowDiagram status={c.status} />
        </div>
      </div>

      {err && (
        <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{err}</p>
      )}

      <div className="grid gap-8 lg:grid-cols-2">
        <div className="rounded-3xl border border-orange-100 bg-white p-6 shadow-sm">
          <h2 className="font-semibold text-zinc-900">Descripción</h2>
          <p className="mt-2 whitespace-pre-wrap text-sm text-zinc-600">{c.description || "—"}</p>
          <dl className="mt-4 grid gap-2 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-zinc-500">Creado</dt>
              <dd className="tabular-nums text-zinc-800">
                {new Date(c.createdAt).toLocaleString("es-MX")}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-zinc-500">Actualizado</dt>
              <dd className="tabular-nums text-zinc-800">
                {new Date(c.updatedAt).toLocaleString("es-MX")}
              </dd>
            </div>
          </dl>
        </div>

        <div className="rounded-3xl border border-orange-100 bg-white p-6 shadow-sm">
          <h2 className="font-semibold text-zinc-900">Flujo</h2>
          <p className="mt-1 text-xs text-zinc-500">
            Pendiente con:{" "}
            <span className="font-medium text-orange-800">
              {pendingRole ? ROLE_LABEL[pendingRole] : "— (cerrado)"}
            </span>
          </p>
          <div className="mt-4">
            <CaseTimeline c={c} />
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-orange-100 bg-white p-6 shadow-sm">
        <h2 className="font-semibold text-zinc-900">Datos del proceso</h2>
        <div className="mt-4 grid gap-4 text-sm sm:grid-cols-2">
          {c.engineerApprovedAt && (
            <div className="rounded-2xl bg-orange-50/80 p-4">
              <p className="font-medium text-orange-900">Ingeniero</p>
              <p className="mt-1 text-zinc-700">{c.engineerComment || "Sin comentarios"}</p>
              <p className="mt-2 text-xs text-zinc-500">
                {new Date(c.engineerApprovedAt).toLocaleString("es-MX")}
              </p>
            </div>
          )}
          {c.payment && (
            <div className="rounded-2xl bg-orange-50/80 p-4">
              <p className="font-medium text-orange-900">Pago</p>
              <p className="mt-1 tabular-nums text-zinc-800">
                {formatMoney(c.payment.amount, c.currency)} · Ref. {c.payment.reference}
              </p>
              {c.payment.receiptFile && (
                <p className="mt-1 text-xs text-zinc-500">{c.payment.receiptFile.name}</p>
              )}
            </div>
          )}
          {c.invoice && (
            <div className="rounded-2xl bg-orange-50/80 p-4">
              <p className="font-medium text-orange-900">Factura</p>
              <p className="mt-1 text-zinc-800">
                Folio {c.invoice.folio} · {formatMoney(c.invoice.amount, c.currency)}
              </p>
              {c.invoice.file && (
                <p className="mt-1 text-xs text-zinc-500">{c.invoice.file.name}</p>
              )}
            </div>
          )}
          {c.receptionCapture && (
            <div className="rounded-2xl bg-orange-50/80 p-4">
              <p className="font-medium text-orange-900">Recepción</p>
              <p className="mt-1 text-zinc-700">{c.receptionCapture.notes}</p>
            </div>
          )}
          {c.accounting && (
            <div className="rounded-2xl bg-orange-50/80 p-4">
              <p className="font-medium text-orange-900">Contabilidad</p>
              <p className="mt-1 text-zinc-700">
                {c.accounting.balanced ? "Cuadra" : "No cuadra"} · {c.accounting.notes}
              </p>
            </div>
          )}
        </div>
      </div>

      {session && (
        <div className="rounded-3xl border-2 border-dashed border-orange-200 bg-orange-50/40 p-6">
          <h2 className="font-semibold text-zinc-900">Tu turno</h2>
          <p className="mt-1 text-sm text-zinc-600">
            Rol: <span className="font-medium">{ROLE_LABEL[session.role]}</span>
            {!canAct && (
              <span className="text-zinc-400">
                {" "}
                — No hay acción disponible para este estado con tu rol.
              </span>
            )}
          </p>

          {canAct && c.status === "pendingEngineer" && session.role === "ingeniero" && (
            <form onSubmit={handleEngineerApprove} className="mt-4 space-y-3">
              <label className="block text-sm font-medium text-zinc-700">Comentario (opcional)</label>
              <textarea
                value={engComment}
                onChange={(e) => setEngComment(e.target.value)}
                rows={2}
                className="w-full rounded-2xl border border-orange-100 bg-white px-4 py-3 text-sm outline-none ring-orange-200 focus:ring-2"
              />
              <button
                type="submit"
                className="rounded-full bg-orange-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-orange-700"
              >
                Dar visto bueno
              </button>
            </form>
          )}

          {canAct && c.status === "approved" && session.role === "pagos" && (
            <form onSubmit={handlePayment} className="mt-4 grid gap-3 sm:max-w-md">
              <input
                required
                placeholder="Referencia bancaria"
                value={payRef}
                onChange={(e) => setPayRef(e.target.value)}
                className="rounded-2xl border border-orange-100 bg-white px-4 py-3 text-sm outline-none ring-orange-200 focus:ring-2"
              />
              <input
                required
                placeholder="Importe pagado"
                value={payAmount}
                onChange={(e) => setPayAmount(e.target.value)}
                className="rounded-2xl border border-orange-100 bg-white px-4 py-3 text-sm tabular-nums outline-none ring-orange-200 focus:ring-2"
                inputMode="decimal"
              />
              <input
                type="datetime-local"
                value={payAt}
                onChange={(e) => setPayAt(e.target.value)}
                className="rounded-2xl border border-orange-100 bg-white px-4 py-3 text-sm outline-none ring-orange-200 focus:ring-2"
              />
              <input
                placeholder="Nombre archivo comprobante (simulado)"
                value={payReceiptName}
                onChange={(e) => setPayReceiptName(e.target.value)}
                className="rounded-2xl border border-orange-100 bg-white px-4 py-3 text-sm outline-none ring-orange-200 focus:ring-2"
              />
              <button
                type="submit"
                className="rounded-full bg-orange-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-orange-700"
              >
                Registrar pago
              </button>
            </form>
          )}

          {canAct && c.status === "paid" && session.role === "costos" && (
            <div className="mt-4">
              <button
                type="button"
                onClick={handleRequestInvoice}
                className="rounded-full bg-orange-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-orange-700"
              >
                Solicitar factura al proveedor
              </button>
            </div>
          )}

          {canAct && c.status === "invoiceRequested" && session.role === "costos" && (
            <form onSubmit={handleInvoice} className="mt-4 grid gap-3 sm:max-w-md">
              <input
                required
                placeholder="Folio factura"
                value={invFolio}
                onChange={(e) => setInvFolio(e.target.value)}
                className="rounded-2xl border border-orange-100 bg-white px-4 py-3 text-sm outline-none ring-orange-200 focus:ring-2"
              />
              <input
                required
                placeholder="Importe factura"
                value={invAmount}
                onChange={(e) => setInvAmount(e.target.value)}
                className="rounded-2xl border border-orange-100 bg-white px-4 py-3 text-sm tabular-nums outline-none ring-orange-200 focus:ring-2"
                inputMode="decimal"
              />
              <input
                type="datetime-local"
                value={invAt}
                onChange={(e) => setInvAt(e.target.value)}
                className="rounded-2xl border border-orange-100 bg-white px-4 py-3 text-sm outline-none ring-orange-200 focus:ring-2"
              />
              <input
                placeholder="Nombre archivo XML/PDF (simulado)"
                value={invFileName}
                onChange={(e) => setInvFileName(e.target.value)}
                className="rounded-2xl border border-orange-100 bg-white px-4 py-3 text-sm outline-none ring-orange-200 focus:ring-2"
              />
              <p className="text-xs text-zinc-500">
                Debe existir comprobante de pago registrado para enviar a Recepción.
              </p>
              <button
                type="submit"
                className="rounded-full bg-orange-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-orange-700"
              >
                Cargar factura y enviar a recepción
              </button>
            </form>
          )}

          {canAct && c.status === "readyForReception" && session.role === "recepcion" && (
            <form onSubmit={handleReception} className="mt-4 space-y-3 sm:max-w-md">
              <textarea
                required
                placeholder="Notas de captura"
                value={recvNotes}
                onChange={(e) => setRecvNotes(e.target.value)}
                rows={3}
                className="w-full rounded-2xl border border-orange-100 bg-white px-4 py-3 text-sm outline-none ring-orange-200 focus:ring-2"
              />
              <button
                type="submit"
                className="rounded-full bg-orange-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-orange-700"
              >
                Capturar en sistema
              </button>
            </form>
          )}

          {canAct && c.status === "capturedByReception" && session.role === "contabilidad" && (
            <form onSubmit={handleAccounting} className="mt-4 space-y-3 sm:max-w-md">
              {mismatchWarning && (
                <p className="rounded-2xl bg-amber-50 px-3 py-2 text-sm text-amber-900">
                  El importe de pago y factura no coincide exactamente. Revísalo antes de cerrar.
                </p>
              )}
              <label className="flex items-center gap-2 text-sm text-zinc-700">
                <input
                  type="checkbox"
                  checked={accBalanced}
                  onChange={(e) => setAccBalanced(e.target.checked)}
                  className="rounded border-orange-300 text-orange-600 focus:ring-orange-500"
                />
                Conciliación cuadra
              </label>
              <textarea
                placeholder="Notas contables"
                value={accNotes}
                onChange={(e) => setAccNotes(e.target.value)}
                rows={3}
                className="w-full rounded-2xl border border-orange-100 bg-white px-4 py-3 text-sm outline-none ring-orange-200 focus:ring-2"
              />
              <button
                type="submit"
                className="rounded-full bg-orange-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-orange-700"
              >
                Cerrar expediente
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
