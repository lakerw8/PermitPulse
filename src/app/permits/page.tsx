/* Hallmark · genre: modern-minimal · macrostructure: Workbench · design-system: design.md · designed-as-app */
"use client";

import { useState, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PermitCard } from "@/components/permit-card";
import {
  PermitFilters,
  type SortOption,
  type ValueRange,
} from "@/components/permit-filters";
import { CityMultiSelect } from "@/components/city-multi-select";
import { usePermits } from "@/lib/permits-context";
import { Trade, PermitStatus, METROS } from "@/lib/types";
import { RefreshCw, Radio, Database } from "lucide-react";

export default function PermitsPage() {
  const {
    permits,
    isLoading,
    error,
    dataSource,
    setDataSource,
    metros,
    setMetros,
    daysBack,
    setDaysBack,
    refresh,
    lastUpdated,
  } = usePermits();
  const [search, setSearch] = useState("");
  const [selectedTrades, setSelectedTrades] = useState<Trade[]>([]);
  const [valueRange, setValueRange] = useState<ValueRange | null>(null);
  const [selectedStatuses, setSelectedStatuses] = useState<PermitStatus[]>([]);
  const [sortBy, setSortBy] = useState<SortOption>("newest");

  const metroLabel =
    metros.length === 0 || metros.length === METROS.length
      ? "All cities"
      : metros.length === 1
      ? METROS.find((m) => m.id === metros[0])?.label || metros[0]
      : `${metros.length} cities`;

  const filtered = useMemo(() => {
    let results = permits;

    const days = Number(daysBack);
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    results = results.filter((p) => new Date(p.filingDate) >= cutoff);

    if (search) {
      const q = search.toLowerCase();
      results = results.filter(
        (p) =>
          p.description.toLowerCase().includes(q) ||
          p.address.toLowerCase().includes(q) ||
          p.city.toLowerCase().includes(q) ||
          p.permitNumber.toLowerCase().includes(q) ||
          p.trades.some((t) => t.toLowerCase().includes(q))
      );
    }

    if (selectedTrades.length > 0) {
      results = results.filter((p) =>
        p.trades.some((t) => selectedTrades.includes(t))
      );
    }

    if (valueRange) {
      results = results.filter((p) => {
        if (p.estimatedValue < valueRange.min) return false;
        if (valueRange.max && p.estimatedValue > valueRange.max) return false;
        return true;
      });
    }

    if (selectedStatuses.length > 0) {
      results = results.filter((p) => selectedStatuses.includes(p.status));
    }

    results = [...results].sort(
      sortBy === "highest-value"
        ? (a, b) => b.estimatedValue - a.estimatedValue
        : (a, b) => new Date(b.filingDate).getTime() - new Date(a.filingDate).getTime()
    );

    return results;
  }, [permits, search, selectedTrades, valueRange, selectedStatuses, sortBy, daysBack]);

  function clearAllFilters() {
    setSearch("");
    setSelectedTrades([]);
    setValueRange(null);
    setSelectedStatuses([]);
    setSortBy("newest");
    setDaysBack("30");
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">
            Commercial Permits
          </h1>
          <div className="mt-1 flex items-center gap-2">
            <CityMultiSelect selected={metros} onChange={setMetros} />
            <span className="text-sm text-muted-foreground tabular-nums">&middot; Last {daysBack} days</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-full border border-border p-0.5">
            <button
              onClick={() => setDataSource("mock")}
              className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors duration-200 ${
                dataSource === "mock"
                  ? "bg-muted text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Database className="h-3 w-3" />
              Sample
            </button>
            <button
              onClick={() => setDataSource("live")}
              className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors duration-200 ${
                dataSource === "live"
                  ? "bg-muted text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Radio className="h-3 w-3" />
              Live API
            </button>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 rounded-full text-xs"
            onClick={() => refresh()}
            disabled={isLoading}
          >
            <RefreshCw className={`mr-1 h-3 w-3 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-2.5 text-sm text-destructive">
          {error}
        </div>
      )}

      {lastUpdated && (
        <div className="mb-4 text-xs text-muted-foreground tabular-nums" suppressHydrationWarning>
          Updated {lastUpdated.toLocaleTimeString()}
          {dataSource === "live" && (
            <Badge variant="outline" className="ml-2 text-xs">
              <Radio className="mr-1 h-2 w-2 text-green-500" />
              Live &middot; {metroLabel}
            </Badge>
          )}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
        <aside className="rounded-lg border border-border p-4">
          <PermitFilters
            search={search}
            onSearchChange={setSearch}
            selectedTrades={selectedTrades}
            onTradesChange={setSelectedTrades}
            valueRange={valueRange}
            onValueRangeChange={setValueRange}
            daysBack={daysBack}
            onDaysBackChange={setDaysBack}
            selectedStatuses={selectedStatuses}
            onStatusesChange={setSelectedStatuses}
            sortBy={sortBy}
            onSortChange={setSortBy}
            resultCount={filtered.length}
          />
        </aside>

        <div className="space-y-3">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-16">
              <RefreshCw className="mb-2 h-5 w-5 animate-spin text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Loading permits from {metroLabel}</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-16">
              <p className="text-sm text-muted-foreground">
                No permits match your filters.
              </p>
              <button
                onClick={clearAllFilters}
                className="mt-2 text-sm font-medium text-primary transition-colors duration-200 hover:text-primary/80"
              >
                Clear all filters
              </button>
            </div>
          ) : (
            filtered.map((permit) => (
              <PermitCard key={permit.id} permit={permit} />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
