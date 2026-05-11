"use client";

import Link from "next/link";
import type { Role } from "@/lib/domain/types";
import { ROLE_LABEL } from "@/lib/domain/labels";
import { rolePlaybook } from "@/lib/domain/flow";

export function RoleGuidancePanel({ role }: { role: Role }) {
  const bullets = rolePlaybook(role);
  return (
    <div className="rounded-3xl border border-orange-200 bg-gradient-to-br from-white to-orange-50/80 p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-zinc-900">Qué hacer con tu sesión</h2>
          <p className="mt-1 text-sm text-zinc-600">
            Rol actual: <span className="font-medium text-orange-800">{ROLE_LABEL[role]}</span>. Solo podrás
            mover expedientes cuando el flujo te corresponda; el resto del tiempo puedes consultar y seguir el
            mapa.
          </p>
        </div>
        <Link
          href="/flujo"
          className="shrink-0 rounded-full bg-orange-600 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-700"
        >
          Ver mapa del proceso
        </Link>
      </div>
      <ul className="mt-4 list-inside list-disc space-y-2 text-sm text-zinc-700">
        {bullets.map((line) => (
          <li key={line}>{line}</li>
        ))}
        <li className="text-zinc-500">
          Abre cada expediente desde el panel: si ves la sección «Tu turno», ahí puedes avanzar.
        </li>
      </ul>
    </div>
  );
}
