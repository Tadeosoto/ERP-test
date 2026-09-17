"use client";

import { useEffect, useState } from "react";

export type EngineerOption = { id: string; name: string; email: string };

export function ObraEngineerPicker({
  value,
  onChange,
  lockedIds = [],
  required = true,
}: {
  value: string[];
  onChange: (ids: string[]) => void;
  /** IDs que no se pueden quitar (p. ej. el creador ingeniero). */
  lockedIds?: string[];
  required?: boolean;
}) {
  const [engineers, setEngineers] = useState<EngineerOption[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const res = await fetch("/api/users?role=ingeniero", { credentials: "include" });
      if (res.ok) {
        const d = (await res.json()) as { users: EngineerOption[] };
        if (!cancelled) setEngineers(d.users);
      }
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  function toggle(id: string) {
    if (lockedIds.includes(id) && value.includes(id)) return;
    if (value.includes(id)) onChange(value.filter((x) => x !== id));
    else onChange([...value, id]);
  }

  if (loading) {
    return <p className="mt-1.5 text-sm text-zinc-500">Cargando ingenieros…</p>;
  }

  if (engineers.length === 0) {
    return (
      <p className="mt-1.5 text-sm text-amber-800">
        No hay usuarios con rol ingeniero. Crea al menos uno para designar el equipo.
      </p>
    );
  }

  return (
    <div className="mt-1.5 space-y-2">
      <p className="text-xs text-zinc-500">
        {required
          ? "Obligatorio. Solo estos ingenieros verán la obra y podrán pedir material / revisar OC."
          : "Ingenieros que colaboran en esta obra."}
      </p>
      <ul className="max-h-48 space-y-1 overflow-y-auto rounded-xl border border-zinc-200 bg-white p-2">
        {engineers.map((eng) => {
          const checked = value.includes(eng.id);
          const locked = lockedIds.includes(eng.id);
          return (
            <li key={eng.id}>
              <label
                className={`flex cursor-pointer items-start gap-2.5 rounded-lg px-2 py-2 text-sm hover:bg-zinc-50 ${
                  locked ? "bg-orange-50/60" : ""
                }`}
              >
                <input
                  type="checkbox"
                  className="mt-0.5"
                  checked={checked}
                  disabled={locked && checked}
                  onChange={() => toggle(eng.id)}
                />
                <span className="min-w-0">
                  <span className="font-medium text-zinc-900">{eng.name}</span>
                  <span className="block truncate text-xs text-zinc-500">{eng.email}</span>
                  {locked ? (
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-orange-700">
                      Creador · siempre en el equipo
                    </span>
                  ) : null}
                </span>
              </label>
            </li>
          );
        })}
      </ul>
      {required && value.length === 0 ? (
        <p className="text-xs font-medium text-red-600">Selecciona al menos un ingeniero.</p>
      ) : (
        <p className="text-xs text-zinc-500">
          {value.length} ingeniero{value.length === 1 ? "" : "s"} designado
          {value.length === 1 ? "" : "s"}
        </p>
      )}
    </div>
  );
}
