import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { mapRowToPermit, PUBLIC_COLUMNS, CONTACT_COLUMNS } from "@/lib/permit-columns";
import {
  assessMarketQuality,
  evaluateGate,
  DEFAULT_GATE,
  type GateThresholds,
} from "@/lib/lead-quality";

/**
 * Which markets are good enough to sell.
 *
 * Phase 1D asks for launch markets chosen from observed data quality rather
 * than city size. This is the measurement behind that decision: per market,
 * the named-GC rate, contact reachability, whether the phone numbers are
 * actually distinct, and whether the project values are real.
 *
 * Operator-only, behind CRON_SECRET, same as the source-health view.
 */
export const maxDuration = 60;

const PAGE = 1000;

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "Not configured" }, { status: 503 });
  }
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const thresholds: GateThresholds = { ...DEFAULT_GATE };
  const minPermits = Number(request.nextUrl.searchParams.get("minPermits"));
  if (Number.isFinite(minPermits) && minPermits > 0) {
    thresholds.minPermits = minPermits;
  }

  const byMarket = new Map<string, ReturnType<typeof mapRowToPermit>[]>();
  const columns = [...PUBLIC_COLUMNS, ...CONTACT_COLUMNS, "metro"].join(",");

  for (let offset = 0; ; offset += PAGE) {
    const { data, error } = await supabaseAdmin
      .from("permits")
      .select(columns)
      .order("id")
      .range(offset, offset + PAGE - 1);

    if (error) {
      console.error("[market-quality] read failed:", error.code);
      return NextResponse.json({ error: "Unavailable" }, { status: 503 });
    }

    const rows = (data ?? []) as unknown as Record<string, unknown>[];
    for (const row of rows) {
      const market = row.metro as string;
      if (!byMarket.has(market)) byMarket.set(market, []);
      // Entitled mapping: this is an internal quality view, and the numbers
      // are meaningless without the contact values.
      byMarket.get(market)!.push(mapRowToPermit(row, true));
    }

    if (rows.length < PAGE) break;
  }

  const assessed = [...byMarket.entries()].map(([market, permits]) => {
    const quality = assessMarketQuality(market, permits);
    return { quality, gate: evaluateGate(quality, thresholds) };
  });

  const passing = assessed.filter((a) => a.gate.passes);

  return NextResponse.json({
    thresholds,
    summary: {
      markets: assessed.length,
      passing: passing.length,
      passingMarkets: passing.map((a) => a.quality.market),
    },
    markets: assessed
      .sort((a, b) => b.quality.reachableRate - a.quality.reachableRate)
      .map((a) => ({ ...a.quality, gate: a.gate })),
  });
}
