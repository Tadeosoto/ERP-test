"use client";

import type { Role } from "@/lib/domain/types";
import { ROLE_LABEL } from "@/lib/domain/labels";
import { rolePlaybook } from "@/lib/domain/flow";

export function RoleGuidancePanel({ role }: { role: Role }) {
  const bullets = rolePlaybook(role);
  return (
    <div className="card border-teal-200 bg-gradient-to-br from-white to-teal-50/50 p-6">
      <h2 className="text-xl font-semibold text-zinc-900">Qué hacer con tu sesión</h2>
      <p className="mt-2 text-base text-zinc-600">
        Rol: <span className="font-semibold text-orange-800">{ROLE_LABEL[role]}</span>. Solo puedes
        modificar cuando el proceso te corresponde; siempre puedes ver el avance.
      </p>
      <ul className="mt-4 list-inside list-disc space-y-2 text-base text-zinc-700">
        {bullets.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
    </div>
  );
}
