/* Hallmark · genre: modern-minimal · module: permit-query · design-system: design.md · designed-as-app */

/**
 * The permit query contract, shared by the client, the cached-database path and
 * the live-adapter fallback.
 *
 * Every filter is applied server-side so the count the page reports is the true
 * number of permits matching the filters, not the size of whatever page of rows
 * happened to be loaded.
 */

import type { Permit, Trade, PermitStatus } from "./types";

export type SortOption = "newest" | "highest-value";

export interface ValueRange {
  min: number;
  max: number | null;
  label: string;
}

export const VALUE_RANGES: ValueRange[] = [
  { min: 50_000, max: 500_000, label: "$50K-$500K" },
  { min: 500_000, max: 2_000_000, label: "$500K-$2M" },
  { min: 2_000_000, max: null, label: "$2M+" },
];

export const DAY_RANGES = [
  { value: 7, label: "7 days" },
  { value: 14, label: "14 days" },
  { value: 30, label: "30 days" },
  { value: 90, label: "90 days" },
] as const;

export const DEFAULT_PAGE_SIZE = 25;

export interface PermitQuery {
  /** City ids, as used by `METROS` and the `permits.metro` column. */
  metros: string[];
  days: number;
  trades: Trade[];
  statuses: PermitStatus[];
  valueRange: ValueRange | null;
  search: string;
  sort: SortOption;
}

export interface PermitPage {
  permits: Permit[];
  /** Permits matching the filters in full, independent of pagination. */
  total: number;
  offset: number;
  hasMore: boolean;
  /** "cache" when served from the permits table, "live" from source adapters. */
  source: "cache" | "live";
}

export const EMPTY_QUERY: PermitQuery = {
  metros: [],
  days: 30,
  trades: [],
  statuses: [],
  valueRange: null,
  search: "",
  sort: "newest",
};

/** Filters a contractor set beyond the region and date window. */
export function countActiveFilters(query: PermitQuery): number {
  return (
    query.trades.length +
    query.statuses.length +
    (query.valueRange ? 1 : 0) +
    (query.search.trim() ? 1 : 0)
  );
}

// ── serialisation ─────────────────────────────────────────────────────────────

export function queryToSearchParams(
  query: PermitQuery,
  page: { limit: number; offset: number }
): URLSearchParams {
  const params = new URLSearchParams();
  params.set("metros", query.metros.join(","));
  params.set("days", String(query.days));
  if (query.trades.length) params.set("trades", query.trades.join(","));
  if (query.statuses.length) params.set("statuses", query.statuses.join(","));
  if (query.valueRange) {
    params.set("minValue", String(query.valueRange.min));
    if (query.valueRange.max !== null) {
      params.set("maxValue", String(query.valueRange.max));
    }
  }
  if (query.search.trim()) params.set("q", query.search.trim());
  params.set("sort", query.sort);
  params.set("limit", String(page.limit));
  params.set("offset", String(page.offset));
  return params;
}

export function parseQuery(params: URLSearchParams): PermitQuery {
  const list = (key: string) =>
    (params.get(key) || "").split(",").map((s) => s.trim()).filter(Boolean);

  const minValue = params.get("minValue");
  const maxValue = params.get("maxValue");

  return {
    metros: list("metros"),
    days: Math.min(Math.max(Number(params.get("days")) || 30, 1), 90),
    trades: list("trades") as Trade[],
    statuses: list("statuses") as PermitStatus[],
    valueRange: minValue
      ? {
          min: Number(minValue),
          max: maxValue ? Number(maxValue) : null,
          label: "",
        }
      : null,
    search: params.get("q") || "",
    sort: params.get("sort") === "highest-value" ? "highest-value" : "newest",
  };
}

// ── in-memory evaluation (live-adapter fallback) ──────────────────────────────

function matchesQuery(permit: Permit, query: PermitQuery, cutoff: string): boolean {
  if (permit.filingDate < cutoff) return false;

  if (query.trades.length && !permit.trades.some((t) => query.trades.includes(t))) {
    return false;
  }

  if (query.statuses.length && !query.statuses.includes(permit.status)) {
    return false;
  }

  if (query.valueRange) {
    if (permit.estimatedValue < query.valueRange.min) return false;
    if (query.valueRange.max !== null && permit.estimatedValue > query.valueRange.max) {
      return false;
    }
  }

  const q = query.search.trim().toLowerCase();
  if (q) {
    const haystack = [
      permit.description,
      permit.address,
      permit.city,
      permit.permitNumber,
      ...permit.trades,
    ]
      .join(" ")
      .toLowerCase();
    if (!haystack.includes(q)) return false;
  }

  return true;
}

/**
 * Apply a query to an in-memory permit list. Used when no cached rows exist for
 * a region and results come straight from the municipal adapters, so that path
 * reports the same totals as the cached one.
 */
export function applyQuery(
  permits: Permit[],
  query: PermitQuery,
  cutoff: string,
  page: { limit: number; offset: number }
): Omit<PermitPage, "source"> {
  const matched = permits.filter((p) => matchesQuery(p, query, cutoff));

  matched.sort(
    query.sort === "highest-value"
      ? (a, b) => b.estimatedValue - a.estimatedValue
      : (a, b) => b.filingDate.localeCompare(a.filingDate)
  );

  const slice = matched.slice(page.offset, page.offset + page.limit);

  return {
    permits: slice,
    total: matched.length,
    offset: page.offset,
    hasMore: page.offset + slice.length < matched.length,
  };
}
