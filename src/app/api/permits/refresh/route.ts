import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import {
  METRO_ADAPTERS,
  runAdapter,
  dateNDaysAgo,
} from "@/lib/permit-adapters";
import { isFailure, type AdapterResult } from "@/lib/source-health";
import {
  computeLifecycleWrites,
  lifecycleColumns,
  recordLifecycleEvents,
  type LifecycleWrite,
} from "@/lib/lifecycle-server";

export const maxDuration = 300;

const WINDOW_DAYS = 90;
const METRO_BATCH_SIZE = 5;
const UPSERT_CHUNK = 500;

/**
 * Fails closed.
 *
 * The previous version returned `true` when `CRON_SECRET` was unset, so a
 * deployment that forgot the variable let anyone trigger a fan-out to 200
 * municipal APIs.
 */
function authorize(request: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return false;
  return request.headers.get("authorization") === `Bearer ${cronSecret}`;
}

async function handleRefresh(request: NextRequest) {
  if (!process.env.CRON_SECRET) {
    console.error("[refresh] CRON_SECRET is not configured; refusing");
    return NextResponse.json({ error: "Not configured" }, { status: 503 });
  }

  if (!authorize(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const metrosParam = request.nextUrl.searchParams.get("metros");
  const metroIds = metrosParam
    ? metrosParam.split(",").filter(Boolean)
    : Object.keys(METRO_ADAPTERS);

  const dateStr = dateNDaysAgo(WINDOW_DAYS);

  async function refreshMetro(metroId: string) {
    const adapters = METRO_ADAPTERS[metroId];
    if (!adapters) return { count: 0, status: "skipped", sources: 0, failed: 0 };

    // Each source is fetched and recorded independently, so one failure cannot
    // hide the others in the same market.
    const results = await Promise.all(
      adapters.map((adapter) =>
        runAdapter(metroId, adapter, dateStr, WINDOW_DAYS)
      )
    );

    const seen = new Set<string>();
    const permits = results
      .flatMap((r) => r.permits)
      .filter((p) => {
        if (seen.has(p.id)) return false;
        seen.add(p.id);
        return true;
      });

    let databaseError: string | null = null;

    // Resolved before the upsert so the permit row and its event agree, and so
    // first_seen_at / actionable_at can be carried forward rather than reset.
    const observations = results.flatMap((r) => r.observations);
    const seenObservations = new Set<string>();
    const uniqueObservations = observations.filter((o) => {
      if (seenObservations.has(o.permitId)) return false;
      seenObservations.add(o.permitId);
      return true;
    });

    const now = new Date().toISOString();
    let lifecycle: LifecycleWrite[] = [];
    try {
      lifecycle = await computeLifecycleWrites(uniqueObservations, now);
    } catch (err) {
      // Lifecycle is additive; losing it must not cost us the permits.
      console.error(
        "[refresh] lifecycle resolution failed for",
        metroId,
        err instanceof Error ? err.message : "unknown"
      );
    }
    const lifecycleById = new Map(lifecycle.map((w) => [w.permitId, w]));

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
        fetched_at: now,
        ...(lifecycleById.has(p.id)
          ? lifecycleColumns(lifecycleById.get(p.id)!)
          : {}),
      }));

      for (let i = 0; i < rows.length; i += UPSERT_CHUNK) {
        const { error } = await supabaseAdmin
          .from("permits")
          .upsert(rows.slice(i, i + UPSERT_CHUNK), { onConflict: "id" });
        if (error) {
          databaseError = error.code ?? "unknown";
          break;
        }
      }
    }

    if (!databaseError && lifecycle.length > 0) {
      const sourceUpdatedAt = new Map(
        permits.map((p) => [p.id, p.sourceUpdatedAt])
      );
      for (const result of results) {
        const forSource = lifecycle.filter((w) =>
          result.observations.some((o) => o.permitId === w.permitId)
        );
        await recordLifecycleEvents(
          metroId,
          result.adapterKey,
          result.observations,
          forSource,
          sourceUpdatedAt
        );
      }
    }

    await recordHealth(results, databaseError);

    const failed = results.filter(
      (r) => isFailure(r.outcome) || databaseError !== null
    ).length;

    // A run where every source failed is an error, whatever the permit count.
    // Reporting it as success with zero rows is the bug this replaces.
    const status = databaseError
      ? "error"
      : failed === results.length && results.length > 0
        ? "error"
        : failed > 0
          ? "partial"
          : "success";

    await supabaseAdmin.from("refresh_log").upsert({
      metro: metroId,
      last_refreshed_at: new Date().toISOString(),
      permit_count: permits.length,
      status,
      error_message: summarizeFailures(results, databaseError),
      source_count: results.length,
      failed_source_count: failed,
    });

    return { count: permits.length, status, sources: results.length, failed };
  }

  const results: Record<
    string,
    { count: number; status: string; sources: number; failed: number }
  > = {};

  for (let i = 0; i < metroIds.length; i += METRO_BATCH_SIZE) {
    const batch = metroIds.slice(i, i + METRO_BATCH_SIZE);
    const settled = await Promise.all(
      batch.map(async (id) => ({ id, result: await refreshMetro(id) }))
    );
    for (const { id, result } of settled) results[id] = result;
  }

  const totals = Object.values(results).reduce(
    (acc, r) => ({
      permits: acc.permits + r.count,
      sources: acc.sources + r.sources,
      failed: acc.failed + r.failed,
    }),
    { permits: 0, sources: 0, failed: 0 }
  );

  return NextResponse.json({
    results,
    totals,
    refreshedAt: new Date().toISOString(),
  });
}

/** One row per source, so a market's failures are attributable to a source. */
async function recordHealth(
  results: AdapterResult[],
  databaseError: string | null
): Promise<void> {
  if (results.length === 0) return;

  const now = new Date().toISOString();

  // Failure counts are cumulative, so the previous values are needed first.
  const { data: existing } = await supabaseAdmin
    .from("source_health")
    .select("adapter_key, consecutive_failures")
    .in(
      "adapter_key",
      results.map((r) => r.adapterKey)
    );

  const priorFailures = new Map(
    (existing ?? []).map((row) => [
      row.adapter_key as string,
      (row.consecutive_failures as number) ?? 0,
    ])
  );

  const rows = results.map((result) => {
    const outcome = databaseError ? "database_error" : result.outcome;
    const failed = isFailure(outcome);

    return {
      adapter_key: result.adapterKey,
      metro: result.metro,
      city: result.city,
      state: result.state,
      domain: result.domain,
      outcome,
      last_attempt_at: now,
      // Only advanced on a real success, so staleness is measured from the
      // last time this source actually produced data.
      last_success_at: outcome === "success" ? now : undefined,
      http_status: result.httpStatus,
      error_class: databaseError ? "DatabaseError" : result.errorClass,
      error_message: databaseError ?? result.errorMessage,
      duration_ms: result.durationMs,
      raw_record_count: result.rawRecordCount,
      accepted_count: result.acceptedCount,
      rejected_count: result.rejectedCount,
      rejection_reasons: result.rejectionReasons,
      with_company_count: result.contacts.withCompany,
      with_phone_count: result.contacts.withPhone,
      with_email_count: result.contacts.withEmail,
      suppressed_contact_count:
        result.suppressedPhones + result.suppressedEmails,
      shared_contact_companies: result.sharedContacts[0]?.companies ?? 0,
      window_days: result.windowDays,
      window_start: result.windowStart,
      consecutive_failures: failed
        ? (priorFailures.get(result.adapterKey) ?? 0) + 1
        : 0,
    };
  });

  const { error } = await supabaseAdmin
    .from("source_health")
    .upsert(rows, { onConflict: "adapter_key" });

  if (error) {
    // Health reporting must never take the refresh down with it.
    console.error("[refresh] could not record source health:", error.code);
  }
}

/** A short, operator-readable summary. Never the raw upstream response. */
function summarizeFailures(
  results: AdapterResult[],
  databaseError: string | null
): string | null {
  if (databaseError) return `database_error: ${databaseError}`;

  const failures = results.filter((r) => isFailure(r.outcome));
  if (failures.length === 0) return null;

  return failures
    .map((f) => `${f.domain}: ${f.outcome}${f.httpStatus ? ` (${f.httpStatus})` : ""}`)
    .join("; ")
    .slice(0, 500);
}

export async function GET(request: NextRequest) {
  return handleRefresh(request);
}

export async function POST(request: NextRequest) {
  return handleRefresh(request);
}
