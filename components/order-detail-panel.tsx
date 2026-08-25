"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FilePickButton } from "@/components/file-pick-button";
import {
  IconBanknote,
  IconCalendar,
  IconCheck,
  IconEdit,
} from "@/components/ui/action-icons";
import { ProcessFlowDiagram } from "@/components/process-flow-diagram";
import { SystemStatusBadge } from "@/components/ui/system-status-badge";
import { useSession } from "@/components/session-provider";
import Link from "next/link";
import {
  canRoleAdvance,
  describeGate,
  sessionHintForCase,
} from "@/lib/domain/flow";
import {
  canAccountingResolveDifference,
  canAccountingValidate,
  canActAsCompras,
  canComprasEditOrder,
  canDeleteOrder,
  canDeleteOrderFile,
  canDeletePayment,
  canReplaceOrderFile,
  canEngineerAct,
  canMarkAwaitingInvoice,
  canRegisterPayment,
  canSetPaymentDeadline,
  canUploadInvoice,
  canUploadOcPdf,
  canUploadPaymentReceipt,
} from "@/lib/domain/transitions";
import {
  PAYMENT_LABEL_TEXT,
  PAYMENT_TYPE_TEXT,
} from "@/lib/domain/labels";
import { useFeedback } from "@/components/ui/feedback-provider";
import { useConfirmDelete } from "@/components/ui/confirm-delete-provider";
import {
  actionSuccessMessage,
  fileUploadSuccessMessage,
} from "@/lib/process-feedback";
import type { PaymentType, PurchaseOrderDto } from "@/lib/domain/types";
import { formatAmountInput, formatDate, formatMoney, parseAmountInput, sanitizeAmountInput } from "@/lib/format";
import { OrderDocumentsTable } from "@/components/order-documents-table";

export function OrderDetailPanel({
  order,
  onUpdated,
}: {
  order: PurchaseOrderDto;
  onUpdated: () => void;
}) {
  const router = useRouter();
  const { user } = useSession();
  const { showSuccess, showError } = useFeedback();
  const { confirmDelete } = useConfirmDelete();
  const [busy, setBusy] = useState(false);
  const [comment, setComment] = useState("");
  const [paymentDueDate, setPaymentDueDate] = useState("");
  const [payAmount, setPayAmount] = useState("");
  const [payReference, setPayReference] = useState("");
  const [payNotes, setPayNotes] = useState("");

  const [accountingComment, setAccountingComment] = useState("");

  const canAct = user ? canRoleAdvance(user.role, order.status) : false;

  async function postAction(body: Record<string, unknown>) {
    const action = typeof body.action === "string" ? body.action : "";
    setBusy(true);
    try {
      const res = await fetch(`/api/orders/${order.id}/actions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "No se pudo completar la acción.");
      onUpdated();
      router.refresh();
      showSuccess(actionSuccessMessage(action));
    } catch (e) {
      showError(e instanceof Error ? e.message : "No se pudo completar la acción.");
    } finally {
      setBusy(false);
    }
  }

  async function uploadFile(kind: string, file: File, replaceFileId?: string) {
    setBusy(true);
    try {
      const fd = new FormData();
      fd.set("orderId", order.id);
      fd.set("kind", kind);
      fd.set("file", file);
      if (replaceFileId) fd.set("replaceFileId", replaceFileId);
      const res = await fetch("/api/files/upload", {
        method: "POST",
        credentials: "include",
        body: fd,
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Error al subir el archivo.");
      onUpdated();
      router.refresh();
      showSuccess(
        replaceFileId ? "Documento reemplazado." : fileUploadSuccessMessage(kind)
      );
    } catch (e) {
      showError(e instanceof Error ? e.message : "Error al subir el archivo.");
    } finally {
      setBusy(false);
    }
  }

  async function deleteOrder() {
    const ok = await confirmDelete({
      title: "Eliminar orden de compra",
      message: "Se eliminará esta orden de compra y su expediente asociado.",
    });
    if (!ok) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/orders/${order.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "No se pudo eliminar.");
      showSuccess("Orden eliminada.");
      router.push("/inicio");
      router.refresh();
    } catch (e) {
      showError(e instanceof Error ? e.message : "No se pudo eliminar.");
    } finally {
      setBusy(false);
    }
  }

  async function deletePayment(paymentId: string) {
    const ok = await confirmDelete({
      title: "Eliminar pago",
      message: "Se eliminará este registro de pago y se recalculará el saldo de la OC.",
      confirmLabel: "Eliminar pago",
    });
    if (!ok) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/orders/${order.id}/actions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ action: "delete_payment", paymentId }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "No se pudo eliminar el pago.");
      showSuccess("Pago eliminado.");
      onUpdated();
      router.refresh();
    } catch (e) {
      showError(e instanceof Error ? e.message : "No se pudo eliminar el pago.");
    } finally {
      setBusy(false);
    }
  }

  async function deleteFile(fileId: string, fileName: string) {
    const ok = await confirmDelete({
      title: "Eliminar archivo",
      message: `Se eliminará el archivo «${fileName}» del expediente.`,
      confirmLabel: "Eliminar archivo",
    });
    if (!ok) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/files/${fileId}`, {
        method: "DELETE",
        credentials: "include",
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "No se pudo eliminar el archivo.");
      showSuccess("Archivo eliminado.");
      onUpdated();
      router.refresh();
    } catch (e) {
      showError(e instanceof Error ? e.message : "No se pudo eliminar el archivo.");
    } finally {
      setBusy(false);
    }
  }

  if (!user) return null;

  const defaultPayAmount =
    order.paymentType === "inmediato" || order.paymentType === "programado"
      ? formatAmountInput(order.amountRemaining)
      : payAmount;

  const prioritizeDocuments = user.role === "ingeniero";

  const headerPanel = (
    <div className="card p-4 sm:p-6">
      <div className="flex flex-col gap-5 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between sm:gap-4">
        <div className="min-w-0">
          <p className="text-sm font-medium text-teal-700 sm:text-base">{order.obraName}</p>
          <h1 className="mt-1 break-words text-2xl font-bold text-zinc-900 sm:text-3xl">{order.title}</h1>
          <p className="mt-2 text-base text-zinc-600 sm:text-lg">{order.supplierName}</p>
          <p className="mt-2 text-sm text-zinc-500 sm:text-base">Orden creada el {formatDate(order.createdAt)}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <SystemStatusBadge status={order.status} />
            <span className="inline-flex rounded-full bg-teal-100 px-4 py-1.5 text-sm font-semibold text-teal-900">
              {PAYMENT_LABEL_TEXT[order.paymentLabel]}
            </span>
            {order.paymentType && (
              <span className="inline-flex rounded-full bg-zinc-100 px-4 py-1.5 text-sm font-semibold text-zinc-800">
                Pago: {PAYMENT_TYPE_TEXT[order.paymentType]}
              </span>
            )}
            {!order.paymentType && order.suggestedPaymentType === "parcialidades" && (
              <span className="inline-flex rounded-full bg-amber-100 px-4 py-1.5 text-sm font-semibold text-amber-900">
                Paty indicó parcialidades
              </span>
            )}
          </div>
          {order.paymentDueDate && (
            <p className="mt-3 text-base font-medium text-teal-800">
              Fecha límite de pago:{" "}
              {new Date(order.paymentDueDate).toLocaleDateString("es-MX", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
          )}
        </div>
        <div className="w-full sm:w-auto sm:min-w-[16rem] sm:text-right">
          <div className="grid grid-cols-3 gap-3 rounded-2xl border border-orange-50 bg-orange-50/40 p-3 sm:gap-4 sm:border-0 sm:bg-transparent sm:p-0">
            <div>
              <p className="text-xs text-zinc-500 sm:text-sm">Total orden</p>
              <p className="text-lg font-bold tabular-nums text-orange-700 sm:text-2xl">
                {formatMoney(order.totalAmount, order.currency)}
              </p>
            </div>
            <div>
              <p className="text-xs text-zinc-500 sm:text-sm">Pagado</p>
              <p className="text-lg font-bold tabular-nums text-teal-700 sm:text-xl">
                {formatMoney(order.amountPaidSoFar, order.currency)}
              </p>
            </div>
            <div>
              <p className="text-xs text-zinc-500 sm:text-sm">Falta por pagar</p>
              <p className="text-lg font-bold tabular-nums text-amber-700 sm:text-xl">
                {formatMoney(order.amountRemaining, order.currency)}
              </p>
            </div>
          </div>
          {(() => {
            const total = order.totalAmount > 0 ? order.totalAmount : 0;
            const pct =
              total > 0
                ? Math.min(100, Math.max(0, Math.round((order.amountPaidSoFar / total) * 100)))
                : 0;
            return (
              <div className="mt-3 text-left sm:text-right">
                <div className="mb-1 flex items-center justify-between gap-2 sm:justify-end sm:gap-3">
                  <span className="text-xs font-medium text-zinc-600">Avance de pago</span>
                  <span className="text-xs font-bold tabular-nums text-teal-800">{pct}%</span>
                </div>
                <div
                  className="h-2.5 w-full overflow-hidden rounded-full bg-zinc-200"
                  role="progressbar"
                  aria-valuenow={pct}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={`Pagado ${pct} por ciento`}
                >
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-teal-500 to-teal-600 transition-[width] duration-500 ease-out"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <p className="mt-1 text-[11px] text-zinc-500">
                  {formatMoney(order.amountPaidSoFar, order.currency)} de{" "}
                  {formatMoney(order.totalAmount, order.currency)}
                </p>
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );

  const documentsPanel =
    order.files.length > 0 ? (
      <div id="documentos" className="card scroll-mt-24 p-6">
        <h2 className="text-xl font-semibold">Documentos</h2>
        <p className="mt-1 text-sm text-zinc-500">
          Todos los archivos del expediente, con la fecha en que se subieron.
        </p>
        <OrderDocumentsTable
          files={order.files}
          canDelete={Boolean(user && canDeleteOrderFile(user.role))}
          canReplaceFile={(f) =>
            Boolean(user && canReplaceOrderFile(user.role, f.kind, order.status))
          }
          busy={busy}
          onDelete={(fileId, fileName) => void deleteFile(fileId, fileName)}
          onReplace={(fileId, kind, file) => void uploadFile(kind, file, fileId)}
        />
      </div>
    ) : null;

  return (
    <div className="space-y-6 sm:space-y-8">
      {prioritizeDocuments && documentsPanel}
      {headerPanel}

      <div className="card border-teal-200 bg-gradient-to-br from-white to-teal-50/40 p-4 sm:p-6">
        <p className="text-base font-semibold text-zinc-900 sm:text-lg">
          {describeGate(order.status, order.paymentType)}
        </p>
        <p className="mt-2 text-base text-zinc-700">
          {sessionHintForCase(user.role, order.status, canAct)}
        </p>
      </div>

      <div className="card p-6">
        <h2 className="text-xl font-semibold">Avance en el proceso</h2>
        <div className="mt-4 overflow-x-auto pb-2">
          <ProcessFlowDiagram status={order.status} processKind={order.processKind} />
        </div>
      </div>

      {order.paymentRecords.length > 0 && (
        <div id="pagos" className="card scroll-mt-24 p-6">
          <h2 className="text-xl font-semibold">Historial de abonos (Carolina)</h2>
          <ul className="mt-4 space-y-3">
            {order.paymentRecords.map((p) => (
              <li
                key={p.id}
                className="rounded-2xl border border-teal-100 bg-teal-50/40 px-4 py-3 text-base"
              >
                <p className="font-semibold tabular-nums text-teal-900">
                  {formatMoney(p.amount, order.currency)}
                </p>
                <p className="text-sm text-zinc-600">
                  {p.recordedByName} · {new Date(p.createdAt).toLocaleString("es-MX")}
                  {p.reference ? ` · Ref. ${p.reference}` : ""}
                </p>
                {p.notes && <p className="mt-1 text-sm text-zinc-600">{p.notes}</p>}
                {user && canDeletePayment(user.role) && (
                  <button
                    type="button"
                    disabled={busy}
                    className="mt-2 text-sm font-semibold text-red-700 hover:underline disabled:opacity-50"
                    onClick={() => void deletePayment(p.id)}
                  >
                    Eliminar pago
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {order.comments.length > 0 && (
        <div id="comentarios" className="card scroll-mt-24 p-6">
          <h2 className="text-xl font-semibold">Comentarios de ingeniería</h2>
          <ul className="mt-4 space-y-3">
            {order.comments.map((c) => (
              <li
                key={c.id}
                className={`rounded-2xl p-4 text-base ${
                  c.kind === "rejection" ? "bg-red-50 text-red-900" : "bg-teal-50 text-teal-900"
                }`}
              >
                <p className="font-medium">{c.authorName}</p>
                <p className="mt-1">{c.body}</p>
              </li>
            ))}
          </ul>
        </div>
      )}

      {!prioritizeDocuments && documentsPanel}


      <div id="facturas" className="scroll-mt-24" aria-hidden />

      <div id="tarea" className="card scroll-mt-24 border-2 border-dashed border-orange-200 bg-orange-50/40 p-6">
        <h2 className="text-xl font-bold text-zinc-900">Tu tarea</h2>

        {canActAsCompras(user.role) && (
          <div className="mt-4 flex flex-wrap gap-3">
            {canComprasEditOrder(order.status, user.role) ? (
              <Link href={`/ordenes/nueva?orderId=${order.id}`} className="btn-secondary">
                <IconEdit />
                Editar OC
              </Link>
            ) : (
              <span
                className="btn-secondary cursor-not-allowed opacity-50"
                title="Solo puedes editar antes del pago o cierre documental"
              >
                <IconEdit />
                Editar OC
              </span>
            )}
            {user.role === "compras" &&
              (canDeleteOrder(order.status, user.role, order.amountPaidSoFar) ? (
                <button type="button" disabled={busy} className="btn-danger" onClick={() => void deleteOrder()}>
                  Eliminar OC
                </button>
              ) : (
                <span
                  className="btn-danger inline-flex cursor-not-allowed opacity-50"
                  title={
                    order.amountPaidSoFar > 0.01
                      ? "No se puede eliminar: ya hay pagos registrados"
                      : "No se puede eliminar en este estado"
                  }
                >
                  Eliminar OC
                </span>
              ))}
          </div>
        )}

        {user.role === "pagos" && (
          <div className="mt-4 flex flex-wrap gap-3">
            {canDeleteOrder(order.status, user.role, order.amountPaidSoFar) && (
              <button type="button" disabled={busy} className="btn-danger" onClick={() => void deleteOrder()}>
                Eliminar OC / expediente
              </button>
            )}
          </div>
        )}

        {canUploadOcPdf(order.status, user.role) && (
          <div className="mt-4 space-y-3">
            <p className="text-base text-zinc-700">
              {order.status === "engineerRejected"
                ? "Ingeniería solicitó corrección. Sube el PDF corregido (se suma al expediente; usa «Reemplazar» en la tabla para cambiar uno existente)."
                : order.status === "awaitingEngineer"
                  ? "Adjunta el PDF de la OC. Para corregir uno ya subido, usa «Reemplazar» en Documentos."
                  : "Agrega el PDF de la orden de compra. Los documentos anteriores no se borran al subir otro."}
            </p>
            <FilePickButton
              disabled={busy}
              label="Agregar PDF de OC"
              hint="archivo PDF generado en CONTPAQi"
              onPick={(file) => void uploadFile("oc_pdf", file)}
            />
          </div>
        )}

        {canEngineerAct(order.status, user.role) && (
          <div className="mt-4 space-y-4">
            {(order.paymentType || order.suggestedPaymentType) && (
              <p className="rounded-2xl bg-teal-50 px-4 py-3 text-base text-teal-900">
                Compras definió la modalidad de pago:{" "}
                <strong>
                  {PAYMENT_TYPE_TEXT[order.paymentType ?? order.suggestedPaymentType ?? "inmediato"]}
                </strong>
                . Solo revisa el PDF y aprueba o solicita corrección.
              </p>
            )}
            {!order.paymentType && !order.suggestedPaymentType && (
              <p className="rounded-2xl bg-amber-50 px-4 py-3 text-base text-amber-900">
                Compras aún no indicó la modalidad de pago en esta OC. Solicita corrección si falta ese dato.
              </p>
            )}
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Comentario (obligatorio si rechazas)"
              rows={3}
              className="w-full rounded-2xl border border-orange-100 px-4 py-3 text-base"
            />
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                disabled={busy}
                className="btn-primary"
                onClick={() =>
                  void postAction({
                    action: "engineer_approve",
                    comment,
                  })
                }
              >
                <IconCheck />
                Aprobar orden
              </button>
              <button
                type="button"
                disabled={busy}
                className="btn-danger"
                onClick={() => void postAction({ action: "engineer_reject", comment })}
              >
                <IconEdit />
                Solicitar corrección
              </button>
            </div>
          </div>
        )}

        {canSetPaymentDeadline(order.status, user.role) && (
          <div className="mt-4 space-y-3 sm:max-w-md">
            <p className="text-base text-zinc-700">
              Indica a Carolina la fecha límite para pagar el total de la orden.
            </p>
            <input
              type="date"
              required
              value={paymentDueDate}
              onChange={(e) => setPaymentDueDate(e.target.value)}
              className="w-full min-h-12 rounded-2xl border border-orange-100 px-4 text-base"
            />
            <button
              type="button"
              disabled={busy || !paymentDueDate}
              className="btn-secondary"
              onClick={() =>
                void postAction({ action: "set_payment_deadline", paymentDueDate })
              }
            >
              <IconCalendar />
              Guardar fecha y avisar a Carolina
            </button>
          </div>
        )}

        {canRegisterPayment(order.status, user.role) && order.paymentType && (
          <div className="mt-4 space-y-4 sm:max-w-md">
            <p className="text-base text-zinc-700">
              {order.paymentType === "parcialidades"
                ? "Registra cada abono. El sistema lleva la cuenta de lo pagado y lo que falta."
                : order.paymentType === "programado"
                  ? "Registra el pago completo de la orden (programado)."
                  : "Registra el pago inmediato del 100% de la orden."}
            </p>
            <input
              inputMode="decimal"
              placeholder="Monto del abono"
              value={payAmount || defaultPayAmount}
              onChange={(e) => setPayAmount(sanitizeAmountInput(e.target.value))}
              onBlur={() =>
                setPayAmount((v) => {
                  const raw = v || defaultPayAmount;
                  const n = parseAmountInput(raw);
                  return n > 0 ? formatAmountInput(n) : raw.trim();
                })
              }
              className="w-full min-h-12 rounded-2xl border border-orange-100 px-4 text-base tabular-nums"
            />
            <input
              placeholder="Referencia bancaria (opcional)"
              value={payReference}
              onChange={(e) => setPayReference(e.target.value)}
              className="w-full min-h-12 rounded-2xl border border-orange-100 px-4 text-base"
            />
            <textarea
              placeholder="Notas (opcional)"
              value={payNotes}
              onChange={(e) => setPayNotes(e.target.value)}
              rows={2}
              className="w-full rounded-2xl border border-orange-100 px-4 py-3 text-base"
            />
            <button
              type="button"
              disabled={busy}
              className="btn-primary"
              onClick={() =>
                void postAction({
                  action: "register_payment",
                  amount: parseAmountInput(payAmount || defaultPayAmount),
                  reference: payReference,
                  notes: payNotes,
                })
              }
            >
              <IconBanknote />
              {order.paymentType === "parcialidades" ? "Registrar abono" : "Registrar pago total"}
            </button>
          </div>
        )}

        {canUploadPaymentReceipt(order.status, user.role) && (
          <div className="mt-4 space-y-3">
            <p className="text-base text-zinc-700">
              Sube el comprobante bancario del pago (PDF).
            </p>
            <FilePickButton
              disabled={busy}
              label="Agregar comprobante de pago"
              hint="cada pago puede tener su PDF; no reemplaza los anteriores"
              onPick={(file) => void uploadFile("comprobante_pago", file)}
            />
          </div>
        )}

        {canMarkAwaitingInvoice(order.status, user.role) && (
          <div className="mt-4 space-y-3">
            <p className="text-base text-zinc-700">
              Tras enviar el comprobante al proveedor y solicitar la factura, marca la orden como
              «Esperando factura».
            </p>
            <button
              type="button"
              disabled={busy}
              className="btn-secondary"
              onClick={() => void postAction({ action: "mark_awaiting_invoice" })}
            >
              <IconCalendar />
              Marcar esperando factura
            </button>
          </div>
        )}

        {canUploadInvoice(order.status, user.role) && (
          <div className="mt-4 space-y-4">
            <p className="text-base text-zinc-700">
              Agrega el PDF de la factura del proveedor (cada una se conserva). Para corregir una
              existente, usa «Reemplazar» en Documentos. Compras, Administración, Recepción o
              Contabilidad pueden cargarla.
            </p>
            <div>
              <p className="font-medium text-zinc-800">Factura (PDF)</p>
              <div className="mt-3">
                <FilePickButton
                  disabled={busy}
                  label="Agregar factura"
                  hint="PDF de factura del proveedor"
                  onPick={(file) => void uploadFile("factura", file)}
                />
              </div>
            </div>
            <div>
              <p className="font-medium text-zinc-800">Complemento de pago (opcional)</p>
              <div className="mt-3">
                <FilePickButton
                  disabled={busy}
                  label="Elegir complemento"
                  hint="solo si aplica; busca el PDF en tu equipo"
                  onPick={(file) => void uploadFile("complemento_pago", file)}
                />
              </div>
            </div>
          </div>
        )}

        {canAccountingValidate(order.status, user.role) && (
          <div className="mt-4 space-y-4">
            <p className="text-base text-zinc-700">
              Compara la OC, el comprobante de pago y la factura. Cierra el expediente o marca
              diferencia si algo no cuadra.
            </p>
            <textarea
              value={accountingComment}
              onChange={(e) => setAccountingComment(e.target.value)}
              placeholder="Observación (obligatoria si hay diferencia)"
              rows={3}
              className="w-full rounded-2xl border border-orange-100 px-4 py-3 text-base"
            />
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                disabled={busy}
                className="btn-primary"
                onClick={() => void postAction({ action: "accounting_complete" })}
              >
                <IconCheck />
                Validar y cerrar expediente
              </button>
              <button
                type="button"
                disabled={busy}
                className="btn-danger"
                onClick={() =>
                  void postAction({
                    action: "accounting_flag_difference",
                    comment: accountingComment,
                  })
                }
              >
                <IconEdit />
                Marcar diferencia
              </button>
            </div>
          </div>
        )}

        {canAccountingResolveDifference(order.status, user.role) && (
          <div className="mt-4 space-y-3">
            <p className="text-base text-zinc-700">
              Tras corregir la diferencia, puedes cerrar el expediente.
            </p>
            <button
              type="button"
              disabled={busy}
              className="btn-primary"
              onClick={() => void postAction({ action: "accounting_resolve" })}
            >
              <IconCheck />
              Resolver y cerrar expediente
            </button>
          </div>
        )}

        {!canAct &&
          order.status !== "completed" &&
          !canUploadOcPdf(order.status, user.role) &&
          !canEngineerAct(order.status, user.role) &&
          !canRegisterPayment(order.status, user.role) &&
          !canSetPaymentDeadline(order.status, user.role) &&
          !canUploadPaymentReceipt(order.status, user.role) &&
          !canMarkAwaitingInvoice(order.status, user.role) &&
          !canUploadInvoice(order.status, user.role) &&
          !canAccountingValidate(order.status, user.role) &&
          !canAccountingResolveDifference(order.status, user.role) && (
            <p className="mt-4 text-base text-zinc-600">
              Por ahora no hay acciones para tu rol. Puedes consultar documentos arriba.
            </p>
          )}

        {order.status === "completed" && (
          <p className="mt-4 text-base text-teal-800">
            Proceso terminado. Todos los documentos están disponibles.
          </p>
        )}
      </div>
    </div>
  );
}
