"use client";

import { MovementsPanel } from "@/components/dashboard/movements-panel";
import type { MovementDto, PendingMovementDto } from "@/lib/domain/types";

export function HomeActivitySidebar({
  recentMovements,
  pendingMovements,
  className = "",
}: {
  recentMovements: MovementDto[];
  pendingMovements: PendingMovementDto[];
  className?: string;
}) {
  return (
    <aside className={`grid min-h-0 grid-cols-1 grid-rows-[minmax(0,1fr)_minmax(0,1fr)] gap-3 ${className}`}>
      <MovementsPanel
        title="Últimos movimientos"
        viewAllHref="/movimientos"
        empty="Sin movimientos recientes."
        variant="recent"
        recent={recentMovements}
      />
      <MovementsPanel
        title="Pendientes generales"
        viewAllHref="/movimientos/pendientes"
        empty="No hay pendientes en el flujo."
        variant="pending"
        pending={pendingMovements}
      />
    </aside>
  );
}
