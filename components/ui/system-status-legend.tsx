import { SystemStatusBadge } from "@/components/ui/system-status-badge";
import type { OrderStatus } from "@/lib/domain/types";

const LEGEND_STATUSES: OrderStatus[] = [
  "awaitingEngineer",
  "engineerRejected",
  "awaitingPayment",
  "paid",
  "awaitingInvoice",
  "invoiceReceived",
  "completed",
  "difference",
];

export function SystemStatusLegend({ className = "" }: { className?: string }) {
  return (
    <div className={`rounded-2xl border border-zinc-200 bg-white p-4 ${className}`}>
      <p className="text-xs font-bold uppercase tracking-wide text-zinc-500">Estados del sistema</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {LEGEND_STATUSES.map((status) => (
          <SystemStatusBadge key={status} status={status} size="sm" />
        ))}
      </div>
    </div>
  );
}
