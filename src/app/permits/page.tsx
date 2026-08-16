"use client";

import { useState, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PermitCard } from "@/components/permit-card";
import { PermitFilters } from "@/components/permit-filters";
import { usePermits } from "@/lib/permits-context";
import { Trade, METROS } from "@/lib/types";
import { RefreshCw, Radio, Database, MapPin, ChevronDown } from "lucide-react";

export default function PermitsPage() {
  const {
    permits,
    isLoading,
    error,
    dataSource,
    setDataSource,
    metro,
    setMetro,
    refresh,
    lastUpdated,
  } = usePermits();
  const [search, setSearch] = useState("");
  const [selectedTrades, setSelectedTrades] = useState<Trade[]>([]);
  const [minValue, setMinValue] = useState("");

  const currentMetro = METROS.find((m) => m.id === metro) || METROS[0];

  const filtered = useMemo(() => {
    let results = permits;

    if (search) {
      const q = search.toLowerCase();
      results = results.filter(
        (p) =>
          p.description.toLowerCase().includes(q) ||
          p.address.toLowerCase().includes(q) ||
          p.permitNumber.toLowerCase().includes(q)
      );
    }

    if (selectedTrades.length > 0) {
      results = results.filter((p) =>
        p.trades.some((t) => selectedTrades.includes(t))
      );
    }

    if (minValue) {
      const min = Number(minValue);
      results = results.filter((p) => p.estimatedValue >= min);
    }

    return results;
  }, [permits, search, selectedTrades, minValue]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Commercial Permits</h1>
          <div className="mt-1 flex items-center gap-2">
            <div className="relative">
              <select
                value={metro}
                onChange={(e) => setMetro(e.target.value)}
                className="appearance-none rounded-md border bg-background py-1 pl-7 pr-7 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              >
                {METROS.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.label}
                  </option>
                ))}
              </select>
              <MapPin className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <ChevronDown className="pointer-events-none absolute right-1.5 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
            </div>
            <span className="text-sm text-muted-foreground">&middot; Last 14 days</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border p-0.5">
            <button
              onClick={() => setDataSource("mock")}
              className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
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
              className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
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
            onClick={() => refresh()}
            disabled={isLoading}
          >
            <RefreshCw className={`mr-1 h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
          {error}
        </div>
      )}

      {lastUpdated && (
        <div className="mb-4 text-xs text-muted-foreground">
          Last updated: {lastUpdated.toLocaleTimeString()}
          {dataSource === "live" && (
            <Badge variant="outline" className="ml-2 text-[10px]">
              <Radio className="mr-1 h-2 w-2 text-green-500" />
              Live &middot; {currentMetro.label}
            </Badge>
          )}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        <aside className="rounded-lg border bg-card p-4">
          <PermitFilters
            search={search}
            onSearchChange={setSearch}
            selectedTrades={selectedTrades}
            onTradesChange={setSelectedTrades}
            minValue={minValue}
            onMinValueChange={setMinValue}
            resultCount={filtered.length}
          />
        </aside>

        <div className="space-y-3">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16">
              <RefreshCw className="mb-2 h-6 w-6 animate-spin text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Loading permits from {currentMetro.label}...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16">
              <p className="text-sm text-muted-foreground">
                No permits match your filters.
              </p>
              <button
                onClick={() => {
                  setSearch("");
                  setSelectedTrades([]);
                  setMinValue("");
                }}
                className="mt-2 text-sm font-medium text-amber-600 hover:text-amber-700 dark:text-amber-400"
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
