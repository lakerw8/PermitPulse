/* Hallmark · genre: modern-minimal · macrostructure: Workbench · design-system: design.md · designed-as-app */
"use client";

import { useMemo } from "react";
import { PermitCard } from "@/components/permit-card";
import { PermitFilters } from "@/components/permit-filters";
import { RegionPicker } from "@/components/region-picker";
import { usePermits } from "@/lib/permits-context";
import { countActiveFilters } from "@/lib/permit-query";
import { summarizeSelection } from "@/lib/regions";
import { useCoverage, freshnessLabel } from "@/lib/use-coverage";
import { METROS } from "@/lib/types";
import { RefreshCw, SearchX, MapPinned, Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function PermitsPage() {
  const {
    permits,
    total,
    hasMore,
    isLoading,
    isLoadingMore,
    error,
    query,
    setQuery,
    resetFilters,
    searchInput,
    setSearchInput,
    loadMore,
    refresh,
    degraded,
    coverage: selectionCoverage,
    freshness,
  } = usePermits();
  const coverage = useCoverage();

  const summary = useMemo(() => summarizeSelection(query.metros), [query.metros]);
  const activeFilters = countActiveFilters(query);
  const hasRegion = query.metros.length > 0;

  return (
    <div className="mx-auto w-full max-w-7xl px-4 pb-16 pt-6 sm:px-6 sm:pt-8 lg:px-8">
      <header className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
        <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2">
          <h1 className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">
            Commercial permits
          </h1>
          <RegionPicker
            selected={query.metros}
            onChange={(metros) => setQuery({ metros })}
          />
        </div>

        <button
          type="button"
          onClick={refresh}
          disabled={isLoading}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-medium transition-colors duration-200 hover:bg-muted disabled:opacity-60 cursor-pointer"
        >
          <RefreshCw className={`h-3 w-3 ${isLoading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </header>

      <div className="sticky top-14 z-30 -mx-4 mt-5 border-y border-border bg-background/92 px-4 py-3 backdrop-blur-md sm:-mx-6 sm:px-6 sm:top-16 lg:-mx-8 lg:px-8">
        <PermitFilters
          query={query}
          onQueryChange={setQuery}
          searchInput={searchInput}
          onSearchInputChange={setSearchInput}
          onReset={resetFilters}
        />
      </div>

      {error && (
        <p className="mt-4 rounded-md border border-border bg-muted/60 px-3 py-2 text-sm text-muted-foreground">
          {error}
        </p>
      )}

      {/* The one count on the page. It always describes the current filters. */}
      <div className="mt-5 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <div className="font-heading text-lg font-semibold tracking-tight tabular-nums">
          {isLoading ? (
            <Skeleton className="h-5 w-40" />
          ) : (
            <>
              {total.toLocaleString()} {total === 1 ? "permit" : "permits"}
              {hasRegion && (
                <span className="font-sans text-sm font-normal text-muted-foreground">
                  {" in "}
                  {summary.label}
                </span>
              )}
            </>
          )}
        </div>
        {!isLoading && (
          <p
            className="text-xs tabular-nums text-muted-foreground"
            suppressHydrationWarning
          >
            {permits.length < total &&
              `Showing ${permits.length.toLocaleString()} · `}
            {/* When the city portals were last read, not when this browser
                last fetched. The page used to print the local fetch time,
                which made a week-old cache look seconds old. */}
            {freshness
              ? `Sources refreshed ${freshnessLabel(freshness.lastSuccessAt)}`
              : coverage
                ? `Sources refreshed ${freshnessLabel(coverage.lastSuccessfulRefresh)}`
                : "Checking source freshness\u2026"}
          </p>
        )}
      </div>

      {/* Says why a list is short. Without this, "no coverage", "sources are
          down" and "this market is quiet" all render as an empty page. */}
      {degraded && (
        <p
          className={
            degraded.reason === "sources_unavailable"
              ? "mt-3 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive"
              : "mt-3 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200"
          }
        >
          {degraded.message}
          {selectionCoverage && selectionCoverage.unsupported.length > 0 && (
            <>
              {" "}
              Not yet covered:{" "}
              {selectionCoverage.unsupported
                .map((id) => METROS.find((m) => m.id === id)?.label ?? id)
                .slice(0, 6)
                .join(", ")}
              {selectionCoverage.unsupported.length > 6 &&
                ` and ${selectionCoverage.unsupported.length - 6} more`}
              .
            </>
          )}
        </p>
      )}

      <div className="mt-3 space-y-3">
        {isLoading ? (
          <PermitListSkeleton />
        ) : !hasRegion ? (
          <EmptyState
            icon={<MapPinned className="h-5 w-5 text-muted-foreground" />}
            title="Choose your market"
            body="Pick a metro area or city above to see permits filed near you."
          />
        ) : total === 0 ? (
          <EmptyState
            icon={<SearchX className="h-5 w-5 text-muted-foreground" />}
            title="No permits match these filters"
            body={
              activeFilters > 0
                ? `Nothing in ${summary.label} matches all ${activeFilters} filters over the last ${query.days} days.`
                : `Nothing has been filed in ${summary.label} over the last ${query.days} days. Try a wider date range.`
            }
            action={
              activeFilters > 0
                ? { label: "Clear all filters", onClick: resetFilters }
                : { label: "Search the last 90 days", onClick: () => setQuery({ days: 90 }) }
            }
          />
        ) : (
          <>
            {permits.map((permit) => (
              <PermitCard key={permit.id} permit={permit} />
            ))}

            {hasMore && (
              <button
                type="button"
                onClick={loadMore}
                disabled={isLoadingMore}
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-border py-3 text-sm font-medium text-muted-foreground transition-colors duration-200 hover:bg-muted hover:text-foreground disabled:opacity-60 cursor-pointer"
              >
                {isLoadingMore && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                {isLoadingMore
                  ? "Loading"
                  : `Load more · ${(total - permits.length).toLocaleString()} remaining`}
              </button>
            )}

            {!hasMore && total > 0 && (
              <p className="pt-2 text-center text-xs tabular-nums text-muted-foreground">
                All {total.toLocaleString()} {total === 1 ? "permit" : "permits"}{" "}
                shown
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function EmptyState({
  icon,
  title,
  body,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
  action?: { label: string; onClick: () => void };
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border px-6 py-16 text-center">
      {icon}
      <p className="mt-2.5 text-sm font-medium">{title}</p>
      <p className="mt-1 max-w-sm text-xs leading-relaxed text-muted-foreground">
        {body}
      </p>
      {action && (
        <button
          type="button"
          onClick={action.onClick}
          className="mt-4 rounded-full bg-primary px-3.5 py-1.5 text-xs font-medium text-primary-foreground transition-colors duration-200 hover:bg-primary/90 cursor-pointer"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}

function PermitListSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="rounded-lg border border-border p-4 sm:p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1 space-y-2.5">
              <Skeleton className="h-4 w-3/5" />
              <Skeleton className="h-3 w-full" />
              <div className="flex gap-2">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
            <Skeleton className="h-7 w-7 shrink-0 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  );
}
