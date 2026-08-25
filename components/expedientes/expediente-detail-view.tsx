"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { LoadingScreen } from "@/components/ui/loading-screen";
import { useSession } from "@/components/session-provider";
import { useFeedback } from "@/components/ui/feedback-provider";
import { canEditExpedientes } from "@/lib/domain/expedientes";
import { FILE_KIND_LABEL } from "@/lib/domain/labels";
import { COMMITMENT_WORKFLOW_LABEL } from "@/lib/domain/recurring-commitments";
import { INVOICE_FIRST_STATUS_LABEL } from "@/lib/domain/proceso-c";
import type { ExpedienteDetailDto } from "@/lib/domain/types";
import { formatDateShort, formatMoney } from "@/lib/format";

type SortKey = "date" | "amount" | "type";

type ContentRow = {
  key: string;
  type: "OC" | "Compromiso B" | "Proceso C";
  title: string;
  href: string;
  amount: number;
  currency: string;
  status: string;
  at: string;
  files: { id: string; label: string; href: string; downloadHref: string }[];
};

type FacturaDoc = {
  key: string;
  title: string;
  source: string;
  href: string;
  downloadHref: string;
  at: string;
};

export function ExpedienteDetailView() {
  const params = useParams();
  const id = String(params.id ?? "");
  const router = useRouter();
  const { user } = useSession();
  const { showSuccess, showError } = useFeedback();
  const [exp, setExp] = useState<ExpedienteDetailDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState<SortKey>("date");
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);

  const canEdit = user ? canEditExpedientes(user.role) : false;

  const load = useCallback(async () => {
    const res = await fetch(`/api/expedientes/${encodeURIComponent(id)}`, { credentials: "include" });
    if (res.ok) {
      const d = (await res.json()) as { expediente: ExpedienteDetailDto };
      setExp(d.expediente);
      setName(d.expediente.name);
      setNotes(d.expediente.notes);
    } else {
      setExp(null);
    }
    setLoading(false);
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  const items = useMemo(() => {
    if (!exp) return [];
    const rows: {
      key: string;
      type: "OC" | "Compromiso B" | "Proceso C";
      title: string;
      href: string;
      amount: number;
      currency: string;
      status: string;
      at: string;
      files: { id: string; label: string; href: string; downloadHref: string }[];
    }[] = [];

    for (const o of exp.purchaseOrders) {
      rows.push({
        key: `oc-${o.id}`,
        type: "OC",
        title: o.ocFolio || o.title,
        href: `/ordenes/${o.id}`,
        amount: o.totalAmount,
        currency: o.currency,
        status: o.status,
        at: o.updatedAt,
        files: o.files.map((f) => ({
          id: f.id,
          label: `${FILE_KIND_LABEL[f.kind] ?? f.kind}: ${f.originalFileName}`,
          href: `/api/files/${f.id}`,
          downloadHref: `/api/files/${f.id}?download=1`,
        })),
      });
    }
    for (const c of exp.recurringCommitments) {
      rows.push({
        key: `b-${c.id}`,
        type: "Compromiso B",
        title: `${c.supplierName} — ${c.concept}`,
        href: `/inicio`,
        amount: c.estimatedAmount ?? 0,
        currency: c.currency,
        status: COMMITMENT_WORKFLOW_LABEL[c.workflowStatus as keyof typeof COMMITMENT_WORKFLOW_LABEL] ?? c.workflowStatus,
        at: c.updatedAt,
        files: c.files.map((f) => ({
          id: f.id,
          label: `${FILE_KIND_LABEL[f.kind] ?? f.kind}: ${f.originalFileName}`,
          href: `/api/recurring-commitment-files/${f.id}`,
          downloadHref: `/api/recurring-commitment-files/${f.id}?download=1`,
        })),
      });
    }
    for (const c of exp.invoiceFirstCommitments) {
      rows.push({
        key: `c-${c.id}`,
        type: "Proceso C",
        title: `Factura ${c.invoiceFolio}`,
        href: `/compromisos-c/${c.id}`,
        amount: c.displayTotal,
        currency: c.currency,
        status: INVOICE_FIRST_STATUS_LABEL[c.status] ?? c.status,
        at: c.updatedAt,
        files: c.files.map((f) => ({
          id: f.id,
          label: `Factura: ${f.originalFileName}`,
          href: `/api/invoice-first-files/${f.id}`,
          downloadHref: `/api/invoice-first-files/${f.id}?download=1`,
        })),
      });
    }

    return rows.sort((a, b) => {
      if (sort === "amount") return b.amount - a.amount;
      if (sort === "type") return a.type.localeCompare(b.type);
      return new Date(b.at).getTime() - new Date(a.at).getTime();
    });
  }, [exp, sort]);

  const facturas = useMemo(() => {
    if (!exp) return [] as FacturaDoc[];
    const docs: FacturaDoc[] = [];

    for (const c of exp.invoiceFirstCommitments) {
      for (const f of c.files) {
        docs.push({
          key: `ifc-${f.id}`,
          title: f.originalFileName,
          source: `Proceso C · Factura ${c.invoiceFolio}`,
          href: `/api/invoice-first-files/${f.id}`,
          downloadHref: `/api/invoice-first-files/${f.id}?download=1`,
          at: f.createdAt,
        });
      }
      if (c.files.length === 0) {
        docs.push({
          key: `ifc-meta-${c.id}`,
          title: `Factura ${c.invoiceFolio} (sin PDF aún)`,
          source: `Proceso C · ${c.supplierName}`,
          href: `/compromisos-c/${c.id}`,
          downloadHref: `/compromisos-c/${c.id}`,
          at: c.createdAt,
        });
      }
    }

    for (const o of exp.purchaseOrders) {
      for (const f of o.files.filter((x) => x.kind === "factura")) {
        docs.push({
          key: `ocf-${f.id}`,
          title: f.originalFileName,
          source: `OC ${o.ocFolio || o.title}`,
          href: `/api/files/${f.id}`,
          downloadHref: `/api/files/${f.id}?download=1`,
          at: f.createdAt,
        });
      }
    }

    return docs.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
  }, [exp]);

  async function saveMeta() {
    if (!exp) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/expedientes/${exp.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name, notes }),
      });
      const data = (await res.json()) as { expediente?: ExpedienteDetailDto; error?: string };
      if (!res.ok || !data.expediente) throw new Error(data.error ?? "No se pudo guardar.");
      setExp(data.expediente);
      setEditing(false);
      showSuccess("Expediente actualizado.");
    } catch (e) {
      showError(e instanceof Error ? e.message : "Error al guardar.");
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <LoadingScreen message="Cargando expediente" />;
  if (!exp) {
    return (
      <div className="card p-8">
        <p>Expediente no encontrado.</p>
        <Link href="/expedientes" className="mt-4 inline-block text-orange-700 underline">
          Volver
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href="/expedientes" className="text-sm font-medium text-orange-700 hover:underline">
            ← Expedientes
          </Link>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold text-zinc-900">{exp.folio}</h1>
            <span className="rounded-full bg-sky-50 px-2.5 py-0.5 text-xs font-semibold text-sky-800 ring-1 ring-sky-100">
              {exp.statusLabel}
            </span>
          </div>
          {editing ? (
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-2 w-full max-w-lg rounded-xl border border-zinc-200 px-3 py-2 text-lg font-semibold"
            />
          ) : (
            <p className="mt-1 text-lg font-semibold text-zinc-800">{exp.name}</p>
          )}
          {exp.obraName && <p className="text-sm text-violet-700">Obra: {exp.obraName}</p>}
        </div>
        <div className="flex flex-wrap gap-2">
          {canEdit && !editing && (
            <button type="button" className="btn-secondary" onClick={() => setEditing(true)}>
              Editar
            </button>
          )}
          {canEdit && editing && (
            <>
              <button type="button" className="btn-secondary" disabled={busy} onClick={() => setEditing(false)}>
                Cancelar
              </button>
              <button type="button" className="btn-primary" disabled={busy} onClick={() => void saveMeta()}>
                Guardar
              </button>
            </>
          )}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="card p-4">
          <p className="text-[11px] font-semibold uppercase text-zinc-500">Total</p>
          <p className="mt-1 text-xl font-bold tabular-nums">{formatMoney(exp.totalAmount, exp.currency)}</p>
        </div>
        <div className="card p-4">
          <p className="text-[11px] font-semibold uppercase text-zinc-500">Pagado</p>
          <p className="mt-1 text-xl font-bold tabular-nums text-emerald-700">
            {formatMoney(exp.amountPaidSoFar, exp.currency)}
          </p>
        </div>
        <div className="card p-4">
          <p className="text-[11px] font-semibold uppercase text-zinc-500">Saldo</p>
          <p className="mt-1 text-xl font-bold tabular-nums text-orange-700">
            {formatMoney(exp.amountRemaining, exp.currency)}
          </p>
        </div>
      </div>

      {(() => {
        const total = exp.totalAmount > 0 ? exp.totalAmount : 0;
        const pct =
          total > 0
            ? Math.min(100, Math.max(0, Math.round((exp.amountPaidSoFar / total) * 100)))
            : 0;
        return (
          <div className="card p-4">
            <div className="mb-1.5 flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-zinc-600">Avance de pago del expediente</span>
              <span className="text-sm font-bold tabular-nums text-teal-800">{pct}%</span>
            </div>
            <div
              className="h-3 w-full overflow-hidden rounded-full bg-zinc-200"
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
            <p className="mt-1.5 text-xs text-zinc-500">
              {formatMoney(exp.amountPaidSoFar, exp.currency)} pagado ·{" "}
              {formatMoney(exp.amountRemaining, exp.currency)} faltante
            </p>
          </div>
        );
      })()}

      {(editing || exp.notes) && (
        <section className="card p-5">
          <h2 className="text-sm font-bold text-zinc-900">Notas</h2>
          {editing ? (
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="mt-2 w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm"
            />
          ) : (
            <p className="mt-2 whitespace-pre-wrap text-sm text-zinc-700">{exp.notes || "—"}</p>
          )}
        </section>
      )}

      <section className="card p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-bold text-zinc-900">Facturas</h2>
          {facturas.length > 0 && (
            <span className="rounded-full bg-violet-100 px-2.5 py-0.5 text-xs font-semibold text-violet-800">
              {facturas.length} archivo{facturas.length === 1 ? "" : "s"}
            </span>
          )}
        </div>
        <p className="mt-1 text-xs text-zinc-500">
          Cada «Agregar Factura» crea un registro Proceso C. Puedes tener varias facturas en el mismo
          expediente. También aparecen facturas subidas en la OC.
        </p>
        {facturas.length === 0 ? (
          <p className="mt-4 rounded-xl border border-dashed border-zinc-200 px-4 py-6 text-center text-sm text-zinc-500">
            Aún no hay facturas en este expediente. Al crear una en «Agregar Factura», elige este
            expediente para que aparezca aquí.
          </p>
        ) : (
          <ul className="mt-4 space-y-2">
            {facturas.map((f) => (
              <li
                key={f.key}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-violet-100 bg-violet-50/40 px-3 py-2.5"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-zinc-900">{f.title}</p>
                  <p className="text-xs text-zinc-500">
                    {f.source} · {formatDateShort(f.at)}
                  </p>
                </div>
                <span className="flex gap-2">
                  <a
                    href={f.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-semibold text-orange-700 hover:underline"
                  >
                    Ver
                  </a>
                  {!f.downloadHref.startsWith("/compromisos-c") && (
                    <a href={f.downloadHref} className="text-xs font-semibold text-teal-700 hover:underline">
                      Descargar
                    </a>
                  )}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-bold text-zinc-900">Contenido del expediente</h2>
          <label className="flex items-center gap-2 text-xs text-zinc-600">
            Ordenar
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
              className="rounded-lg border border-zinc-200 px-2 py-1"
            >
              <option value="date">Fecha</option>
              <option value="amount">Monto</option>
              <option value="type">Tipo</option>
            </select>
          </label>
        </div>

        {canEdit && (
          <p className="mt-2 text-xs text-zinc-500">
            Administración y Dirección pueden abrir cada ítem para editarlo (p. ej. agregar comprobante o
            folio de OC después).
          </p>
        )}

        <ul className="mt-4 space-y-3">
          {items.length === 0 ? (
            <li className="rounded-xl border border-dashed border-zinc-200 px-4 py-8 text-center text-sm text-zinc-500">
              Este expediente aún no tiene OC, compromisos ni pagos Proceso C.
            </li>
          ) : (
            items.map((row) => (
              <li key={row.key} className="rounded-2xl border border-zinc-100 p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wide text-violet-700">
                      {row.type}
                    </span>
                    <Link href={row.href} className="mt-0.5 block font-semibold text-zinc-900 hover:underline">
                      {row.title}
                    </Link>
                    <p className="text-xs text-zinc-500">
                      {row.status} · {formatDateShort(row.at)}
                    </p>
                  </div>
                  <p className="font-bold tabular-nums text-zinc-900">
                    {formatMoney(row.amount, row.currency)}
                  </p>
                </div>
                {row.files.length > 0 && (
                  <ul className="mt-3 space-y-1 border-t border-zinc-50 pt-3">
                    {row.files.map((f) => (
                      <li key={f.id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                        <span className="truncate text-zinc-700">{f.label}</span>
                        <span className="flex gap-2">
                          <a href={f.href} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold text-orange-700 hover:underline">
                            Ver
                          </a>
                          <a href={f.downloadHref} className="text-xs font-semibold text-teal-700 hover:underline">
                            Descargar
                          </a>
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
                {canEdit && (
                  <Link href={row.href} className="mt-3 inline-block text-xs font-semibold text-sky-700 hover:underline">
                    Abrir para editar →
                  </Link>
                )}
              </li>
            ))
          )}
        </ul>
      </section>

      <div className="flex gap-2 pb-8">
        <button type="button" className="btn-secondary" onClick={() => router.push("/expedientes")}>
          Volver a la lista
        </button>
      </div>
    </div>
  );
}
