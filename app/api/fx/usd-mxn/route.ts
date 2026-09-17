import { NextResponse } from "next/server";
import { requireSessionUser } from "@/lib/auth/session-server";
import { apiErrorResponse } from "@/lib/api/handle-route-error";
import {
  fetchLatestUsdMxnFix,
  fetchUsdMxnFixForDate,
  usdToMxn,
} from "@/lib/services/banxico-fx";

/** GET /api/fx/usd-mxn?date=YYYY-MM-DD&amount=123.45 */
export async function GET(request: Request) {
  try {
    await requireSessionUser();
    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date")?.trim() || null;
    const amountRaw = searchParams.get("amount");
    const amount = amountRaw != null ? Number(amountRaw) : null;

    const quote = date ? await fetchUsdMxnFixForDate(date) : await fetchLatestUsdMxnFix();
    const mxn =
      amount != null && amount > 0 ? usdToMxn(amount, quote.rate) : null;

    return NextResponse.json({
      rate: quote.rate,
      date: quote.date,
      seriesId: quote.seriesId,
      source: quote.source,
      usdAmount: amount != null && amount > 0 ? amount : null,
      mxnAmount: mxn,
      note:
        mxn != null
          ? `TC Banxico FIX ${quote.rate.toLocaleString("es-MX", {
              minimumFractionDigits: 4,
              maximumFractionDigits: 4,
            })} MXN/USD (${quote.date})`
          : `TC Banxico FIX ${quote.rate.toLocaleString("es-MX", {
              minimumFractionDigits: 4,
              maximumFractionDigits: 4,
            })} MXN/USD (${quote.date})`,
    });
  } catch (e) {
    return apiErrorResponse(e);
  }
}
