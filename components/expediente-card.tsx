import Link from "next/link";
import type { PurchaseCase } from "@/lib/domain/types";
import { describeGate } from "@/lib/domain/flow";
import { STATUS_LABEL } from "@/lib/domain/labels";
import { formatMoney } from "@/lib/format";

const tagColors: Record<string, string> = {
  draft: "bg-orange-100 text-orange-800",
  pendingEngineer: "bg-amber-100 text-amber-900",
  approved: "bg-emerald-100 text-emerald-800",
  paid: "bg-sky-100 text-sky-900",
  invoiceRequested: "bg-violet-100 text-violet-800",
  readyForReception: "bg-orange-200 text-orange-900",
  capturedByReception: "bg-zinc-200 text-zinc-800",
  reconciled: "bg-zinc-800 text-white",
};

function initials(s: string): string {
  return s
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase() || "?";
}

export function ExpedienteCard({ c }: { c: PurchaseCase }) {
  const tagClass = tagColors[c.status] ?? "bg-orange-100 text-orange-800";
  return (
    <Link
      href={`/cases/${c.id}`}
      className="group flex flex-col rounded-3xl border border-orange-100/80 bg-white p-5 shadow-sm transition hover:border-orange-200 hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-2">
        <span className={`inline-flex max-w-[10rem] truncate rounded-full px-2.5 py-0.5 text-xs font-semibold ${tagClass}`}>
          {STATUS_LABEL[c.status]}
        </span>
        <span className="text-xs text-zinc-400">
          {new Date(c.updatedAt).toLocaleDateString("es-MX", { day: "numeric", month: "short" })}
        </span>
      </div>
      <h3 className="mt-3 text-lg font-semibold text-zinc-900 group-hover:text-orange-700">
        {c.title}
      </h3>
      <p className="mt-1 line-clamp-2 text-sm text-zinc-500">{c.supplierName}</p>
      <p className="mt-2 line-clamp-2 text-xs leading-snug text-orange-900/80">{describeGate(c.status)}</p>
      <div className="mt-4 flex items-center justify-between">
        <span className="text-lg font-bold tabular-nums text-orange-700">
          {formatMoney(c.amountOc, c.currency)}
        </span>
        <div className="flex -space-x-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-orange-200 text-xs font-semibold text-orange-900">
            {initials(c.supplierName)}
          </span>
          <span className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-orange-500 text-xs font-semibold text-white">
            OC
          </span>
        </div>
      </div>
    </Link>
  );
}
