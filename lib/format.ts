export function formatDateShort(iso: string): string {
  try {
    return new Intl.DateTimeFormat("es-MX", {
      day: "2-digit",
      month: "short",
      year: "2-digit",
      timeZone: "America/Mexico_City",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function formatDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat("es-MX", {
      dateStyle: "medium",
      timeZone: "America/Mexico_City",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function formatDateTime(iso: string): string {
  try {
    return new Intl.DateTimeFormat("es-MX", {
      dateStyle: "short",
      timeStyle: "short",
      timeZone: "America/Mexico_City",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function formatMoney(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: currency === "MXN" ? "MXN" : currency,
    }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency}`;
  }
}

/** Partes de un monto mientras el usuario escribe (coma = miles, punto = decimales). */
function splitAmountTyping(raw: string): {
  negative: boolean;
  intDigits: string;
  fracDigits: string;
  trailingDot: boolean;
} {
  const trimmed = raw.trimStart();
  const negative = trimmed.startsWith("-");
  const body = (negative ? trimmed.slice(1) : trimmed).replace(/,/g, "").replace(/[^\d.]/g, "");
  const dotIndex = body.indexOf(".");

  const intDigits = (dotIndex >= 0 ? body.slice(0, dotIndex) : body).replace(/\D/g, "");
  const fracRaw = dotIndex >= 0 ? body.slice(dotIndex + 1).replace(/\./g, "") : "";
  const fracDigits = fracRaw.slice(0, 2);
  const trailingDot = dotIndex >= 0 && body.endsWith(".");

  return { negative, intDigits, fracDigits, trailingDot };
}

/**
 * Normaliza lo que escribe el usuario: comas solo separan miles (1,244,213),
 * el punto marca decimales / centavos (1,244,213.50).
 */
export function sanitizeAmountInput(raw: string): string {
  const { negative, intDigits, fracDigits, trailingDot } = splitAmountTyping(raw);

  if (!intDigits && !fracDigits && !trailingDot) {
    return negative ? "-" : "";
  }

  let result = "";
  if (intDigits) {
    result = new Intl.NumberFormat("es-MX", { maximumFractionDigits: 0 }).format(Number(intDigits));
  } else if (trailingDot || fracDigits) {
    result = "0";
  }

  if (trailingDot) result += ".";
  else if (fracDigits) result += `.${fracDigits}`;

  return negative ? `-${result}` : result;
}

export function formatAmountInput(value: number): string {
  if (!Number.isFinite(value)) return "";
  return new Intl.NumberFormat("es-MX", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);
}

/** Comas = miles; punto = decimales (centavos). */
export function parseAmountInput(raw: string): number {
  const trimmed = raw.trim();
  if (!trimmed) return 0;

  const negative = trimmed.startsWith("-");
  const normalized = trimmed.replace(/[^\d.]/g, "").replace(/,/g, "");
  if (!normalized) return 0;

  const dotIndex = normalized.indexOf(".");
  const cleaned =
    dotIndex >= 0
      ? `${normalized.slice(0, dotIndex).replace(/\./g, "")}.${normalized.slice(dotIndex + 1).replace(/\./g, "")}`
      : normalized.replace(/\./g, "");

  const n = Number.parseFloat(cleaned);
  const value = Number.isFinite(n) ? n : 0;
  return negative ? -value : value;
}
