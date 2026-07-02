"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { SupplierDto } from "@/lib/domain/types";

function supplierMatchesQuery(s: SupplierDto, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const fields = [s.displayName, s.legalName, s.commercialName, s.rfc];
  return fields.some((f) => f.trim().toLowerCase().startsWith(q));
}

export function SupplierCombobox({
  suppliers,
  value,
  onChange,
  placeholder = "Buscar proveedor…",
  className = "",
  disabled = false,
}: {
  suppliers: SupplierDto[];
  value: string;
  onChange: (supplierId: string, supplier: SupplierDto | null) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}) {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const selected = useMemo(() => suppliers.find((s) => s.id === value) ?? null, [suppliers, value]);

  const options = useMemo(() => {
    const sorted = [...suppliers].sort((a, b) => a.displayName.localeCompare(b.displayName, "es"));
    return sorted.filter((s) => {
      if (s.active === false && s.id !== value) return false;
      return supplierMatchesQuery(s, query);
    });
  }, [suppliers, query, value]);

  useEffect(() => {
    if (selected) setQuery(selected.displayName);
    else if (!value) setQuery("");
  }, [selected, value]);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  function pick(s: SupplierDto) {
    onChange(s.id, s);
    setQuery(s.displayName);
    setOpen(false);
  }

  function handleInputChange(next: string) {
    setQuery(next);
    setOpen(true);
    if (value) {
      const current = selected?.displayName ?? "";
      if (next.trim().toLowerCase() !== current.trim().toLowerCase()) {
        onChange("", null);
      }
    }
  }

  return (
    <div ref={rootRef} className="relative min-w-0 flex-1">
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          autoComplete="off"
          disabled={disabled}
          value={query}
          placeholder={placeholder}
          onChange={(e) => handleInputChange(e.target.value)}
          onFocus={() => setOpen(true)}
          className={`${className} pr-9`}
        />
        <button
          type="button"
          tabIndex={-1}
          disabled={disabled}
          aria-label={open ? "Cerrar lista" : "Abrir lista de proveedores"}
          className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-lg text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 disabled:opacity-40"
          onClick={() => {
            if (disabled) return;
            setOpen((v) => !v);
            inputRef.current?.focus();
          }}
        >
          <svg className={`h-4 w-4 transition ${open ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      {open && (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-50 mt-1 max-h-56 w-full overflow-y-auto rounded-xl border border-zinc-200 bg-white py-1 shadow-lg ring-1 ring-black/5"
        >
          {options.length === 0 ? (
            <li className="px-3 py-2.5 text-sm text-zinc-500">
              {query.trim() ? "Ningún proveedor coincide con la búsqueda." : "No hay proveedores registrados."}
            </li>
          ) : (
            options.map((s) => {
              const isSelected = s.id === value;
              return (
                <li key={s.id} role="option" aria-selected={isSelected}>
                  <button
                    type="button"
                    className={`flex w-full flex-col items-start gap-0.5 px-3 py-2 text-left text-sm transition hover:bg-orange-50 ${
                      isSelected ? "bg-orange-50/80 font-semibold text-orange-900" : "text-zinc-800"
                    }`}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => pick(s)}
                  >
                    <span className="truncate">{s.displayName}</span>
                    {(s.rfc || s.commercialName) && (
                      <span className="truncate text-xs text-zinc-500">
                        {[s.rfc, s.commercialName !== s.displayName ? s.commercialName : ""]
                          .filter(Boolean)
                          .join(" · ")}
                      </span>
                    )}
                  </button>
                </li>
              );
            })
          )}
        </ul>
      )}

      {value && selected && query.trim().toLowerCase() !== selected.displayName.toLowerCase() && (
        <p className="mt-1 text-[11px] text-amber-700">Selecciona un proveedor de la lista o sigue escribiendo.</p>
      )}
    </div>
  );
}
