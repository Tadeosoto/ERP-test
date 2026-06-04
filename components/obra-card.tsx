import Link from "next/link";
import type { ObraDto } from "@/lib/domain/types";
import { formatDate } from "@/lib/format";

export function ObraCard({ obra }: { obra: ObraDto }) {
  return (
    <Link
      href={`/obras/${obra.id}`}
      className="card block p-5 transition hover:border-teal-300 hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1 pr-2">
          <h3 className="text-xl font-bold text-zinc-900 group-hover:text-orange-700">{obra.name}</h3>
          <p className="mt-2 text-base text-zinc-600">
            {obra.orderCount === 0
              ? "Sin órdenes de compra"
              : `${obra.orderCount} orden${obra.orderCount === 1 ? "" : "es"} de compra`}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2 text-right">
          <p className="text-sm leading-snug text-zinc-500 whitespace-nowrap">
            Creada el {formatDate(obra.createdAt)}
          </p>
          <span
            className={`rounded-full px-3 py-1 text-sm font-semibold ${
              obra.active ? "bg-teal-100 text-teal-800" : "bg-zinc-200 text-zinc-600"
            }`}
          >
            {obra.active ? "Activa" : "Inactiva"}
          </span>
        </div>
      </div>
      <p className="mt-4 text-sm font-medium text-orange-700">Ver obra y órdenes →</p>
    </Link>
  );
}
