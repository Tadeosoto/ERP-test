"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { LoadingScreen } from "@/components/ui/loading-screen";
import type { MaterialRequestDto } from "@/lib/domain/types";
import { MATERIAL_REQUEST_STATUS_LABEL } from "@/lib/domain/solicitudes";
import { formatDateShort } from "@/lib/format";

export default function MaterialRequestDetailPage() {
  const { id } = useParams<{ id: string }>();
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

  if (!req) return <LoadingScreen message="Cargando solicitud" />;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <header>
        <p className="text-xs font-bold uppercase text-orange-600">Proceso A · Solicitud de material</p>
        <h1 className="text-2xl font-bold text-zinc-900">{req.obraName}</h1>
        <p className="mt-1 text-sm text-zinc-500">
          {MATERIAL_REQUEST_STATUS_LABEL[req.status]}
          {req.sentAt ? ` · Enviada ${formatDateShort(req.sentAt)}` : ""}
        </p>
      </header>

      <section className="card space-y-4 p-5">
        <div>
          <p className="text-xs text-zinc-500">Centro de costo</p>
          <p className="font-medium">{req.costCenter || "—"}</p>
        </div>
        <div>
          <p className="text-xs text-zinc-500">Materiales</p>
          <p className="whitespace-pre-wrap">{req.materials}</p>
        </div>
        <div>
          <p className="text-xs text-zinc-500">Cantidades</p>
          <p className="whitespace-pre-wrap">{req.quantities || "—"}</p>
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
        {req.purchaseOrderId && (
          <Link href={`/ordenes/${req.purchaseOrderId}`} className="btn-primary inline-flex">
            Ver orden de compra
          </Link>
        )}
      </section>

      <Link href="/inicio" className="text-sm text-zinc-500 underline">
        Volver al inicio
      </Link>
    </div>
  );
}
