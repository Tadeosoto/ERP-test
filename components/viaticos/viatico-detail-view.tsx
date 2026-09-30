"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LoadingScreen } from "@/components/ui/loading-screen";
import { useFeedback } from "@/components/ui/feedback-provider";
import type { ViaticoDetailDto, ViaticoExpenseDto, ViaticoReceiptKind } from "@/lib/domain/types";
import { VIATICO_RECEIPT_LABEL } from "@/lib/viaticos/summary";
import { formatMoney } from "@/lib/format";

const money = (amount: number) => formatMoney(amount, "MXN");

const FILE_KIND_LABEL: Record<string, string> = {
  factura_pdf: "PDF",
  factura_xml: "XML",
  ticket: "Ticket",
};

function fileHref(id: string, download = false) {
  return `/api/viatico-expense-files/${id}${download ? "?download=1" : ""}`;
}

function isImage(mime: string, name: string) {
  return mime.startsWith("image/") || /\.(jpe?g|png|webp|heic|heif)$/i.test(name);
}

function SummaryCard({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">{label}</p>
      <p className={`mt-1 text-xl font-bold tabular-nums ${tone ?? "text-zinc-900"}`}>{value}</p>
    </div>
  );
}

function ReceiptFiles({ expense }: { expense: ViaticoExpenseDto }) {
  if (expense.receiptKind === "sin_comprobante") {
    return (
      <p className="rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-900">
        <span className="font-semibold">Motivo: </span>
        {expense.missingReceiptReason}
      </p>
    );
  }
  if (expense.files.length === 0) {
    return <p className="text-sm text-zinc-500">Este gasto no tiene archivos.</p>;
  }
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {expense.files.map((file) => (
        <div key={file.id} className="overflow-hidden rounded-xl border border-zinc-200 bg-zinc-50">
          {isImage(file.mimeType, file.originalFileName) && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={fileHref(file.id)} alt={file.originalFileName} className="max-h-56 w-full object-contain bg-white" />
          )}
          <div className="flex items-center justify-between gap-2 px-3 py-2">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-zinc-800">{file.originalFileName}</p>
              <p className="text-xs text-zinc-500">{FILE_KIND_LABEL[file.kind] ?? file.kind}</p>
            </div>
            <div className="flex shrink-0 gap-2 text-sm font-medium">
              <a href={fileHref(file.id)} target="_blank" rel="noreferrer" className="text-orange-700 hover:underline">
                Ver
              </a>
              <a href={fileHref(file.id, true)} className="text-zinc-600 hover:underline">
                Descargar
              </a>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function ViaticoDetailView({ viaticoId }: { viaticoId: string }) {
  const router = useRouter();
  const { showSuccess, showError } = useFeedback();
  const [viatico, setViatico] = useState<ViaticoDetailDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [receiptsOpen, setReceiptsOpen] = useState(false);
  const [concept, setConcept] = useState("");
  const [amount, setAmount] = useState("");
  const [receiptKind, setReceiptKind] = useState<ViaticoReceiptKind>("ticket");
  const [reason, setReason] = useState("");
  const [pdf, setPdf] = useState<File | null>(null);
  const [xml, setXml] = useState<File | null>(null);
  const [ticket, setTicket] = useState<File | null>(null);
  const [editingDelivered, setEditingDelivered] = useState(false);
  const [deliveredDraft, setDeliveredDraft] = useState("");

  const load = useCallback(async () => {
    const res = await fetch(`/api/viaticos/${viaticoId}`, { credentials: "include" });
    if (res.status === 404) {
      setViatico(null);
      setLoading(false);
      return;
    }
    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      showError(data?.error ?? "No se pudo abrir el viático.");
      setLoading(false);
      return;
    }
    const data = (await res.json()) as { viatico: ViaticoDetailDto };
    setViatico(data.viatico);
    setDeliveredDraft(String(data.viatico.deliveredAmount));
    setLoading(false);
  }, [showError, viaticoId]);

  useEffect(() => {
    void load();
  }, [load]);

  const allFiles = useMemo(
    () =>
      (viatico?.expenses ?? []).flatMap((expense) =>
        expense.files.map((file) => ({ ...file, concept: expense.concept, amount: expense.amount }))
      ),
    [viatico]
  );

  function resetForm() {
    setConcept("");
    setAmount("");
    setReason("");
    setPdf(null);
    setXml(null);
    setTicket(null);
    setReceiptKind("ticket");
  }

  async function addExpense(e: React.FormEvent) {
    e.preventDefault();
    if (!viatico) return;
    const form = new FormData();
    form.set("concept", concept);
    form.set("amount", amount);
    form.set("receiptKind", receiptKind);
    form.set("missingReceiptReason", reason);
    if (receiptKind === "factura") {
      if (pdf) form.append("files", pdf);
      if (xml) form.append("files", xml);
    }
    if (receiptKind === "ticket" && ticket) form.append("files", ticket);
    setSaving(true);
    const res = await fetch(`/api/viaticos/${viatico.id}/expenses`, { method: "POST", credentials: "include", body: form });
    const data = (await res.json().catch(() => null)) as { error?: string; viatico?: ViaticoDetailDto } | null;
    setSaving(false);
    if (!res.ok || !data?.viatico) {
      showError(data?.error ?? "No se pudo registrar el gasto.");
      return;
    }
    setViatico(data.viatico);
    resetForm();
    showSuccess("Gasto registrado.");
  }

  async function removeExpense(expenseId: string) {
    if (!viatico) return;
    const res = await fetch(`/api/viaticos/${viatico.id}/expenses/${expenseId}`, {
      method: "DELETE",
      credentials: "include",
    });
    const data = (await res.json().catch(() => null)) as { error?: string; viatico?: ViaticoDetailDto } | null;
    if (!res.ok || !data?.viatico) {
      showError(data?.error ?? "No se pudo quitar el gasto.");
      return;
    }
    setViatico(data.viatico);
  }

  async function saveDelivered(e: React.FormEvent) {
    e.preventDefault();
    if (!viatico) return;
    const res = await fetch(`/api/viaticos/${viatico.id}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ deliveredAmount: Number(deliveredDraft) }),
    });
    const data = (await res.json().catch(() => null)) as { error?: string; viatico?: ViaticoDetailDto } | null;
    if (!res.ok || !data?.viatico) {
      showError(data?.error ?? "No se pudo corregir el monto.");
      return;
    }
    setViatico(data.viatico);
    setEditingDelivered(false);
    showSuccess("Monto entregado actualizado.");
  }

  if (loading) return <LoadingScreen message="Cargando viático" />;
  if (!viatico) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-zinc-600">Ese viático ya no está.</p>
        <button type="button" onClick={() => router.push("/viaticos")} className="text-sm font-semibold text-orange-700">
          Volver
        </button>
      </div>
    );
  }

  const summary = viatico.summary;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href="/viaticos" className="text-sm font-medium text-orange-700 hover:underline">
            Viáticos
          </Link>
          <h1 className="mt-1 text-2xl font-bold text-zinc-900">{viatico.employeeName}</h1>
          <p className="text-sm text-zinc-500">{viatico.obraName}</p>
        </div>
        <button
          type="button"
          onClick={() => setReceiptsOpen(true)}
          className="rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-800 hover:bg-zinc-50"
        >
          Ver todos los comprobantes
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <SummaryCard label="Entregado" value={money(summary.delivered)} />
        <SummaryCard label="Gastado" value={money(summary.spent)} />
        <SummaryCard label="Facturado" value={money(summary.invoiced)} />
        <SummaryCard label="Tickets" value={money(summary.tickets)} />
        <SummaryCard label="Sin comprobante" value={money(summary.withoutReceipt)} />
        <SummaryCard
          label="Saldo por devolver"
          value={money(summary.toReturn)}
          tone={summary.toReturn < 0 ? "text-red-700" : "text-teal-800"}
        />
      </div>

      {editingDelivered ? (
        <form onSubmit={(e) => void saveDelivered(e)} className="flex flex-wrap items-end gap-3 rounded-2xl border border-zinc-200 bg-white p-4">
          <label className="text-sm">
            <span className="mb-1 block font-medium text-zinc-700">Corregir monto entregado</span>
            <input
              type="number"
              min="0.01"
              step="0.01"
              value={deliveredDraft}
              onChange={(e) => setDeliveredDraft(e.target.value)}
              className="rounded-xl border border-zinc-200 px-3 py-2"
            />
          </label>
          <button type="submit" className="rounded-xl bg-zinc-900 px-4 py-2 text-sm font-semibold text-white">
            Guardar
          </button>
          <button type="button" onClick={() => setEditingDelivered(false)} className="text-sm text-zinc-500">
            Cancelar
          </button>
        </form>
      ) : (
        <button type="button" onClick={() => setEditingDelivered(true)} className="text-sm font-medium text-zinc-500 hover:text-zinc-800">
          Corregir monto entregado
        </button>
      )}

      <section className="space-y-3">
        <h2 className="text-lg font-bold text-zinc-900">Gastos</h2>
        {viatico.expenses.length === 0 && <p className="text-sm text-zinc-500">Aún no hay gastos en esta entrega.</p>}
        {viatico.expenses.map((expense) => (
          <article key={expense.id} className="space-y-3 rounded-2xl border border-zinc-200 bg-white p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-semibold text-zinc-900">
                  {expense.concept} <span className="tabular-nums">— {money(expense.amount)}</span>
                </p>
                <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                  {VIATICO_RECEIPT_LABEL[expense.receiptKind]}
                </p>
              </div>
              <button
                type="button"
                onClick={() => void removeExpense(expense.id)}
                className="text-sm font-medium text-red-600 hover:underline"
              >
                Quitar
              </button>
            </div>
            <ReceiptFiles expense={expense} />
          </article>
        ))}
      </section>

      <form onSubmit={(e) => void addExpense(e)} className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-4">
        <h2 className="text-lg font-bold text-zinc-900">Registrar gasto</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-zinc-700">Concepto</span>
            <input
              required
              value={concept}
              onChange={(e) => setConcept(e.target.value)}
              placeholder="Comida, material, taxi…"
              maxLength={120}
              className="w-full rounded-xl border border-zinc-200 px-3 py-2.5"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-zinc-700">Monto (MXN)</span>
            <input
              required
              type="number"
              min="0.01"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full rounded-xl border border-zinc-200 px-3 py-2.5"
            />
          </label>
        </div>
        <fieldset className="space-y-2 text-sm">
          <legend className="mb-1 font-medium text-zinc-700">Comprobante de este gasto</legend>
          {(
            [
              ["factura", "Factura (PDF + XML)"],
              ["ticket", "Ticket o recibo (foto o PDF)"],
              ["sin_comprobante", "Sin comprobante"],
            ] as const
          ).map(([value, label]) => (
            <label key={value} className="flex items-center gap-2">
              <input
                type="radio"
                name="receiptKind"
                checked={receiptKind === value}
                onChange={() => setReceiptKind(value)}
              />
              {label}
            </label>
          ))}
        </fieldset>
        {receiptKind === "factura" && (
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-zinc-700">PDF</span>
              <input required type="file" accept="application/pdf,.pdf" onChange={(e) => setPdf(e.target.files?.[0] ?? null)} />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-zinc-700">XML</span>
              <input required type="file" accept=".xml,text/xml,application/xml" onChange={(e) => setXml(e.target.files?.[0] ?? null)} />
            </label>
          </div>
        )}
        {receiptKind === "ticket" && (
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-zinc-700">Foto o PDF</span>
            <input
              required
              type="file"
              accept="image/*,.pdf,application/pdf"
              onChange={(e) => setTicket(e.target.files?.[0] ?? null)}
            />
          </label>
        )}
        {receiptKind === "sin_comprobante" && (
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-zinc-700">Motivo</span>
            <textarea
              required
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              maxLength={500}
              rows={3}
              className="w-full rounded-xl border border-zinc-200 px-3 py-2.5"
            />
          </label>
        )}
        <button
          type="submit"
          disabled={saving}
          className="rounded-xl bg-orange-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-orange-700 disabled:opacity-60"
        >
          {saving ? "Guardando…" : "Agregar gasto"}
        </button>
      </form>

      {receiptsOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-zinc-900/40 p-4 sm:items-center">
          <div className="max-h-[80dvh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-5 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-zinc-900">Comprobantes</h2>
              <button type="button" onClick={() => setReceiptsOpen(false)} className="text-sm text-zinc-500">
                Cerrar
              </button>
            </div>
            {allFiles.length === 0 ? (
              <p className="text-sm text-zinc-500">Este viático no tiene archivos.</p>
            ) : (
              <ul className="divide-y divide-zinc-100">
                {allFiles.map((file) => (
                  <li key={file.id} className="flex items-center justify-between gap-3 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-zinc-900">{file.concept}</p>
                      <p className="truncate text-xs text-zinc-500">
                        {FILE_KIND_LABEL[file.kind] ?? file.kind} · {file.originalFileName} · {money(file.amount)}
                      </p>
                    </div>
                    <a href={fileHref(file.id)} target="_blank" rel="noreferrer" className="shrink-0 text-sm font-semibold text-orange-700">
                      Ver
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
