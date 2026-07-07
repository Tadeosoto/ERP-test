"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { LoadingScreen } from "@/components/ui/loading-screen";
import { useFeedback } from "@/components/ui/feedback-provider";
import { useSession } from "@/components/session-provider";
import { commitmentDisplayStatus } from "@/lib/dashboard/direccion-proceso-c-dashboard";
import { INVOICE_FIRST_STATUS_LABEL, describeInvoiceFirstGate } from "@/lib/domain/proceso-c";
import type { InvoiceFirstCommitmentDto, PurchaseOrderDto } from "@/lib/domain/types";
import { formatDateShort, formatMoney } from "@/lib/format";

export default function CompromisoCDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { user } = useSession();
  const { showSuccess, showError } = useFeedback();
  const [id, setId] = useState<string | null>(null);
  const [commitment, setCommitment] = useState<InvoiceFirstCommitmentDto | null>(null);
  const [order, setOrder] = useState<PurchaseOrderDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void params.then((p) => setId(p.id));
  }, [params]);

  const load = useCallback(async () => {
    if (!id) return;
    const res = await fetch(`/api/invoice-first-commitments/${id}`, { credentials: "include" });
    if (res.ok) {
      const d = (await res.json()) as { commitment: InvoiceFirstCommitmentDto };
      setCommitment(d.commitment);
      if (d.commitment.purchaseOrderId) {
        const oRes = await fetch(`/api/orders/${d.commitment.purchaseOrderId}`, { credentials: "include" });
        if (oRes.ok) {
          const od = (await oRes.json()) as { order: PurchaseOrderDto };
          setOrder(od.order);
        }
      } else {
        setOrder(null);
      }
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

  if (loading || !commitment) {
    return <LoadingScreen message="Cargando compromiso" />;
  }

  const paid = order?.amountPaidSoFar ?? commitment.amountPaidSoFar;
  const total = order?.totalAmount ?? commitment.displayTotal;
  const remaining = order?.amountRemaining ?? commitment.amountRemaining;
  const displayStatus = order
    ? commitmentDisplayStatus({ ...commitment, amountPaidSoFar: paid, amountRemaining: remaining, purchaseOrderStatus: order.status })
    : INVOICE_FIRST_STATUS_LABEL[commitment.status];

  return (
    <div className="mx-auto max-w-3xl space-y-4 pb-8">
      <Link href="/inicio" className="text-sm font-medium text-violet-700 hover:underline">
        ← Volver a Inicio
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
          {commitment.comment && (
            <div className="sm:col-span-2">
              <dt className="text-zinc-500">Comentario</dt>
              <dd className="whitespace-pre-wrap">{commitment.comment}</dd>
            </div>
          )}
        </dl>
      </section>

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
        {user?.role === "compras" && commitment.status === "oc_requested" && !commitment.purchaseOrderId && (
          <Link
            href={`/ordenes/nueva?compromisoFacturaId=${commitment.id}`}
            className="btn-primary inline-flex items-center"
          >
            Generar OC
          </Link>
        )}
      </div>
    </div>
  );
}
