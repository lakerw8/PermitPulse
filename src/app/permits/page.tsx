"use client";

import { useState, useMemo } from "react";
import { PermitCard } from "@/components/permit-card";
import { PermitFilters } from "@/components/permit-filters";
import { MOCK_PERMITS } from "@/lib/mock-data";
import { Trade } from "@/lib/types";

export default function PermitsPage() {
  const [search, setSearch] = useState("");
  const [selectedTrades, setSelectedTrades] = useState<Trade[]>([]);
  const [minValue, setMinValue] = useState("");

  const filtered = useMemo(() => {
    let results = MOCK_PERMITS;

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
  }, [search, selectedTrades, minValue]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Commercial Permits</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Chicago, IL &middot; Last 14 days
        </p>
      </div>

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
          {filtered.length === 0 ? (
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
