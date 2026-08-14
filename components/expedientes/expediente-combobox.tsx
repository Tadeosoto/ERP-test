"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import type { ExpedienteListItemDto } from "@/lib/domain/types";

type ExpedienteComboboxProps = {
  value: string;
  onChange: (expedienteId: string, item: ExpedienteListItemDto | null) => void;
  required?: boolean;
  className?: string;
  allowCreate?: boolean;
  onCreateClick?: () => void;
  label?: string;
};

export function ExpedienteCombobox({
  value,
  onChange,
  required,
  className = "",
  allowCreate,
  onCreateClick,
  label = "Expediente",
}: ExpedienteComboboxProps) {
  const inputId = useId();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [items, setItems] = useState<ExpedienteListItemDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedLabel, setSelectedLabel] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async (query: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: "200" });
      if (query.trim()) params.set("q", query.trim());
      const res = await fetch(`/api/expedientes?${params}`, { credentials: "include" });
      if (!res.ok) return;
      const data = (await res.json()) as { expedientes: ExpedienteListItemDto[] };
      setItems(data.expedientes);
      if (value) {
        const hit = data.expedientes.find((e) => e.id === value);
        if (hit) setSelectedLabel(`${hit.folio} · ${hit.name}`);
      }
    } finally {
      setLoading(false);
    }
  }, [value]);

  useEffect(() => {
    void load("");
  }, [load]);

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => void load(q), 200);
    return () => clearTimeout(t);
  }, [q, open, load]);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const filtered = useMemo(() => items, [items]);

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <label htmlFor={inputId} className="block text-xs font-medium text-zinc-700">
        {label}
        {required && <span className="text-red-500"> *</span>}
      </label>
      <button
        type="button"
        id={inputId}
        onClick={() => setOpen((v) => !v)}
        className="mt-1.5 flex min-h-11 w-full items-center justify-between gap-2 rounded-xl border border-zinc-200 bg-white px-3 text-left text-sm shadow-sm focus:border-orange-300 focus:outline-none focus:ring-1 focus:ring-orange-200"
      >
        <span className={selectedLabel || value ? "truncate text-zinc-900" : "text-zinc-400"}>
          {selectedLabel || (value ? "Expediente seleccionado" : "Buscar expediente…")}
        </span>
        <svg className="h-4 w-4 shrink-0 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-lg ring-1 ring-black/5">
          <div className="border-b border-zinc-100 p-2">
            <input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Filtrar por folio o nombre…"
              className="min-h-10 w-full rounded-lg border border-zinc-200 px-3 text-sm focus:border-orange-300 focus:outline-none"
            />
          </div>
          <ul className="max-h-56 overflow-y-auto py-1">
            {loading && <li className="px-3 py-2 text-xs text-zinc-400">Buscando…</li>}
            {!loading && filtered.length === 0 && (
              <li className="px-3 py-3 text-center text-xs text-zinc-400">Sin resultados</li>
            )}
            {filtered.map((e) => (
              <li key={e.id}>
                <button
                  type="button"
                  className={`flex w-full flex-col px-3 py-2 text-left hover:bg-orange-50 ${
                    e.id === value ? "bg-orange-50/80" : ""
                  }`}
                  onClick={() => {
                    onChange(e.id, e);
                    setSelectedLabel(`${e.folio} · ${e.name}`);
                    setOpen(false);
                  }}
                >
                  <span className="text-sm font-semibold text-zinc-900">{e.folio}</span>
                  <span className="truncate text-xs text-zinc-500">{e.name}</span>
                </button>
              </li>
            ))}
          </ul>
          {allowCreate && onCreateClick && (
            <button
              type="button"
              className="w-full border-t border-zinc-100 px-3 py-2.5 text-left text-sm font-semibold text-teal-700 hover:bg-teal-50"
              onClick={() => {
                setOpen(false);
                onCreateClick();
              }}
            >
              + Crear expediente nuevo
            </button>
          )}
          {value && (
            <button
              type="button"
              className="w-full border-t border-zinc-100 px-3 py-2 text-left text-xs text-zinc-500 hover:bg-zinc-50"
              onClick={() => {
                onChange("", null);
                setSelectedLabel("");
                setOpen(false);
              }}
            >
              Quitar selección
            </button>
          )}
        </div>
      )}
    </div>
  );
}
