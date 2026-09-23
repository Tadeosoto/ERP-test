"use client";

import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { MaterialLinesEditor } from "@/components/solicitudes/material-lines-editor";
import { LoadingScreen } from "@/components/ui/loading-screen";
import { useFeedback } from "@/components/ui/feedback-provider";
import { useSession } from "@/components/session-provider";
import type { MaterialRequestDto, ObraDto } from "@/lib/domain/types";
import {
  canDeleteMaterialRequest,
  canEditMaterialRequest,
  canSendMaterialRequest,
  MATERIAL_REQUEST_STATUS_LABEL,
} from "@/lib/domain/solicitudes";
import { canActAsCompras } from "@/lib/domain/transitions";
import { formatDateTime } from "@/lib/format";
import {
  parseMaterialLines,
  serializeMaterialLines,
  validateMaterialLines,
  type MaterialLine,
} from "@/lib/solicitudes/material-lines";

const inputCls =
  "mt-1.5 block w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm shadow-sm focus:border-orange-300 focus:outline-none focus:ring-1 focus:ring-orange-200";

function MaterialRequestDetailInner() {
  const { id } = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const { user } = useSession();
  const router = useRouter();
  const { showSuccess, showError } = useFeedback();
  const canManage = user ? canActAsCompras(user.role) : false;
  const backHref = canManage ? "/solicitudes-ingenieria" : "/solicitudes/nueva";

  const [req, setReq] = useState<MaterialRequestDto | null>(null);
  const [obras, setObras] = useState<ObraDto[]>([]);
  const [editing, setEditing] = useState(searchParams.get("edit") === "1");
  const [busy, setBusy] = useState(false);
  const [obraId, setObraId] = useState("");
  const [lines, setLines] = useState<MaterialLine[]>([]);
  const [justification, setJustification] = useState("");

  const load = useCallback(async () => {
    const [res, oRes] = await Promise.all([
      fetch(`/api/material-requests/${id}`, { credentials: "include" }),
      fetch("/api/obras", { credentials: "include" }),
    ]);
    if (res.ok) {
      const d = (await res.json()) as { request: MaterialRequestDto };
      setReq(d.request);
      setObraId(d.request.obraId);
      setLines(parseMaterialLines(d.request.materials, d.request.quantities));
      setJustification(d.request.justification);
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

  const viewLines = useMemo(
    () => (req ? parseMaterialLines(req.materials, req.quantities) : []),
    [req]
  );

  const canEdit = Boolean(
    user &&
      req &&
      canEditMaterialRequest(req.status, user.role, req.createdByUserId, user.id) &&
      !req.purchaseOrderId
  );
  const canDelete = Boolean(
    user &&
      req &&
      canDeleteMaterialRequest(
        req.status,
        user.role,
        req.createdByUserId,
        user.id,
        Boolean(req.purchaseOrderId)
      )
  );
  const canSend = Boolean(
    user && req && canSendMaterialRequest(req.status, user.role, req.createdByUserId, user.id)
  );

  async function saveEdit() {
    const err = validateMaterialLines(lines);
    if (err) {
      showError(err);
      return;
    }
    if (!obraId) {
      showError("Selecciona una obra.");
      return;
    }
    setBusy(true);
    try {
      const { materials, quantities } = serializeMaterialLines(lines);
      const res = await fetch(`/api/material-requests/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ obraId, materials, quantities, justification }),
      });
      const data = (await res.json()) as { error?: string; request?: MaterialRequestDto };
      if (!res.ok) throw new Error(data.error ?? "No se pudo guardar.");
      if (data.request) setReq(data.request);
      setEditing(false);
      router.replace(`/solicitudes/material/${id}`);
      showSuccess("Solicitud actualizada.");
    } catch (e) {
      showError(e instanceof Error ? e.message : "Error al guardar.");
    } finally {
      setBusy(false);
    }
  }

  async function sendRequest() {
    setBusy(true);
    try {
      if (editing) {
        const err = validateMaterialLines(lines);
        if (err) throw new Error(err);
        const { materials, quantities } = serializeMaterialLines(lines);
        const patchRes = await fetch(`/api/material-requests/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ obraId, materials, quantities, justification }),
        });
        const patchData = (await patchRes.json()) as { error?: string };
        if (!patchRes.ok) throw new Error(patchData.error ?? "No se pudo guardar.");
      }
      const res = await fetch(`/api/material-requests/${id}/actions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ action: "send" }),
      });
      const data = (await res.json()) as { error?: string; request?: MaterialRequestDto };
      if (!res.ok) throw new Error(data.error ?? "No se pudo enviar.");
      if (data.request) setReq(data.request);
      setEditing(false);
      router.replace(`/solicitudes/material/${id}`);
      showSuccess("Solicitud enviada a Compras.");
      await load();
    } catch (e) {
      showError(e instanceof Error ? e.message : "Error al enviar.");
    } finally {
      setBusy(false);
    }
  }

  async function deleteRequest() {
    if (!window.confirm("¿Eliminar esta solicitud? Esta acción no se puede deshacer.")) {
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(`/api/material-requests/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "No se pudo eliminar.");
      showSuccess("Solicitud eliminada.");
      router.push(backHref);
    } catch (e) {
      showError(e instanceof Error ? e.message : "Error al eliminar.");
    } finally {
      setBusy(false);
    }
  }

  if (!req) return <LoadingScreen message="Cargando solicitud" />;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase text-orange-600">Proceso A · Solicitud de material</p>
          <h1 className="text-2xl font-bold text-zinc-900">{req.obraName}</h1>
          <p className="mt-1 text-sm text-zinc-500">
            {MATERIAL_REQUEST_STATUS_LABEL[req.status]}
            {req.sentAt ? ` · Enviada ${formatDateTime(req.sentAt)}` : ""}
          </p>
          <p className="mt-1 text-sm text-zinc-600">Ingeniero: {req.createdByName}</p>
        </div>
        {(canEdit || canDelete) && !editing && (
          <div className="flex flex-wrap gap-2">
            {canEdit && (
              <button
                type="button"
                className="btn-secondary text-sm"
                onClick={() => {
                  setEditing(true);
                  router.replace(`/solicitudes/material/${id}?edit=1`);
                }}
              >
                Editar
              </button>
            )}
            {canDelete && (
              <button
                type="button"
                className="btn-danger text-sm"
                disabled={busy}
                onClick={() => void deleteRequest()}
              >
                Eliminar
              </button>
            )}
          </div>
        )}
      </header>

      {editing && canEdit ? (
        <section className="card space-y-5 border-orange-200 p-5 sm:p-6">
          <div>
            <h2 className="font-bold text-zinc-900">Editar solicitud</h2>
            <p className="mt-0.5 text-xs text-zinc-500">
              Corrige obra, materiales o justificación. Puedes editar mientras no haya OC.
            </p>
          </div>
          <label className="block">
            <span className="text-sm font-medium">Obra *</span>
            <select
              value={obraId}
              onChange={(e) => setObraId(e.target.value)}
              className={inputCls}
              disabled={busy}
            >
              {obras.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </select>
          </label>
          <MaterialLinesEditor lines={lines} onChange={setLines} disabled={busy} />
          <label className="block">
            <span className="text-sm font-medium">Justificación</span>
            <textarea
              value={justification}
              onChange={(e) => setJustification(e.target.value)}
              rows={3}
              className={inputCls}
              disabled={busy}
            />
          </label>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn-primary" disabled={busy} onClick={() => void saveEdit()}>
              {busy ? "Guardando…" : "Guardar cambios"}
            </button>
            {canSend && (
              <button
                type="button"
                className="btn-secondary"
                disabled={busy}
                onClick={() => void sendRequest()}
              >
                Guardar y enviar
              </button>
            )}
            <button
              type="button"
              className="btn-secondary"
              disabled={busy}
              onClick={() => {
                setEditing(false);
                setObraId(req.obraId);
                setLines(parseMaterialLines(req.materials, req.quantities));
                setJustification(req.justification);
                router.replace(`/solicitudes/material/${id}`);
              }}
            >
              Cancelar
            </button>
          </div>
        </section>
      ) : (
        <section className="card space-y-4 p-5">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">Materiales</p>
            {viewLines.length === 0 ? (
              <p className="whitespace-pre-wrap text-sm text-zinc-700">{req.materials || "—"}</p>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-zinc-200">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-orange-50 text-xs font-semibold uppercase tracking-wide text-orange-900">
                    <tr>
                      <th className="px-3 py-2">Cant.</th>
                      <th className="px-3 py-2">Unidad</th>
                      <th className="px-3 py-2">Código</th>
                      <th className="px-3 py-2">Descripción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 bg-white">
                    {viewLines.map((l) => (
                      <tr key={l.id}>
                        <td className="px-3 py-2.5 tabular-nums font-medium">{l.quantity}</td>
                        <td className="px-3 py-2.5 uppercase text-zinc-600">{l.unit}</td>
                        <td className="px-3 py-2.5 font-mono text-xs text-zinc-700">{l.code || "—"}</td>
                        <td className="px-3 py-2.5 text-zinc-800">{l.description}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          <div>
            <p className="text-xs text-zinc-500">Justificación</p>
            <p className="whitespace-pre-wrap">{req.justification || "—"}</p>
          </div>
          {req.attachments.length > 0 && (
            <ul className="space-y-2">
              {req.attachments.map((a) => (
                <li key={a.id}>
                  <a
                    href={`/api/solicitud-files/${a.id}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm font-medium text-orange-700 underline"
                  >
                    {a.originalFileName}
                  </a>
                </li>
              ))}
            </ul>
          )}
          <div className="flex flex-wrap gap-2 pt-2">
            {canSend && (
              <button
                type="button"
                className="btn-primary inline-flex"
                disabled={busy}
                onClick={() => void sendRequest()}
              >
                Enviar a Compras
              </button>
            )}
            {canManage && req.status === "sent" && (
              <Link href={`/ordenes/nueva?solicitudId=${req.id}`} className="btn-primary inline-flex">
                Crear OC
              </Link>
            )}
            {req.purchaseOrderId && (
              <Link href={`/ordenes/${req.purchaseOrderId}`} className="btn-secondary inline-flex">
                Ver orden de compra
              </Link>
            )}
          </div>
        </section>
      )}

      <Link href={backHref} className="text-sm text-zinc-500 underline">
        Volver a solicitudes
      </Link>
    </div>
  );
}

export default function MaterialRequestDetailPage() {
  return (
    <Suspense fallback={<LoadingScreen message="Cargando solicitud" />}>
      <MaterialRequestDetailInner />
    </Suspense>
  );
}
