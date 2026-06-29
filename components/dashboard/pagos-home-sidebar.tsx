"use client";

import Link from "next/link";
import { HomeActivitySidebar } from "@/components/dashboard/home-activity-sidebar";
import type { MovementDto, PendingMovementDto } from "@/lib/domain/types";

const PROCESS_STEPS = [
  "Ingeniería aprueba la OC y Compras fija la fecha límite de pago.",
  "Administración registra el pago y referencia bancaria en la OC.",
  "Sube el comprobante de pago (PDF del banco).",
  "Contabilidad valida OC, pago y factura para cerrar el expediente.",
];

export function PagosHomeSidebar({
  recentMovements,
  pendingMovements,
}: {
  recentMovements: MovementDto[];
  pendingMovements: PendingMovementDto[];
}) {
  return (
    <aside className="flex h-full min-h-0 flex-col gap-3 overflow-y-auto lg:max-h-full">
      <HomeActivitySidebar
        compact
        limit={3}
        className="shrink-0"
        recentMovements={recentMovements}
        pendingMovements={pendingMovements}
      />

      <section className="card flex shrink-0 flex-col p-4">
        <h3 className="text-sm font-bold text-zinc-900">¿Cómo funciona?</h3>
        <ol className="mt-2 list-decimal space-y-1.5 pl-4 text-[11px] leading-relaxed text-zinc-600">
          {PROCESS_STEPS.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
        <Link
          href="/flujo"
          className="mt-3 text-[11px] font-semibold text-sky-700 hover:underline"
        >
          Ver mapa del proceso →
        </Link>
      </section>
    </aside>
  );
}
