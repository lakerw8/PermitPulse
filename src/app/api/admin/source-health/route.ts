import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { FAILURE_OUTCOMES } from "@/lib/source-health";

/**
 * Operator view of every source: last attempt, last success, latency, record
 * counts, rejection reasons, contact completeness, and consecutive failures.
 *
 * Behind `CRON_SECRET` rather than a user session — it is infrastructure, not
 * a customer feature, and it carries upstream error detail. Fails closed when
 * the secret is unset, same as the refresh route.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "Not configured" }, { status: 503 });
  }
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const onlyFailing = request.nextUrl.searchParams.get("failing") === "1";

  let builder = supabaseAdmin
    .from("source_health")
    .select("*")
    .order("consecutive_failures", { ascending: false })
    .order("last_attempt_at", { ascending: false });

  if (onlyFailing) {
    builder = builder.in("outcome", FAILURE_OUTCOMES as unknown as string[]);
  }

  const { data, error } = await builder;

  if (error) {
    console.error("[source-health] read failed:", error.code);
    return NextResponse.json({ error: "Unavailable" }, { status: 503 });
  }

  const rows = data ?? [];
  const byOutcome: Record<string, number> = {};
  for (const row of rows) {
    const outcome = row.outcome as string;
    byOutcome[outcome] = (byOutcome[outcome] ?? 0) + 1;
  }

  return NextResponse.json({
    summary: {
      sources: rows.length,
      byOutcome,
      failing: rows.filter((r) =>
        (FAILURE_OUTCOMES as unknown as string[]).includes(r.outcome as string)
      ).length,
      // A source failing several runs in a row is the alert-worthy signal;
      // a single blip usually is not.
      persistentlyFailing: rows.filter(
        (r) => ((r.consecutive_failures as number) ?? 0) >= 3
      ).length,
    },
    sources: rows,
  });
}
