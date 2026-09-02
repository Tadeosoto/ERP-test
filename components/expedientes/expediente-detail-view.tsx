"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { LoadingScreen } from "@/components/ui/loading-screen";
import { useSession } from "@/components/session-provider";
import { useFeedback } from "@/components/ui/feedback-provider";
import { canEditExpedientes } from "@/lib/domain/expedientes";
import { FILE_KIND_LABEL } from "@/lib/domain/labels";
import { INVOICE_FIRST_STATUS_LABEL } from "@/lib/domain/proceso-c";
import type { ExpedienteDetailDto } from "@/lib/domain/types";
import { formatDateShort, formatMoney } from "@/lib/format";

type SortKey = "date" | "amount" | "type";

type ContentRow = {
  key: string;
  type: "OC" | "Proceso C";
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
      type: "OC" | "Proceso C";
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
      <div className="dash-panel p-8">
        <p>Expediente no encontrado.</p>
        <Link href="/expedientes" className="mt-4 inline-block text-orange-700 underline">
          Volver
        </Link>
      </div>
    );
  }

  const total = exp.totalAmount > 0 ? exp.totalAmount : 0;
  const pct =
    total > 0
      ? Math.min(100, Math.max(0, Math.round((exp.amountPaidSoFar / total) * 100)))
      : 0;

  return (
    <div className="space-y-3 sm:space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <Link href="/expedientes" className="text-sm font-medium text-orange-700 hover:underline">
            ← Expedientes
          </Link>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <h1 className="dash-page-title text-xl sm:text-2xl">{exp.folio}</h1>
            <span className="rounded-full bg-sky-50 px-2.5 py-0.5 text-xs font-semibold text-sky-800 ring-1 ring-sky-100">
              {exp.statusLabel}
            </span>
          </div>
          {editing ? (
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-2 w-full max-w-lg rounded-xl border border-zinc-200 px-3 py-2 text-base font-semibold"
            />
          ) : (
            <p className="mt-0.5 text-base font-semibold text-zinc-800">{exp.name}</p>
          )}
          {exp.obraName && exp.obraId && (
            <Link href={`/obras/${exp.obraId}`} className="dash-caption text-violet-700 hover:underline">
              Obra: {exp.obraName}
            </Link>
          )}
          {exp.obraName && !exp.obraId && (
            <p className="dash-caption text-violet-700">Obra: {exp.obraName}</p>
          )}
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

      {/* Progreso primero; totales como apoyo debajo */}
      <div className="dash-panel p-3 sm:p-4">
        <div className="mb-1.5 flex items-center justify-between gap-2">
          <span className="dash-section-title text-zinc-800">Avance de pago</span>
          <span className="text-lg font-bold tabular-nums text-teal-800 sm:text-xl">{pct}%</span>
        </div>
        <div
          className="h-2.5 w-full overflow-hidden rounded-full bg-zinc-200 sm:h-3"
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Pagado ${pct} por ciento`}
        >
          <div
            className="h-full rounded-full bg-teal-500 transition-[width] duration-500 ease-out"
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2">
          <div className="rounded-xl border border-zinc-100 bg-zinc-50/80 px-2.5 py-2">
            <p className="dash-label text-zinc-500">Total</p>
            <p className="mt-0.5 text-sm font-bold tabular-nums text-zinc-900 sm:text-base">
              {formatMoney(exp.totalAmount, exp.currency)}
            </p>
          </div>
          <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 px-2.5 py-2">
            <p className="dash-label text-zinc-500">Pagado</p>
            <p className="mt-0.5 text-sm font-bold tabular-nums text-emerald-800 sm:text-base">
              {formatMoney(exp.amountPaidSoFar, exp.currency)}
            </p>
          </div>
          <div className="rounded-xl border border-orange-100 bg-orange-50/50 px-2.5 py-2">
            <p className="dash-label text-zinc-500">Saldo</p>
            <p className="mt-0.5 text-sm font-bold tabular-nums text-orange-800 sm:text-base">
              {formatMoney(exp.amountRemaining, exp.currency)}
            </p>
          </div>
        </div>
      </div>

      <div className="grid items-start gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(15rem,20rem)] xl:grid-cols-[minmax(0,1fr)_minmax(16rem,22rem)] lg:gap-4">
        <section className="dash-panel min-w-0 p-3 sm:p-4 lg:col-start-1 lg:row-start-1 lg:row-span-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="dash-section-title">Contenido del expediente</h2>
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
            <p className="mt-1.5 dash-caption text-zinc-500">
              Administración y Dirección pueden abrir cada ítem para editarlo.
            </p>
          )}

          <ul className="mt-3 space-y-2">
            {items.length === 0 ? (
              <li className="rounded-xl border border-dashed border-zinc-200 px-4 py-8 text-center text-sm text-zinc-500">
                Este expediente aún no tiene OC ni pagos Proceso C.
              </li>
            ) : (
              items.map((row) => (
                <li key={row.key} className="rounded-xl border border-zinc-100 px-3 py-2.5">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <span className="text-[10px] font-bold uppercase tracking-wide text-violet-700">
                        {row.type}
                      </span>
                      <Link
                        href={row.href}
                        className="mt-0.5 block truncate font-semibold text-zinc-900 hover:underline"
                      >
                        {row.title}
                      </Link>
                      <p className="text-xs text-zinc-500">
                        {row.status} · {formatDateShort(row.at)}
                      </p>
                    </div>
                    <p className="shrink-0 font-bold tabular-nums text-zinc-900">
                      {formatMoney(row.amount, row.currency)}
                    </p>
                  </div>
                  {row.files.length > 0 && (
                    <ul className="mt-2 space-y-1 border-t border-zinc-50 pt-2">
                      {row.files.map((f) => (
                        <li key={f.id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                          <span className="truncate text-xs text-zinc-700">{f.label}</span>
                          <span className="flex gap-2">
                            <a
                              href={f.href}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs font-semibold text-orange-700 hover:underline"
                            >
                              Ver
                            </a>
                            <a
                              href={f.downloadHref}
                              className="text-xs font-semibold text-teal-700 hover:underline"
                            >
                              Descargar
                            </a>
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                  {canEdit && (
                    <Link
                      href={row.href}
                      className="mt-2 inline-block text-xs font-semibold text-sky-700 hover:underline"
                    >
                      Abrir para editar →
                    </Link>
                  )}
                </li>
              ))
            )}
          </ul>
        </section>

        <aside className="flex min-w-0 flex-col gap-3 sm:gap-4 lg:col-start-2 lg:row-start-1 lg:row-span-2 lg:sticky lg:top-20">
          {(editing || exp.notes) && (
            <section className="dash-panel p-3">
              <h2 className="dash-section-title">Notas</h2>
              {editing ? (
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={4}
                  className="mt-2 w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm"
                />
              ) : (
                <p className="mt-2 whitespace-pre-wrap text-xs leading-snug text-zinc-700">
                  {exp.notes || "—"}
                </p>
              )}
            </section>
          )}

          <section className="dash-panel p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="dash-section-title">Facturas</h2>
              {facturas.length > 0 && (
                <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-semibold text-violet-800">
                  {facturas.length}
                </span>
              )}
            </div>
            <p className="mt-1 text-[11px] leading-snug text-zinc-500">
              Proceso C y facturas de OC en este expediente.
            </p>
            {facturas.length === 0 ? (
              <p className="mt-3 rounded-xl border border-dashed border-zinc-200 px-3 py-4 text-center text-xs text-zinc-500">
                Sin facturas aún.
              </p>
            ) : (
              <ul className="mt-2 max-h-[28rem] space-y-2 overflow-y-auto pr-0.5">
                {facturas.map((f) => (
                  <li
                    key={f.key}
                    className="rounded-xl border border-violet-100 bg-violet-50/40 px-2.5 py-2"
                  >
                    <p className="truncate text-xs font-semibold text-zinc-900">{f.title}</p>
                    <p className="mt-0.5 text-[11px] leading-snug text-zinc-500">
                      {f.source}
                      <br />
                      {formatDateShort(f.at)}
                    </p>
                    <span className="mt-1.5 flex gap-2">
                      <a
                        href={f.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[11px] font-semibold text-orange-700 hover:underline"
                      >
                        Ver
                      </a>
                      {!f.downloadHref.startsWith("/compromisos-c") && (
                        <a
                          href={f.downloadHref}
                          className="text-[11px] font-semibold text-teal-700 hover:underline"
                        >
                          Descargar
                        </a>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </aside>
      </div>

      <div className="pb-4">
        <button type="button" className="btn-secondary" onClick={() => router.push("/expedientes")}>
          Volver a la lista
        </button>
      </div>
    </div>
  );
}
