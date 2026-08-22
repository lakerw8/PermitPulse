import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { fetchLivePermitsDetailed, dateNDaysAgo } from "@/lib/permit-adapters";
import { resolveSelection } from "@/lib/coverage-registry";
import { freshnessForAdapters } from "@/lib/coverage-status";
import { getViewer } from "@/lib/entitlements-server";
import { applyEntitlement } from "@/lib/entitlements";
import { mapRowToPermit, selectColumns } from "@/lib/permit-columns";
import {
  parseQuery,
  applyQuery,
  DEFAULT_PAGE_SIZE,
  type PermitPage,
} from "@/lib/permit-query";

const MAX_PAGE_SIZE = 100;

/**
 * PostgREST reads `or=(...)` as a comma-separated list, so a comma, paren or
 * wildcard inside the search term would split the filter. Strip them.
 */
function sanitizeSearch(term: string): string {
  return term.replace(/[,()%*\\]/g, " ").trim();
}

export async function GET(request: NextRequest) {
  // Resolved before any data is read so both the cache and the live path share
  // one answer. Anonymous and free viewers never get the contact columns
  // selected on their behalf, let alone serialized.
  const { entitled } = await getViewer();

  const params = request.nextUrl.searchParams;
  const query = parseQuery(params);
  const source = params.get("source");

  const limit = Math.min(
    Math.max(Number(params.get("limit")) || DEFAULT_PAGE_SIZE, 1),
    MAX_PAGE_SIZE
  );
  const offset = Math.max(Number(params.get("offset")) || 0, 0);
  const page = { limit, offset };

  // Resolve the selection through the registry before touching any data.
  // The picker emits city ids; only some of them have a source behind them,
  // and the difference has to reach the customer rather than showing up as an
  // empty list.
  const resolution = resolveSelection(query.metros);
  const coverage = {
    supported: resolution.supported,
    unsupported: resolution.unsupported,
    unknown: resolution.unknown,
  };

  const empty: PermitPage = {
    permits: [],
    total: 0,
    offset,
    hasMore: false,
    source: "cache",
    coverage,
  };

  if (query.metros.length === 0) {
    return NextResponse.json(empty, { status: 200 });
  }

  if (resolution.adapterKeys.length === 0) {
    // Every selected city resolved to nothing. Saying "0 permits" here would
    // describe these markets as quiet when we simply do not cover them.
    return NextResponse.json(
      {
        ...empty,
        degraded: {
          reason: "no_coverage" as const,
          message:
            resolution.unsupported.length > 0
              ? "We do not have a permit source for the selected cities yet."
              : "That selection is not recognised.",
        },
      } satisfies PermitPage,
      { status: 200 }
    );
  }

  const partialCoverage =
    resolution.unsupported.length > 0
      ? {
          reason: "partial_coverage" as const,
          message: `No permit source yet for ${resolution.unsupported.length} of the selected cities.`,
        }
      : undefined;

  const cutoff = dateNDaysAgo(query.days);

  if (source !== "live") {
    try {
      // Is this region cached at all? Asked separately from the filtered query
      // so that "no permits match these filters" is not mistaken for "this
      // region has never been fetched", which would trigger a pointless and
      // slow round-trip to every municipal API in the region.
      const { count: cachedCount } = await supabaseAdmin
        .from("permits")
        .select("id", { count: "exact", head: true })
        .in("metro", resolution.adapterKeys)
        .gte("filing_date", cutoff);

      if (cachedCount && cachedCount > 0) {
        let builder = supabaseAdmin
          .from("permits")
          .select(selectColumns(entitled), { count: "exact" })
          .in("metro", resolution.adapterKeys)
          .gte("filing_date", cutoff);

        if (query.trades.length) {
          builder = builder.overlaps("trades", query.trades);
        }
        if (query.statuses.length) {
          builder = builder.in("status", query.statuses);
        }
        if (query.valueRange) {
          builder = builder.gte("estimated_value", query.valueRange.min);
          if (query.valueRange.max !== null) {
            builder = builder.lte("estimated_value", query.valueRange.max);
          }
        }

        const term = sanitizeSearch(query.search);
        if (term) {
          builder = builder.or(
            [
              `description.ilike.%${term}%`,
              `address.ilike.%${term}%`,
              `city.ilike.%${term}%`,
              `permit_number.ilike.%${term}%`,
            ].join(",")
          );
        }

        builder =
          query.sort === "highest-value"
            ? builder.order("estimated_value", { ascending: false })
            : builder.order("filing_date", { ascending: false });

        const { data, error, count } = await builder.range(
          offset,
          offset + limit - 1
        );

        if (!error && data) {
          const total = count ?? data.length;
          const freshness = await freshnessForAdapters(resolution.adapterKeys);
          return NextResponse.json({
            permits: (data as unknown as Record<string, unknown>[]).map((row) =>
              mapRowToPermit(row, entitled)
            ),
            total,
            offset,
            hasMore: offset + data.length < total,
            source: "cache",
            coverage,
            freshness,
            degraded: freshness.isStale
              ? {
                  reason: "serving_stale" as const,
                  message:
                    "Showing cached permits: these sources have not refreshed recently.",
                }
              : partialCoverage,
          } satisfies PermitPage);
        }
      }
    } catch {
      // Fall through to the live adapters below.
    }
  }

  try {
    const live = await fetchLivePermitsDetailed(resolution.supported, query.days);

    // Every source failed and there was no usable cache. Reporting that as an
    // empty success is what let an outage look like a market with no work in
    // it; a 503 lets the client say "temporarily unavailable" instead.
    if (live.failed.length > 0 && live.failed.length === live.results.length) {
      return NextResponse.json(
        {
          ...empty,
          source: "live" as const,
          degraded: {
            reason: "sources_unavailable" as const,
            message:
              "Permit sources for this selection are not responding. Please try again shortly.",
          },
        } satisfies PermitPage,
        { status: 503 }
      );
    }

    const result = applyQuery(live.permits, query, cutoff, page);

    // Some sources answered and some did not. The permits shown are real, but
    // the list is incomplete and must not be presented as the whole market.
    const partialSources =
      live.failed.length > 0
        ? {
            reason: "partial_coverage" as const,
            message: `${live.failed.length} of ${live.results.length} sources did not respond, so this list may be incomplete.`,
          }
        : undefined;

    return NextResponse.json({
      ...result,
      permits: result.permits.map((permit) => applyEntitlement(permit, entitled)),
      source: "live",
      coverage,
      degraded: partialSources ?? partialCoverage,
    } satisfies PermitPage);
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown error";
    console.error("[permits] live fetch failed:", message);
    return NextResponse.json(
      {
        ...empty,
        source: "live" as const,
        degraded: {
          reason: "sources_unavailable" as const,
          message:
            "Permit sources for this selection are not responding. Please try again shortly.",
        },
      } satisfies PermitPage,
      { status: 503 }
    );
  }
}
