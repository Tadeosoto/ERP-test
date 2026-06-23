"use client";

import { MovementsPanel } from "@/components/dashboard/movements-panel";
import type { MovementDto, PendingMovementDto } from "@/lib/domain/types";

const SIDEBAR_ITEM_LIMIT = 3;

export function HomeActivitySidebar({
  recentMovements,
  pendingMovements,
  className = "",
  compact = false,
  limit = SIDEBAR_ITEM_LIMIT,
}: {
  recentMovements: MovementDto[];
  pendingMovements: PendingMovementDto[];
  className?: string;
  compact?: boolean;
  limit?: number;
}) {
  if (compact) {
    return (
      <aside className={`flex flex-col gap-2 ${className}`}>
        <MovementsPanel
          title="Últimos movimientos"
          viewAllHref="/movimientos"
          empty="Sin movimientos recientes."
          variant="recent"
          recent={recentMovements}
          compact
          limit={limit}
        />
        <MovementsPanel
          title="Pendientes generales"
          viewAllHref="/movimientos/pendientes"
          empty="No hay pendientes en el flujo."
          variant="pending"
          pending={pendingMovements}
          compact
          limit={limit}
        />
      </aside>
    );
  }

  return (
    <aside className={`grid min-h-0 grid-cols-1 grid-rows-[minmax(0,1fr)_minmax(0,1fr)] gap-3 ${className}`}>
      <MovementsPanel
        title="Últimos movimientos"
        viewAllHref="/movimientos"
        empty="Sin movimientos recientes."
        variant="recent"
        recent={recentMovements}
        limit={limit}
      />
      <MovementsPanel
        title="Pendientes generales"
        viewAllHref="/movimientos/pendientes"
        empty="No hay pendientes en el flujo."
        variant="pending"
        pending={pendingMovements}
        limit={limit}
      />
    </aside>
  );
}
