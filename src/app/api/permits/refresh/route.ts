import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import {
  METRO_ADAPTERS,
  fetchAdapter,
  dateNDaysAgo,
} from "@/lib/permit-adapters";

export const maxDuration = 120;

function authorize(request: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return true;
  return request.headers.get("authorization") === `Bearer ${cronSecret}`;
}

async function handleRefresh(request: NextRequest) {
  if (!authorize(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const metrosParam = request.nextUrl.searchParams.get("metros");
  const metroIds = metrosParam
    ? metrosParam.split(",").filter(Boolean)
    : Object.keys(METRO_ADAPTERS);

  const results: Record<string, { count: number; status: string; error?: string }> = {};

  for (const metroId of metroIds) {
    const adapters = METRO_ADAPTERS[metroId];
    if (!adapters) continue;

    try {
      const dateStr = dateNDaysAgo(90);
      const fetchResults = await Promise.allSettled(
        adapters.map((adapter) => fetchAdapter(adapter, dateStr))
      );

      const allPermits = fetchResults
        .filter(
          (r): r is PromiseFulfilledResult<Awaited<ReturnType<typeof fetchAdapter>>> =>
            r.status === "fulfilled"
        )
        .flatMap((r) => r.value);

      const seen = new Set<string>();
      const permits = allPermits.filter((p) => {
        if (seen.has(p.id)) return false;
        seen.add(p.id);
        return true;
      });

      if (permits.length > 0) {
        const rows = permits.map((p) => ({
          id: p.id,
          permit_number: p.permitNumber,
          address: p.address,
          city: p.city,
          state: p.state,
          zip: p.zip,
          latitude: p.latitude,
          longitude: p.longitude,
          filing_date: p.filingDate,
          description: p.description,
          estimated_value: p.estimatedValue,
          status: p.status,
          trades: p.trades,
          gc_company_name: p.gcContact.companyName,
          gc_contact_name: p.gcContact.contactName,
          gc_phone: p.gcContact.phone,
          gc_email: p.gcContact.email,
          gc_confidence: p.gcContact.confidence,
          source: p.source,
          source_updated_at: p.sourceUpdatedAt,
          metro: metroId,
          fetched_at: new Date().toISOString(),
        }));

        for (let i = 0; i < rows.length; i += 500) {
          const chunk = rows.slice(i, i + 500);
          const { error } = await supabaseAdmin
            .from("permits")
            .upsert(chunk, { onConflict: "id" });
          if (error) throw error;
        }
      }

      await supabaseAdmin.from("refresh_log").upsert({
        metro: metroId,
        last_refreshed_at: new Date().toISOString(),
        permit_count: permits.length,
        status: "success",
        error_message: null,
      });

      results[metroId] = { count: permits.length, status: "success" };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : typeof err === "object" && err !== null && "message" in err ? String((err as { message: unknown }).message) : JSON.stringify(err);
      await supabaseAdmin.from("refresh_log").upsert({
        metro: metroId,
        last_refreshed_at: new Date().toISOString(),
        permit_count: 0,
        status: "error",
        error_message: errorMsg,
      });
      results[metroId] = { count: 0, status: "error", error: errorMsg };
    }
  }

  return NextResponse.json({
    results,
    refreshedAt: new Date().toISOString(),
  });
}

export async function GET(request: NextRequest) {
  return handleRefresh(request);
}

export async function POST(request: NextRequest) {
  return handleRefresh(request);
}
