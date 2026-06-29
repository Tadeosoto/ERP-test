"use client";

import Link from "next/link";
import { HomeActivitySidebar } from "@/components/dashboard/home-activity-sidebar";
import type { MovementDto, ObraDto, PendingMovementDto } from "@/lib/domain/types";

export function IngenieroHomeSidebar({
  recentMovements,
  pendingMovements,
  obras,
}: {
  recentMovements: MovementDto[];
  pendingMovements: PendingMovementDto[];
  obras: ObraDto[];
}) {
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-1 xl:gap-2">
      <div className="sm:col-span-2 xl:col-span-1">
        <HomeActivitySidebar
          compact
          limit={3}
          recentMovements={recentMovements}
          pendingMovements={pendingMovements}
        />
      </div>

      <section className="card p-2.5 sm:p-3">
        <div className="mb-1.5 flex items-center justify-between gap-2">
          <h2 className="text-xs font-bold text-zinc-900 sm:text-sm">Mis obras</h2>
          <Link href="/obras" className="text-[11px] font-medium text-sky-700 hover:underline sm:text-xs">
            Ver todas
          </Link>
        </div>
        <ul className="space-y-0.5">
          {obras.length === 0 ? (
            <li className="py-2 text-center text-[11px] text-zinc-400 sm:text-xs">Sin obras registradas.</li>
          ) : (
            obras.map((obra) => (
              <li key={obra.id}>
                <Link
                  href={`/obras/${obra.id}`}
                  className="block rounded-lg border border-transparent px-1.5 py-1.5 transition hover:border-orange-100 hover:bg-orange-50/40 sm:px-2"
                >
                  <p className="truncate text-xs font-medium text-sky-800 sm:text-sm">{obra.name}</p>
                  <p className="text-[10px] text-zinc-500 sm:text-xs">
                    {obra.orderCount} orden{obra.orderCount === 1 ? "" : "es"}
                  </p>
                </Link>
              </li>
            ))
          )}
        </ul>
      </section>
    </div>
  );
}
