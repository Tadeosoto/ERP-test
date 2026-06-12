"use client";

import { MovementsPanel } from "@/components/dashboard/movements-panel";
import type { MovementDto, PendingMovementDto } from "@/lib/domain/types";

export function HomeActivitySidebar({
  recentMovements,
  pendingMovements,
}: {
  recentMovements: MovementDto[];
  pendingMovements: PendingMovementDto[];
}) {
  return (
    <aside className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-1 xl:gap-3">
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
