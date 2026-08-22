import { NextResponse } from "next/server";
import { getCoverageStatus } from "@/lib/coverage-status";

/**
 * Measured coverage and freshness for customer-facing copy.
 *
 * Public: it contains counts and a timestamp, no permit or contact data.
 * Reads `refresh_log`, which is service-role only since the Phase 0A
 * migration, so it has to come through here rather than straight from
 * PostgREST.
 */
export async function GET() {
  try {
    return NextResponse.json(await getCoverageStatus());
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown error";
    console.error("[coverage] read failed:", message);
    return NextResponse.json(
      { error: "Coverage status unavailable" },
      { status: 503 }
    );
  }
}
