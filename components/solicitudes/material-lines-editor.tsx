"use client";

import {
  MATERIAL_UNITS,
  emptyMaterialLine,
  type MaterialLine,
  type MaterialUnit,
} from "@/lib/solicitudes/material-lines";

const inputCls =
  "block w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-orange-300 focus:outline-none focus:ring-1 focus:ring-orange-200";

export function MaterialLinesEditor({
  lines,
  onChange,
  disabled,
}: {
  lines: MaterialLine[];
  onChange: (lines: MaterialLine[]) => void;
  disabled?: boolean;
}) {
  function update(id: string, patch: Partial<MaterialLine>) {
    onChange(lines.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  }

  function remove(id: string) {
    if (lines.length <= 1) {
      onChange([emptyMaterialLine()]);
      return;
    }
    onChange(lines.filter((l) => l.id !== id));
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="text-sm font-medium text-zinc-900">Materiales *</p>
          <p className="mt-0.5 text-xs text-zinc-500">
            Cantidad, unidad, código (opcional) y descripción — como en tu lista de materiales.
          </p>
        </div>
        <button
          type="button"
          disabled={disabled}
          className="btn-secondary !min-h-9 !px-3 !py-1.5 !text-xs"
          onClick={() => onChange([...lines, emptyMaterialLine()])}
        >
          + Agregar material
        </button>
      </div>

      <ul className="space-y-3">
        {lines.map((line, index) => (
          <li
            key={line.id}
            className="rounded-2xl border border-zinc-200 bg-zinc-50/50 p-3 sm:p-4"
          >
            <div className="mb-2 flex items-center justify-between gap-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Material {index + 1}
              </span>
              <button
                type="button"
                disabled={disabled}
                className="text-xs font-semibold text-red-700 hover:underline disabled:opacity-40"
                onClick={() => remove(line.id)}
              >
                Quitar
              </button>
            </div>
            <div className="grid gap-3 sm:grid-cols-12">
              <label className="block sm:col-span-3">
                <span className="text-xs font-medium text-zinc-600">Cant.</span>
                <input
                  value={line.quantity}
                  onChange={(e) => update(line.id, { quantity: e.target.value })}
                  inputMode="decimal"
                  placeholder="Ej. 35"
                  disabled={disabled}
                  className={`${inputCls} mt-1`}
                />
              </label>
              <label className="block sm:col-span-3">
                <span className="text-xs font-medium text-zinc-600">Unidad</span>
                <select
                  value={line.unit}
                  onChange={(e) => update(line.id, { unit: e.target.value as MaterialUnit })}
                  disabled={disabled}
                  className={`${inputCls} mt-1`}
                >
                  {MATERIAL_UNITS.map((u) => (
                    <option key={u} value={u}>
                      {u.toUpperCase()}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block sm:col-span-6">
                <span className="text-xs font-medium text-zinc-600">Código</span>
                <input
                  value={line.code}
                  onChange={(e) => update(line.id, { code: e.target.value })}
                  placeholder="Ej. MA22184"
                  disabled={disabled}
                  className={`${inputCls} mt-1`}
                />
              </label>
              <label className="block sm:col-span-12">
                <span className="text-xs font-medium text-zinc-600">Descripción</span>
                <textarea
                  value={line.description}
                  onChange={(e) => update(line.id, { description: e.target.value })}
                  rows={2}
                  placeholder="Descripción del material…"
                  disabled={disabled}
                  className={`${inputCls} mt-1 resize-y`}
                />
              </label>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
