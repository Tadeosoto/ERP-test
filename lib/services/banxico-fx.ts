/**
 * Tipo de cambio USD/MXN vía Banxico SIE (serie SF43718 — FIX).
 * Requiere BANXICO_TOKEN en el entorno (https://www.banxico.org.mx/SieAPIRest/service/v1/token).
 */

const BANXICO_FIX_SERIES = "SF43718";
const BANXICO_BASE = "https://www.banxico.org.mx/SieAPIRest/service/v1";

export type BanxicoFxQuote = {
  rate: number;
  /** YYYY-MM-DD (fecha del dato FIX) */
  date: string;
  seriesId: string;
  source: "banxico";
};

type BanxicoSerieResponse = {
  bmx?: {
    series?: Array<{
      idSerie?: string;
      datos?: Array<{ fecha?: string; dato?: string }>;
    }>;
  };
};

function banxicoToken(): string {
  const token = process.env.BANXICO_TOKEN?.trim();
  if (!token) {
    throw new Error(
      "Falta BANXICO_TOKEN. Solicítalo en Banxico SIE y agrégalo al entorno para OC en dólares."
    );
  }
  return token;
}

/** Convierte fecha Banxico `dd/MM/yyyy` → `yyyy-MM-dd`. */
export function parseBanxicoFecha(fecha: string): string {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(fecha.trim());
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  if (/^\d{4}-\d{2}-\d{2}$/.test(fecha.trim())) return fecha.trim();
  throw new Error(`Fecha Banxico no reconocida: ${fecha}`);
}

function todayMxIso(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Mexico_City" }).format(new Date());
}

function shiftIsoDate(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  return dt.toISOString().slice(0, 10);
}

async function fetchBanxicoJson(path: string): Promise<BanxicoSerieResponse> {
  const token = banxicoToken();
  const res = await fetch(`${BANXICO_BASE}${path}`, {
    headers: {
      Accept: "application/json",
      "Bmx-Token": token,
    },
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`Banxico respondió ${res.status}. Revisa el token o inténtalo más tarde.`);
  }
  return (await res.json()) as BanxicoSerieResponse;
}

function pickQuote(data: BanxicoSerieResponse): BanxicoFxQuote {
  const serie = data.bmx?.series?.[0];
  const rows = (serie?.datos ?? []).filter((r) => r.dato && r.dato !== "N/E" && r.fecha);
  if (rows.length === 0) {
    throw new Error("Banxico no devolvió tipo de cambio FIX para la fecha solicitada.");
  }
  // Prefer the latest row in the response.
  const last = rows[rows.length - 1]!;
  const rate = Number(String(last.dato).replace(/,/g, ""));
  if (!(rate > 0)) {
    throw new Error("Tipo de cambio Banxico inválido.");
  }
  return {
    rate,
    date: parseBanxicoFecha(last.fecha!),
    seriesId: serie?.idSerie ?? BANXICO_FIX_SERIES,
    source: "banxico",
  };
}

/** FIX más reciente publicado. */
export async function fetchLatestUsdMxnFix(): Promise<BanxicoFxQuote> {
  const data = await fetchBanxicoJson(`/series/${BANXICO_FIX_SERIES}/datos/oportuno`);
  return pickQuote(data);
}

/**
 * FIX para una fecha (YYYY-MM-DD). Si es fin de semana/festivo, busca hacia atrás hasta 10 días.
 */
export async function fetchUsdMxnFixForDate(isoDate: string): Promise<BanxicoFxQuote> {
  const target = /^\d{4}-\d{2}-\d{2}$/.test(isoDate) ? isoDate : todayMxIso();
  const from = shiftIsoDate(target, -10);
  const data = await fetchBanxicoJson(
    `/series/${BANXICO_FIX_SERIES}/datos/${from}/${target}`
  );
  const quote = pickQuote(data);
  // pickQuote takes last; ensure we don't go past target (API shouldn't).
  if (quote.date > target) {
    throw new Error("Tipo de cambio Banxico posterior a la fecha pedida.");
  }
  return quote;
}

export function buildFxNote(quote: BanxicoFxQuote, usdAmount: number, mxnAmount: number): string {
  const rateFmt = quote.rate.toLocaleString("es-MX", {
    minimumFractionDigits: 4,
    maximumFractionDigits: 4,
  });
  const usdFmt = usdAmount.toLocaleString("es-MX", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const mxnFmt = mxnAmount.toLocaleString("es-MX", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `OC en USD · TC Banxico FIX ${rateFmt} MXN/USD (${quote.date}) · ${usdFmt} USD = ${mxnFmt} MXN`;
}

export function usdToMxn(usdAmount: number, rate: number): number {
  return Math.round(usdAmount * rate * 100) / 100;
}

/** Resuelve FX al crear/editar OC: MXN sin Banxico; USD con FIX del día (documentDate o hoy). */
export async function resolveOrderFx(input: {
  currency: string;
  totalAmount: number;
  documentDateIso?: string | null;
}): Promise<{
  fxRate: number | null;
  fxRateDate: Date | null;
  totalAmountMxn: number;
  fxNote: string;
}> {
  const currency = input.currency.trim().toUpperCase() || "MXN";
  const total = Number(input.totalAmount) || 0;

  if (currency !== "USD") {
    return {
      fxRate: null,
      fxRateDate: null,
      totalAmountMxn: total,
      fxNote: "",
    };
  }

  if (total <= 0) {
    return {
      fxRate: null,
      fxRateDate: null,
      totalAmountMxn: 0,
      fxNote: "",
    };
  }

  const dateIso = input.documentDateIso?.slice(0, 10) || todayMxIso();
  const quote = await fetchUsdMxnFixForDate(dateIso);
  const totalAmountMxn = usdToMxn(total, quote.rate);
  return {
    fxRate: quote.rate,
    fxRateDate: new Date(`${quote.date}T12:00:00.000Z`),
    totalAmountMxn,
    fxNote: buildFxNote(quote, total, totalAmountMxn),
  };
}
