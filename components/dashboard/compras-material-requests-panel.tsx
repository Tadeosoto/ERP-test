"use client";

import Link from "next/link";
import type { MaterialRequestDto } from "@/lib/domain/types";
import { MATERIAL_REQUEST_STATUS_LABEL } from "@/lib/domain/solicitudes";
import { formatDateShort } from "@/lib/format";

export function ComprasMaterialRequestsPanel({
  requests,
  compact = false,
}: {
  requests: MaterialRequestDto[];
  compact?: boolean;
}) {
  const pending = requests.filter((r) => r.status === "sent");

  if (pending.length === 0) return null;

  return (
    <section className={`card shrink-0 border-orange-100 ${compact ? "px-3 py-2.5" : "p-4 sm:p-5"}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <h2 className={`font-bold text-zinc-900 ${compact ? "text-sm" : "text-base sm:text-lg"}`}>
            Solicitudes de Ingeniería
          </h2>
          {!compact && (
            <p className="text-xs text-zinc-500">Proceso A — cotiza, crea la OC y sube el PDF</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-orange-100 px-3 py-1 text-xs font-semibold text-orange-800">
            {pending.length} pendiente{pending.length === 1 ? "" : "s"}
          </span>
          <Link href="/solicitudes-ingenieria" className="text-xs font-semibold text-orange-700 hover:underline">
            Ver todas →
          </Link>
        </div>
      </div>
      <ul className={compact ? "mt-1.5 divide-y divide-orange-50" : "mt-3 divide-y divide-orange-50"}>
        {pending.slice(0, compact ? 4 : 5).map((r) => (
          <li
            key={r.id}
            className={`flex items-center justify-between gap-3 ${compact ? "py-1.5" : "flex-wrap py-3 first:pt-0"}`}
          >
            <div className="min-w-0 flex-1">
              <p className={`truncate font-semibold text-zinc-900 ${compact ? "text-xs" : "text-sm"}`}>
                {r.obraName}
                {compact ? (
                  <span className="font-normal text-zinc-500"> · {r.materials}</span>
                ) : null}
              </p>
              {!compact && <p className="truncate text-xs text-zinc-600">{r.materials}</p>}
              <p className={`truncate text-zinc-400 ${compact ? "text-[10px]" : "text-xs"}`}>
                {r.createdByName} · {r.sentAt ? formatDateShort(r.sentAt) : "—"} ·{" "}
                {MATERIAL_REQUEST_STATUS_LABEL[r.status]}
              </p>
            </div>
            <Link
              href={`/ordenes/nueva?solicitudId=${r.id}`}
              className={`btn-primary shrink-0 ${compact ? "px-2.5 py-1 text-[11px]" : "text-xs"}`}
            >
              Crear OC
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
