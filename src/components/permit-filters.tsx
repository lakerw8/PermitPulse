"use client";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, X, SlidersHorizontal } from "lucide-react";
import { TRADES, Trade } from "@/lib/types";

interface PermitFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  selectedTrades: Trade[];
  onTradesChange: (trades: Trade[]) => void;
  minValue: string;
  onMinValueChange: (value: string) => void;
  resultCount: number;
}

const TRADE_COLORS: Record<string, string> = {
  HVAC: "bg-blue-100 text-blue-800 hover:bg-blue-200 dark:bg-blue-900/40 dark:text-blue-300 dark:hover:bg-blue-900/60",
  Electrical: "bg-amber-100 text-amber-800 hover:bg-amber-200 dark:bg-amber-900/40 dark:text-amber-300 dark:hover:bg-amber-900/60",
  Plumbing: "bg-cyan-100 text-cyan-800 hover:bg-cyan-200 dark:bg-cyan-900/40 dark:text-cyan-300 dark:hover:bg-cyan-900/60",
  Roofing: "bg-orange-100 text-orange-800 hover:bg-orange-200 dark:bg-orange-900/40 dark:text-orange-300 dark:hover:bg-orange-900/60",
  "Fire Suppression": "bg-red-100 text-red-800 hover:bg-red-200 dark:bg-red-900/40 dark:text-red-300 dark:hover:bg-red-900/60",
  "Glass & Glazing": "bg-sky-100 text-sky-800 hover:bg-sky-200 dark:bg-sky-900/40 dark:text-sky-300 dark:hover:bg-sky-900/60",
  Concrete: "bg-stone-100 text-stone-800 hover:bg-stone-200 dark:bg-stone-900/40 dark:text-stone-300 dark:hover:bg-stone-900/60",
  "Structural Steel": "bg-slate-100 text-slate-800 hover:bg-slate-200 dark:bg-slate-900/40 dark:text-slate-300 dark:hover:bg-slate-900/60",
  Demolition: "bg-rose-100 text-rose-800 hover:bg-rose-200 dark:bg-rose-900/40 dark:text-rose-300 dark:hover:bg-rose-900/60",
  "General Construction": "bg-gray-100 text-gray-800 hover:bg-gray-200 dark:bg-gray-900/40 dark:text-gray-300 dark:hover:bg-gray-900/60",
};

export function PermitFilters({
  search,
  onSearchChange,
  selectedTrades,
  onTradesChange,
  minValue,
  onMinValueChange,
  resultCount,
}: PermitFiltersProps) {
  function toggleTrade(trade: Trade) {
    if (selectedTrades.includes(trade)) {
      onTradesChange(selectedTrades.filter((t) => t !== trade));
    } else {
      onTradesChange([...selectedTrades, trade]);
    }
  }

  function clearAll() {
    onSearchChange("");
    onTradesChange([]);
    onMinValueChange("");
  }

  const hasFilters = search || selectedTrades.length > 0 || minValue;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium">Filters</span>
        {hasFilters && (
          <Button
            variant="ghost"
            size="sm"
            className="ml-auto h-7 text-xs"
            onClick={clearAll}
          >
            <X className="mr-1 h-3 w-3" />
            Clear all
          </Button>
        )}
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search by keyword, address, or permit #..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9"
        />
      </div>

      <div>
        <label className="mb-2 block text-xs font-medium text-muted-foreground">
          Filter by Trade
        </label>
        <div className="flex flex-wrap gap-1.5">
          {TRADES.map((trade) => {
            const isSelected = selectedTrades.includes(trade);
            return (
              <button
                key={trade}
                onClick={() => toggleTrade(trade)}
                className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium transition-all ${
                  isSelected
                    ? `${TRADE_COLORS[trade]} border-transparent ring-1 ring-current/20`
                    : "border-border bg-background text-muted-foreground hover:bg-muted"
                }`}
              >
                {trade}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <label className="mb-2 block text-xs font-medium text-muted-foreground">
          Minimum Value
        </label>
        <div className="flex gap-2">
          {["500000", "1000000", "2000000"].map((val) => (
            <Button
              key={val}
              variant={minValue === val ? "default" : "outline"}
              size="sm"
              className="h-7 text-xs"
              onClick={() => onMinValueChange(minValue === val ? "" : val)}
            >
              ${(Number(val) / 1_000_000).toFixed(Number(val) < 1_000_000 ? 1 : 0)}
              {Number(val) >= 1_000_000 ? "M+" : "M+"}
            </Button>
          ))}
        </div>
      </div>

      <div className="text-xs text-muted-foreground">
        <Badge variant="secondary" className="mr-1 text-xs">
          {resultCount}
        </Badge>
        permits found
      </div>
    </div>
  );
}
