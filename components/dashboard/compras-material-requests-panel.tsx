"use client";

import Link from "next/link";
import type { MaterialRequestDto } from "@/lib/domain/types";
import { MATERIAL_REQUEST_STATUS_LABEL } from "@/lib/domain/solicitudes";
import { formatDateShort } from "@/lib/format";

export function ComprasMaterialRequestsPanel({ requests }: { requests: MaterialRequestDto[] }) {
  const pending = requests.filter((r) => r.status === "sent");

  if (pending.length === 0) return null;

  return (
    <section className="card shrink-0 p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-base font-bold text-zinc-900 sm:text-lg">Solicitudes de Ingeniería</h2>
          <p className="text-xs text-zinc-500">Proceso A — cotiza, crea la OC y sube el PDF</p>
        </div>
        <span className="rounded-full bg-orange-100 px-3 py-1 text-xs font-semibold text-orange-800">
          {pending.length} pendiente{pending.length === 1 ? "" : "s"}
        </span>
      </div>
      <ul className="mt-3 divide-y divide-orange-50">
        {pending.slice(0, 5).map((r) => (
          <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 py-3 first:pt-0">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-zinc-900">{r.obraName}</p>
              <p className="truncate text-xs text-zinc-600">{r.materials}</p>
              <p className="text-xs text-zinc-400">
                {r.createdByName} · {r.sentAt ? formatDateShort(r.sentAt) : "—"} ·{" "}
                {MATERIAL_REQUEST_STATUS_LABEL[r.status]}
              </p>
            </div>
            <Link
              href={`/ordenes/nueva?solicitudId=${r.id}`}
              className="btn-primary shrink-0 text-xs"
            >
              Crear OC
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
