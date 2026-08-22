/* Hallmark · genre: modern-minimal · module: coverage-status · design-system: design.md · designed-as-app */

/**
 * Measured coverage and freshness, read from `refresh_log`.
 *
 * Every customer-facing number about how much we cover and how current it is
 * comes from here. `coverage.ts` still counts what is *listed* in the picker,
 * which is a different and much larger number — as of writing, 200 configured
 * sources of which 145 returned data at the last refresh. Copy that quotes the
 * listed count as coverage is overstating the product, which is what this
 * module exists to prevent.
 *
 * "Operational" means: the source's last refresh succeeded and returned at
 * least one permit. That is a deliberately modest claim — it says the source
 * is answering with data, not that the data is complete or correct. Source
 * health proper (distinguishing a real zero from an upstream failure) is 0D;
 * until that lands, a source that errors is recorded as a success with zero
 * records, so requiring a non-zero count is the only honest filter available.
 */

import { supabaseAdmin } from "./supabase";
import { SUPPORTED_CITY_COUNT } from "./coverage-registry";
import { METROS } from "./types";
import { FAILURE_OUTCOMES } from "./source-health";

export interface CoverageStatus {
  /** Sources that returned at least one permit at their last refresh. */
  operationalMarkets: number;
  /** Sources configured, whether or not they are returning anything. */
  configuredMarkets: number;
  /** Cities the picker offers that have any source at all. */
  supportedCities: number;
  /** Cities the picker lists. Larger than `supportedCities`; not a claim. */
  listedCities: number;
  /** Permits currently cached and servable. */
  cachedPermits: number;
  /** Most recent refresh that produced data, ISO 8601, or null if never. */
  lastSuccessfulRefresh: string | null;
  /** True when the newest successful refresh is older than we promise. */
  isStale: boolean;
  /** Sources whose last run failed, from source_health. */
  failingSources: number;
}

/**
 * The refresh cron runs on weekdays, so a Monday morning read is legitimately
 * looking at Friday's data. Three days keeps a normal weekend from being
 * reported as a stall while still catching a genuinely stuck pipeline.
 */
const STALE_AFTER_MS = 3 * 24 * 60 * 60 * 1000;

/** Serving a slightly old count is fine; hammering the database is not. */
const CACHE_TTL_MS = 5 * 60 * 1000;

let cached: { at: number; value: CoverageStatus } | null = null;

export async function getCoverageStatus(
  now: Date = new Date()
): Promise<CoverageStatus> {
  if (cached && now.getTime() - cached.at < CACHE_TTL_MS) {
    return cached.value;
  }

  const [operational, configured, permits, latest, failing] = await Promise.all([
    supabaseAdmin
      .from("refresh_log")
      .select("metro", { count: "exact", head: true })
      .eq("status", "success")
      .gt("permit_count", 0),
    supabaseAdmin.from("refresh_log").select("metro", { count: "exact", head: true }),
    supabaseAdmin.from("permits").select("id", { count: "exact", head: true }),
    supabaseAdmin
      .from("refresh_log")
      .select("last_refreshed_at")
      .eq("status", "success")
      .gt("permit_count", 0)
      .order("last_refreshed_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabaseAdmin
      .from("source_health")
      .select("adapter_key", { count: "exact", head: true })
      .in("outcome", FAILURE_OUTCOMES as unknown as string[]),
  ]);

  const lastSuccessfulRefresh =
    (latest.data?.last_refreshed_at as string | undefined) ?? null;

  const value: CoverageStatus = {
    operationalMarkets: operational.count ?? 0,
    configuredMarkets: configured.count ?? 0,
    supportedCities: SUPPORTED_CITY_COUNT,
    listedCities: METROS.length,
    cachedPermits: permits.count ?? 0,
    // Null when source_health has not been populated yet — that is "unknown",
    // not "zero failures", so it is reported as 0 only once the table exists.
    failingSources: failing.count ?? 0,
    lastSuccessfulRefresh,
    isStale: lastSuccessfulRefresh
      ? now.getTime() - new Date(lastSuccessfulRefresh).getTime() > STALE_AFTER_MS
      : true,
  };

  cached = { at: now.getTime(), value };
  return value;
}

/** Test seam: drops the module-level cache. */
export function resetCoverageStatusCache(): void {
  cached = null;
}

/**
 * When the given sources last produced data.
 *
 * Scoped to the sources actually queried, so a customer browsing one stale
 * market is warned even while the rest of the platform is current — and one
 * stale market does not warn everybody else.
 */
export async function freshnessForAdapters(
  adapterKeys: string[],
  now: Date = new Date()
): Promise<{ lastSuccessAt: string | null; isStale: boolean }> {
  if (adapterKeys.length === 0) return { lastSuccessAt: null, isStale: true };

  const { data, error } = await supabaseAdmin
    .from("source_health")
    .select("last_success_at")
    .in("metro", adapterKeys)
    .not("last_success_at", "is", null)
    .order("last_success_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  // No health rows yet means the table predates this source, not that it is
  // broken. Fall back to the platform-wide figure rather than crying stale.
  if (error || !data?.last_success_at) {
    const status = await getCoverageStatus(now);
    return {
      lastSuccessAt: status.lastSuccessfulRefresh,
      isStale: status.isStale,
    };
  }

  const lastSuccessAt = data.last_success_at as string;
  return {
    lastSuccessAt,
    isStale:
      now.getTime() - new Date(lastSuccessAt).getTime() > STALE_AFTER_MS,
  };
}
