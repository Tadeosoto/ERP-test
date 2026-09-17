/** Líneas de material en solicitud (Proceso A). Se serializan en `materials` / `quantities`. */

export const MATERIAL_UNITS = ["pieza", "metro", "litro", "kg"] as const;
export type MaterialUnit = (typeof MATERIAL_UNITS)[number];

export type MaterialLine = {
  id: string;
  quantity: string;
  unit: MaterialUnit;
  code: string;
  description: string;
};

export function emptyMaterialLine(): MaterialLine {
  return {
    id: `ml_${Math.random().toString(36).slice(2, 10)}`,
    quantity: "",
    unit: "pieza",
    code: "",
    description: "",
  };
}

const UNIT_SET = new Set<string>(MATERIAL_UNITS);

function isMaterialLine(v: unknown): v is MaterialLine {
  if (!v || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  return (
    typeof o.id === "string" &&
    typeof o.quantity === "string" &&
    typeof o.description === "string" &&
    typeof o.unit === "string" &&
    UNIT_SET.has(o.unit)
  );
}

/** Parsea `materials` (JSON de líneas o texto legacy). */
export function parseMaterialLines(materials: string, quantities = ""): MaterialLine[] {
  const raw = materials.trim();
  if (!raw) return [];

  if (raw.startsWith("[")) {
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (Array.isArray(parsed) && parsed.every(isMaterialLine)) {
        return parsed.map((l) => ({
          ...l,
          code: typeof (l as MaterialLine).code === "string" ? (l as MaterialLine).code : "",
        }));
      }
      if (Array.isArray(parsed)) {
        return parsed
          .filter((x): x is Record<string, unknown> => !!x && typeof x === "object")
          .map((o, i) => ({
            id: typeof o.id === "string" ? o.id : `ml_legacy_${i}`,
            quantity: String(o.quantity ?? o.cant ?? ""),
            unit: UNIT_SET.has(String(o.unit ?? ""))
              ? (String(o.unit) as MaterialUnit)
              : "pieza",
            code: String(o.code ?? o.codigo ?? ""),
            description: String(o.description ?? o.descripcion ?? o.name ?? ""),
          }))
          .filter((l) => l.description.trim() || l.quantity.trim());
      }
    } catch {
      /* legacy text */
    }
  }

  const matLines = raw.split(/\n+/).map((s) => s.trim()).filter(Boolean);
  const qtyLines = quantities
    .split(/\n+/)
    .map((s) => s.trim())
    .filter(Boolean);
  return matLines.map((description, i) => ({
    id: `ml_legacy_${i}`,
    quantity: qtyLines[i] ?? "",
    unit: "pieza" as MaterialUnit,
    code: "",
    description,
  }));
}

export function serializeMaterialLines(lines: MaterialLine[]): {
  materials: string;
  quantities: string;
} {
  const cleaned = lines
    .map((l) => ({
      ...l,
      quantity: l.quantity.trim(),
      code: l.code.trim(),
      description: l.description.trim(),
    }))
    .filter((l) => l.description || l.quantity || l.code);

  return {
    materials: JSON.stringify(cleaned),
    quantities: cleaned
      .map((l) =>
        [l.quantity, l.unit, l.code ? `(${l.code})` : "", l.description]
          .filter(Boolean)
          .join(" ")
      )
      .join("\n"),
  };
}

export function validateMaterialLines(lines: MaterialLine[]): string | null {
  const usable = lines.filter((l) => l.description.trim() || l.quantity.trim() || l.code.trim());
  if (usable.length === 0) {
    return "Agrega al menos un material.";
  }
  for (const l of usable) {
    if (!l.description.trim()) {
      return "Cada material necesita descripción.";
    }
    if (!l.quantity.trim()) {
      return "Indica la cantidad de cada material.";
    }
    const n = Number(String(l.quantity).replace(/,/g, ""));
    if (!Number.isFinite(n) || n <= 0) {
      return "Las cantidades deben ser mayores a cero.";
    }
  }
  return null;
}

export function materialLinesSummary(lines: MaterialLine[]): string {
  if (lines.length === 0) return "";
  const first = lines[0];
  const label = first.code
    ? `${first.code} · ${first.description}`
    : first.description;
  if (lines.length === 1) {
    return label.length <= 48 ? label : `${label.slice(0, 48)}…`;
  }
  const base = label.length <= 36 ? label : `${label.slice(0, 36)}…`;
  return `${base} (+${lines.length - 1})`;
}
