import Link from "next/link";
import { RoleActivityIcon } from "@/components/dashboard/role-activity-icon";
import { formatPendingRoles } from "@/lib/domain/flow";
import { roleActivityLabel } from "@/lib/dashboard/role-activity-style";
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
  compact?: boolean;
  limit?: number;
};

export function MovementsPanel({
  title,
  viewAllHref,
  empty,
  variant,
  recent = [],
  pending = [],
  compact = false,
  limit,
}: MovementsPanelProps) {
  const recentItems = limit ? recent.slice(0, limit) : recent;
  const pendingItems = limit ? pending.slice(0, limit) : pending;
  const hasItems = variant === "recent" ? recentItems.length > 0 : pendingItems.length > 0;
  const surface = variant === "recent" ? "movimientos" : "pendientes";
  const rowHover = PANEL_HOVER_ROW[surface] ?? "";

  return (
    <section
      className={`flex flex-col rounded-2xl border shadow-sm ${compact ? "p-2.5" : "min-h-0 flex-col p-3 lg:p-4"} ${PANEL_SURFACE[surface]}`}
    >
      <h2 className={`font-semibold text-zinc-800 ${compact ? "text-sm" : "text-base"}`}>{title}</h2>

      <ul className={`${compact ? "mt-1.5 space-y-1" : "mt-3 min-h-0 flex-1 space-y-3 overflow-y-auto lg:max-h-none"}`}>
        {!hasItems ? (
          <li className={`text-center text-zinc-400 ${compact ? "py-3 text-xs" : "py-6 text-sm"}`}>{empty}</li>
        ) : variant === "recent" ? (
          recentItems.map((m) => (
            <li key={m.id}>
              <Link
                href={`/ordenes/${m.orderId}`}
                className={`flex gap-2 rounded-lg border border-transparent transition ${compact ? "px-0.5 py-1" : "gap-3 rounded-xl p-1"} ${rowHover}`}
              >
                <RoleActivityIcon role={m.role} size={compact ? "xs" : "sm"} />
                <div className="min-w-0 flex-1">
                  <p className={`truncate font-semibold text-zinc-800 ${compact ? "text-xs" : "text-sm"}`}>
                    {roleActivityLabel(m.role, m.actorName)}
                  </p>
                  <p
                    className={`truncate text-zinc-600 ${compact ? "text-[11px] leading-tight" : "mt-0.5 text-sm leading-snug text-zinc-700"}`}
                  >
                    {m.description}
                  </p>
                  {!compact && (
                    <>
                      <p className="mt-0.5 truncate text-xs text-zinc-500">{m.context}</p>
                      <p className="mt-1 text-xs tabular-nums text-zinc-400">{formatDateTime(m.createdAt)}</p>
                    </>
                  )}
                  {compact && (
                    <p className="mt-0.5 truncate text-[10px] tabular-nums text-zinc-400">
                      {m.context} · {formatDateTime(m.createdAt)}
                    </p>
                  )}
                </div>
              </Link>
            </li>
          ))
        ) : (
          pendingItems.map((m) => (
            <li key={m.id}>
              <Link
                href={`/ordenes/${m.orderId}`}
                className={`flex gap-2 rounded-lg border border-transparent transition ${compact ? "px-0.5 py-1" : "gap-3 rounded-xl p-1"} ${rowHover}`}
              >
                <RoleActivityIcon role={m.role} size={compact ? "xs" : "sm"} />
                <div className="min-w-0 flex-1">
                  <p className={`truncate font-semibold text-zinc-800 ${compact ? "text-xs" : "text-sm"}`}>
                    Pendiente · {formatPendingRoles(m.status)}
                  </p>
                  <p
                    className={`truncate text-zinc-600 ${compact ? "text-[11px] leading-tight" : "mt-0.5 text-sm leading-snug text-zinc-700"}`}
                  >
                    {m.description}
                  </p>
                  {!compact && (
                    <>
                      <p className="mt-0.5 truncate text-xs text-zinc-500">
                        {m.obraName} · {m.orderTitle}
                      </p>
                      <p className="mt-1 text-xs tabular-nums text-zinc-400">
                        Actualizado {formatDateTime(m.updatedAt)}
                      </p>
                    </>
                  )}
                  {compact && (
                    <p className="mt-0.5 truncate text-[10px] text-zinc-500">
                      {m.obraName} · {m.orderTitle}
                    </p>
                  )}
                </div>
              </Link>
            </li>
          ))
        )}
      </ul>

      <Link
        href={viewAllHref}
        className={`block text-right font-medium text-orange-700 hover:underline ${compact ? "mt-1.5 text-xs" : "mt-3 text-sm"}`}
      >
        Ver todos →
      </Link>
    </section>
  );
}
