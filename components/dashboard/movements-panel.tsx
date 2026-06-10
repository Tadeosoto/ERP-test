import Link from "next/link";
import { RoleActivityIcon } from "@/components/dashboard/role-activity-icon";
import { roleActivityLabel } from "@/lib/dashboard/role-activity-style";
import { ROLE_LABEL } from "@/lib/domain/labels";
import type { MovementDto, PendingMovementDto } from "@/lib/domain/types";
import { formatDateTime } from "@/lib/format";
import { PANEL_HOVER_ROW, PANEL_SURFACE } from "@/lib/dashboard/panel-surfaces";

type MovementsPanelProps = {
  title: string;
  viewAllHref: string;
  empty: string;
  variant: "recent" | "pending";
  recent?: MovementDto[];
  pending?: PendingMovementDto[];
};

export function MovementsPanel({
  title,
  viewAllHref,
  empty,
  variant,
  recent = [],
  pending = [],
}: MovementsPanelProps) {
  const hasItems = variant === "recent" ? recent.length > 0 : pending.length > 0;
  const surface = variant === "recent" ? "movimientos" : "pendientes";
  const rowHover = PANEL_HOVER_ROW[surface] ?? "";

  return (
    <section className={`flex min-h-0 flex-col rounded-2xl border p-4 shadow-sm ${PANEL_SURFACE[surface]}`}>
      <h2 className="text-base font-semibold text-zinc-800">{title}</h2>

      <ul className="mt-3 min-h-0 flex-1 space-y-3 overflow-y-auto lg:max-h-52">
        {!hasItems ? (
          <li className="py-6 text-center text-sm text-zinc-400">{empty}</li>
        ) : variant === "recent" ? (
          recent.map((m) => (
            <li key={m.id}>
              <Link
                href={`/ordenes/${m.orderId}`}
                className={`flex gap-3 rounded-xl border border-transparent p-1 transition ${rowHover}`}
              >
                <RoleActivityIcon role={m.role} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-zinc-800">
                    {roleActivityLabel(m.role, m.actorName)}
                  </p>
                  <p className="mt-0.5 text-sm leading-snug text-zinc-700">{m.description}</p>
                  <p className="mt-0.5 truncate text-xs text-zinc-500">{m.context}</p>
                  <p className="mt-1 text-xs tabular-nums text-zinc-400">{formatDateTime(m.createdAt)}</p>
                </div>
              </Link>
            </li>
          ))
        ) : (
          pending.map((m) => (
            <li key={m.id}>
              <Link
                href={`/ordenes/${m.orderId}`}
                className={`flex gap-3 rounded-xl border border-transparent p-1 transition ${rowHover}`}
              >
                <RoleActivityIcon role={m.role} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-zinc-800">
                    Pendiente · {ROLE_LABEL[m.role]}
                  </p>
                  <p className="mt-0.5 text-sm leading-snug text-zinc-700">{m.description}</p>
                  <p className="mt-0.5 truncate text-xs text-zinc-500">
                    {m.obraName} · {m.orderTitle}
                  </p>
                  <p className="mt-1 text-xs tabular-nums text-zinc-400">
                    Actualizado {formatDateTime(m.updatedAt)}
                  </p>
                </div>
              </Link>
            </li>
          ))
        )}
      </ul>

      <Link
        href={viewAllHref}
        className="mt-3 block text-right text-sm font-medium text-orange-700 hover:underline"
      >
        Ver todos →
      </Link>
    </section>
  );
}
