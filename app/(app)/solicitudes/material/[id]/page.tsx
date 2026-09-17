"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { LoadingScreen } from "@/components/ui/loading-screen";
import { useSession } from "@/components/session-provider";
import type { MaterialRequestDto } from "@/lib/domain/types";
import { MATERIAL_REQUEST_STATUS_LABEL } from "@/lib/domain/solicitudes";
import { canActAsCompras } from "@/lib/domain/transitions";
import { formatDateTime } from "@/lib/format";
import { parseMaterialLines } from "@/lib/solicitudes/material-lines";

export default function MaterialRequestDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useSession();
  const canManage = user ? canActAsCompras(user.role) : false;
  const backHref = canManage ? "/solicitudes-ingenieria" : "/inicio";

  const [req, setReq] = useState<MaterialRequestDto | null>(null);

  useEffect(() => {
    void (async () => {
      const res = await fetch(`/api/material-requests/${id}`, { credentials: "include" });
      if (res.ok) {
        const d = (await res.json()) as { request: MaterialRequestDto };
        setReq(d.request);
      }
    })();
  }, [id]);

  const lines = useMemo(
    () => (req ? parseMaterialLines(req.materials, req.quantities) : []),
    [req]
  );

  if (!req) return <LoadingScreen message="Cargando solicitud" />;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header>
        <p className="text-xs font-bold uppercase text-orange-600">Proceso A · Solicitud de material</p>
        <h1 className="text-2xl font-bold text-zinc-900">{req.obraName}</h1>
        <p className="mt-1 text-sm text-zinc-500">
          {MATERIAL_REQUEST_STATUS_LABEL[req.status]}
          {req.sentAt ? ` · Enviada ${formatDateTime(req.sentAt)}` : ""}
        </p>
        <p className="mt-1 text-sm text-zinc-600">Ingeniero: {req.createdByName}</p>
      </header>

      <section className="card space-y-4 p-5">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
            Materiales
          </p>
          {lines.length === 0 ? (
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
                  {lines.map((l) => (
                    <tr key={l.id}>
                      <td className="px-3 py-2.5 tabular-nums font-medium">{l.quantity}</td>
                      <td className="px-3 py-2.5 uppercase text-zinc-600">{l.unit}</td>
                      <td className="px-3 py-2.5 font-mono text-xs text-zinc-700">
                        {l.code || "—"}
                      </td>
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

      <Link href={backHref} className="text-sm text-zinc-500 underline">
        Volver a solicitudes
      </Link>
    </div>
  );
}
