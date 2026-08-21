import { NextRequest, NextResponse } from "next/server";
import type { Permit, Trade, PermitStatus, ContactConfidence } from "@/lib/types";
import { supabaseAdmin } from "@/lib/supabase";
import { fetchLivePermits, dateNDaysAgo } from "@/lib/permit-adapters";
import {
  parseQuery,
  applyQuery,
  DEFAULT_PAGE_SIZE,
  type PermitPage,
} from "@/lib/permit-query";

const MAX_PAGE_SIZE = 100;

function mapRowToPermit(row: Record<string, unknown>): Permit {
  return {
    id: row.id as string,
    permitNumber: row.permit_number as string,
    address: row.address as string,
    city: row.city as string,
    state: row.state as string,
    zip: row.zip as string,
    latitude: row.latitude as number,
    longitude: row.longitude as number,
    filingDate: row.filing_date as string,
    description: row.description as string,
    estimatedValue: Number(row.estimated_value),
    status: (row.status as PermitStatus) || "Issued",
    trades: (row.trades as Trade[]) || [],
    gcContact: {
      companyName: (row.gc_company_name as string) || "Unknown Contractor",
      contactName: (row.gc_contact_name as string) || null,
      phone: (row.gc_phone as string) || null,
      email: (row.gc_email as string) || null,
      confidence: ((row.gc_confidence as string) || "Low") as ContactConfidence,
    },
    source: row.source as string,
    sourceUpdatedAt: (row.source_updated_at as string) || "",
  };
}

/**
 * PostgREST reads `or=(...)` as a comma-separated list, so a comma, paren or
 * wildcard inside the search term would split the filter. Strip them.
 */
function sanitizeSearch(term: string): string {
  return term.replace(/[,()%*\\]/g, " ").trim();
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const query = parseQuery(params);
  const source = params.get("source");

  const limit = Math.min(
    Math.max(Number(params.get("limit")) || DEFAULT_PAGE_SIZE, 1),
    MAX_PAGE_SIZE
  );
  const offset = Math.max(Number(params.get("offset")) || 0, 0);
  const page = { limit, offset };

  const empty: PermitPage = {
    permits: [],
    total: 0,
    offset,
    hasMore: false,
    source: "cache",
  };

  if (query.metros.length === 0) {
    return NextResponse.json(empty, { status: 200 });
  }

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
        .in("metro", query.metros)
        .gte("filing_date", cutoff);

      if (cachedCount && cachedCount > 0) {
        let builder = supabaseAdmin
          .from("permits")
          .select("*", { count: "exact" })
          .in("metro", query.metros)
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
          return NextResponse.json({
            permits: data.map(mapRowToPermit),
            total,
            offset,
            hasMore: offset + data.length < total,
            source: "cache",
          } satisfies PermitPage);
        }
      }
    } catch {
      // Fall through to the live adapters below.
    }
  }

  try {
    const permits = await fetchLivePermits(query.metros, query.days);
    return NextResponse.json({
      ...applyQuery(permits, query, cutoff, page),
      source: "live",
    } satisfies PermitPage);
  } catch {
    return NextResponse.json({ ...empty, source: "live" }, { status: 200 });
  }
}
