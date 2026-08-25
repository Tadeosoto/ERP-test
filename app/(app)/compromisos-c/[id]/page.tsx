"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";
import { LoadingScreen } from "@/components/ui/loading-screen";
import { useFeedback } from "@/components/ui/feedback-provider";
import { useConfirmDelete } from "@/components/ui/confirm-delete-provider";
import { useSession } from "@/components/session-provider";
import { SupplierCombobox } from "@/components/ui/supplier-combobox";
import { ExpedienteCombobox } from "@/components/expedientes/expediente-combobox";
import { NuevoExpedienteModal } from "@/components/expedientes/nuevo-expediente-modal";
import { commitmentDisplayStatus } from "@/lib/dashboard/direccion-proceso-c-dashboard";
import {
  INVOICE_FIRST_STATUS_LABEL,
  canDeleteInvoiceFirstCommitment,
  canEditInvoiceFirstCommitment,
  describeInvoiceFirstGate,
} from "@/lib/domain/proceso-c";
import { canActAsCompras } from "@/lib/domain/transitions";
import type { InvoiceFirstCommitmentDto, ObraDto, PurchaseOrderDto, SupplierDto } from "@/lib/domain/types";
import {
  formatAmountInput,
  formatDateShort,
  formatMoney,
  parseAmountInput,
  sanitizeAmountInput,
} from "@/lib/format";

const inputCls =
  "block w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-violet-300 focus:outline-none focus:ring-1 focus:ring-violet-200";

export default function CompromisoCDetailPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<LoadingScreen message="Cargando compromiso" />}>
      <CompromisoCDetailInner params={params} />
    </Suspense>
  );
}

function CompromisoCDetailInner({ params }: { params: Promise<{ id: string }> }) {
  const { user } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showSuccess, showError } = useFeedback();
  const { confirmDelete } = useConfirmDelete();
  const [id, setId] = useState<string | null>(null);
  const [commitment, setCommitment] = useState<InvoiceFirstCommitmentDto | null>(null);
  const [order, setOrder] = useState<PurchaseOrderDto | null>(null);
  const [obras, setObras] = useState<ObraDto[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(searchParams.get("edit") === "1");
  const [editForm, setEditForm] = useState({
    invoiceFolio: "",
    supplierId: "",
    supplierName: "",
    obraId: "",
    invoiceDate: "",
    totalAmount: "",
    currency: "MXN",
    comment: "",
    expedienteId: "",
  });
  const [nuevoExpedienteOpen, setNuevoExpedienteOpen] = useState(false);

  useEffect(() => {
    void params.then((p) => setId(p.id));
  }, [params]);

  useEffect(() => {
    if (searchParams.get("edit") === "1") setEditing(true);
  }, [searchParams]);

  const load = useCallback(async () => {
    if (!id) return;
    const [res, oRes, sRes] = await Promise.all([
      fetch(`/api/invoice-first-commitments/${id}`, { credentials: "include" }),
      fetch("/api/obras", { credentials: "include" }),
      fetch("/api/suppliers", { credentials: "include" }),
    ]);
    if (res.ok) {
      const d = (await res.json()) as { commitment: InvoiceFirstCommitmentDto };
      setCommitment(d.commitment);
      setEditForm({
        invoiceFolio: d.commitment.invoiceFolio,
        supplierId: d.commitment.supplierId ?? "",
        supplierName: d.commitment.supplierName,
        obraId: d.commitment.obraId ?? "",
        invoiceDate: d.commitment.invoiceDate.slice(0, 10),
        totalAmount: formatAmountInput(d.commitment.totalAmount),
        currency: d.commitment.currency,
        comment: d.commitment.comment,
        expedienteId: d.commitment.expedienteId ?? "",
      });
      if (d.commitment.purchaseOrderId) {
        const ordRes = await fetch(`/api/orders/${d.commitment.purchaseOrderId}`, {
          credentials: "include",
        });
        if (ordRes.ok) {
          const od = (await ordRes.json()) as { order: PurchaseOrderDto };
          setOrder(od.order);
        }
      } else {
        setOrder(null);
      }
    }
    if (oRes.ok) {
      const d = (await oRes.json()) as { obras: ObraDto[] };
      setObras(d.obras.filter((o) => o.active));
    }
    if (sRes.ok) {
      const d = (await sRes.json()) as { suppliers: SupplierDto[] };
      setSuppliers(d.suppliers);
    }
    setLoading(false);
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  async function requestOc() {
    if (!id) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/invoice-first-commitments/${id}/actions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ action: "request_oc" }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "No se pudo solicitar la OC.");
      showSuccess("Compras fue notificada para generar la OC.");
      await load();
    } catch (e) {
      showError(e instanceof Error ? e.message : "Error.");
    } finally {
      setBusy(false);
    }
  }

  async function saveEdit() {
    if (!id) return;
    if (!editForm.supplierId && !editForm.supplierName.trim()) {
      showError("El proveedor es requerido.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(`/api/invoice-first-commitments/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          invoiceFolio: editForm.invoiceFolio,
          supplierId: editForm.supplierId || null,
          supplierName: editForm.supplierName,
          obraId: editForm.obraId || null,
          invoiceDate: editForm.invoiceDate,
          totalAmount: parseAmountInput(editForm.totalAmount),
          currency: editForm.currency,
          comment: editForm.comment,
          expedienteId: editForm.expedienteId || null,
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "No se pudo guardar.");
      showSuccess("Factura actualizada.");
      setEditing(false);
      await load();
    } catch (e) {
      showError(e instanceof Error ? e.message : "Error.");
    } finally {
      setBusy(false);
    }
  }

  async function removeCommitment() {
    if (!id || !commitment) return;
    const ok = await confirmDelete({
      title: "Eliminar factura (Proceso C)",
      message: `Se eliminará la factura ${commitment.invoiceFolio} (${commitment.supplierName}). Esta acción no se puede deshacer.`,
    });
    if (!ok) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/invoice-first-commitments/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "No se pudo eliminar.");
      showSuccess("Factura eliminada.");
      router.push(user?.role === "direccion" ? "/agregar-factura" : "/inicio");
    } catch (e) {
      showError(e instanceof Error ? e.message : "Error.");
    } finally {
      setBusy(false);
    }
  }

  if (loading || !commitment) {
    return <LoadingScreen message="Cargando compromiso" />;
  }

  const paid = order?.amountPaidSoFar ?? commitment.amountPaidSoFar;
  const total = order?.totalAmount ?? commitment.displayTotal;
  const remaining = order?.amountRemaining ?? commitment.amountRemaining;
  const displayStatus = order
    ? commitmentDisplayStatus({
        ...commitment,
        amountPaidSoFar: paid,
        amountRemaining: remaining,
        purchaseOrderStatus: order.status,
      })
    : INVOICE_FIRST_STATUS_LABEL[commitment.status];

  const canEdit = user ? canEditInvoiceFirstCommitment(user.role) : false;
  const canDelete = user
    ? canDeleteInvoiceFirstCommitment(
        user.role,
        commitment.status,
        Boolean(commitment.purchaseOrderId),
        commitment.amountPaidSoFar
      )
    : false;

  return (
    <div className="mx-auto max-w-3xl space-y-4 pb-8">
      <NuevoExpedienteModal
        open={nuevoExpedienteOpen}
        onClose={() => setNuevoExpedienteOpen(false)}
        obras={obras}
        onSaved={(e) => {
          setEditForm((f) => ({ ...f, expedienteId: e.id }));
          setNuevoExpedienteOpen(false);
        }}
      />
      <Link
        href={user?.role === "direccion" ? "/agregar-factura" : "/inicio"}
        className="text-sm font-medium text-violet-700 hover:underline"
      >
        ← Volver
      </Link>

      <header className="card p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-violet-600">Proceso C</p>
            <h1 className="text-2xl font-bold text-zinc-900">{commitment.invoiceFolio}</h1>
            <p className="mt-1 text-sm text-zinc-600">{commitment.supplierName}</p>
          </div>
          <span className="rounded-full bg-orange-100 px-3 py-1 text-xs font-semibold text-orange-800 ring-1 ring-orange-200">
            {displayStatus}
          </span>
        </div>
        <p className="mt-3 text-sm text-zinc-600">{describeInvoiceFirstGate(commitment.status)}</p>
      </header>

      {editing ? (
        <section className="card space-y-3 p-5">
          <h2 className="text-sm font-bold text-zinc-900">Editar factura</h2>
          <label className="block text-xs">
            <span className="font-medium text-zinc-600">Folio</span>
            <input
              value={editForm.invoiceFolio}
              onChange={(e) => setEditForm((f) => ({ ...f, invoiceFolio: e.target.value }))}
              className={`mt-1 ${inputCls}`}
            />
          </label>
          <div>
            <p className="text-xs font-medium text-zinc-600">Proveedor</p>
            <div className="mt-1 space-y-2">
              <SupplierCombobox
                suppliers={suppliers}
                value={editForm.supplierId}
                onChange={(sid, s) =>
                  setEditForm((f) => ({
                    ...f,
                    supplierId: sid,
                    supplierName: s?.displayName ?? f.supplierName,
                  }))
                }
                placeholder="Buscar proveedor…"
              />
              {!editForm.supplierId && (
                <input
                  value={editForm.supplierName}
                  onChange={(e) => setEditForm((f) => ({ ...f, supplierName: e.target.value }))}
                  placeholder="O escribe el nombre del proveedor"
                  className={inputCls}
                />
              )}
            </div>
          </div>
          <label className="block text-xs">
            <span className="font-medium text-zinc-600">Obra</span>
            <select
              value={editForm.obraId}
              onChange={(e) => setEditForm((f) => ({ ...f, obraId: e.target.value }))}
              className={`mt-1 ${inputCls}`}
            >
              <option value="">Sin obra</option>
              {obras.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </select>
          </label>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <label className="block text-xs">
              <span className="font-medium text-zinc-600">Fecha</span>
              <input
                type="date"
                value={editForm.invoiceDate}
                onChange={(e) => setEditForm((f) => ({ ...f, invoiceDate: e.target.value }))}
                className={`mt-1 ${inputCls}`}
              />
            </label>
            <label className="block text-xs">
              <span className="font-medium text-zinc-600">Monto</span>
              <input
                value={editForm.totalAmount}
                onChange={(e) =>
                  setEditForm((f) => ({ ...f, totalAmount: sanitizeAmountInput(e.target.value) }))
                }
                className={`mt-1 tabular-nums ${inputCls}`}
              />
            </label>
            <label className="block text-xs">
              <span className="font-medium text-zinc-600">Moneda</span>
              <select
                value={editForm.currency}
                onChange={(e) => setEditForm((f) => ({ ...f, currency: e.target.value }))}
                className={`mt-1 ${inputCls}`}
              >
                <option value="MXN">MXN</option>
                <option value="USD">USD</option>
              </select>
            </label>
          </div>
          <div>
            <ExpedienteCombobox
              value={editForm.expedienteId}
              onChange={(eid) => setEditForm((f) => ({ ...f, expedienteId: eid }))}
              allowCreate
              onCreateClick={() => setNuevoExpedienteOpen(true)}
              label="Expediente (contenedor)"
            />
          </div>
          <label className="block text-xs">
            <span className="font-medium text-zinc-600">Comentario</span>
            <textarea
              value={editForm.comment}
              onChange={(e) => setEditForm((f) => ({ ...f, comment: e.target.value }))}
              rows={3}
              className={`mt-1 ${inputCls}`}
            />
          </label>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn-primary" disabled={busy} onClick={() => void saveEdit()}>
              Guardar cambios
            </button>
            <button
              type="button"
              className="btn-secondary"
              disabled={busy}
              onClick={() => setEditing(false)}
            >
              Cancelar
            </button>
          </div>
        </section>
      ) : (
        <section className="card p-5">
          <h2 className="text-sm font-bold text-zinc-900">Detalle</h2>
          <dl className="mt-3 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-zinc-500">Obra</dt>
              <dd className="font-medium text-zinc-900">{commitment.obraName ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-zinc-500">Fecha factura</dt>
              <dd className="font-medium">{formatDateShort(commitment.invoiceDate)}</dd>
            </div>
            <div>
              <dt className="text-zinc-500">Total</dt>
              <dd className="font-semibold tabular-nums">{formatMoney(total, commitment.currency)}</dd>
            </div>
            <div>
              <dt className="text-zinc-500">Pagado / Saldo</dt>
              <dd className="tabular-nums">
                {formatMoney(paid, commitment.currency)} / {formatMoney(remaining, commitment.currency)}
              </dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-zinc-500">Expediente</dt>
              <dd className="font-medium">
                {commitment.expedienteFolio ? (
                  <Link
                    href={`/expedientes/${commitment.expedienteFolio}`}
                    className="text-violet-700 hover:underline"
                  >
                    {commitment.expedienteFolio}
                    {commitment.expedienteName ? ` · ${commitment.expedienteName}` : ""}
                  </Link>
                ) : (
                  <span className="text-zinc-400">Sin asignar — edita para vincularlo</span>
                )}
              </dd>
            </div>
            {commitment.comment && (
              <div className="sm:col-span-2">
                <dt className="text-zinc-500">Comentario</dt>
                <dd className="whitespace-pre-wrap">{commitment.comment}</dd>
              </div>
            )}
          </dl>
        </section>
      )}

      <section className="card p-5">
        <h2 className="text-sm font-bold text-zinc-900">Documentos</h2>
        <ul className="mt-3 space-y-2">
          {commitment.files.length === 0 ? (
            <li className="text-sm text-zinc-500">Sin archivos.</li>
          ) : (
            commitment.files.map((f) => (
              <li key={f.id}>
                <a
                  href={`/api/invoice-first-files/${f.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-medium text-violet-700 hover:underline"
                >
                  {f.originalFileName}
                </a>
              </li>
            ))
          )}
        </ul>
      </section>

      {order && (
        <section className="card p-5">
          <h2 className="text-sm font-bold text-zinc-900">Orden de compra vinculada</h2>
          <p className="mt-2">
            <Link href={`/ordenes/${order.id}`} className="font-semibold text-violet-800 hover:underline">
              {order.ocFolio || order.title}
            </Link>
          </p>
        </section>
      )}

      <div className="flex flex-wrap gap-2">
        {user?.role === "pagos" && commitment.status === "awaiting_oc" && (
          <button type="button" className="btn-primary" disabled={busy} onClick={() => void requestOc()}>
            Solicitar OC a Compras
          </button>
        )}
        {user && canActAsCompras(user.role) && commitment.status === "oc_requested" && !commitment.purchaseOrderId && (
          <Link
            href={`/ordenes/nueva?compromisoFacturaId=${commitment.id}`}
            className="btn-primary inline-flex items-center"
          >
            Generar OC
          </Link>
        )}
        {canEdit && !editing && (
          <button
            type="button"
            className="btn-secondary"
            disabled={busy}
            onClick={() => setEditing(true)}
          >
            Editar
          </button>
        )}
        {canDelete && (
          <button
            type="button"
            className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-800 hover:bg-red-100 disabled:opacity-50"
            disabled={busy}
            onClick={() => void removeCommitment()}
          >
            Eliminar
          </button>
        )}
      </div>
    </div>
  );
}
