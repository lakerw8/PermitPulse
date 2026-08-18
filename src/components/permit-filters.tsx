/* Hallmark · genre: modern-minimal · component: permit-filters · design-system: design.md · designed-as-app */
"use client";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, X, ArrowUpDown } from "lucide-react";
import { TRADES, Trade, PermitStatus, PERMIT_STATUSES } from "@/lib/types";

export type SortOption = "newest" | "highest-value";

export interface ValueRange {
  min: number;
  max: number | null;
  label: string;
}

const VALUE_RANGES: ValueRange[] = [
  { min: 50000, max: 500000, label: "$50K–$500K" },
  { min: 500000, max: 2000000, label: "$500K–$2M" },
  { min: 2000000, max: null, label: "$2M+" },
];

interface PermitFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  selectedTrades: Trade[];
  onTradesChange: (trades: Trade[]) => void;
  valueRange: ValueRange | null;
  onValueRangeChange: (range: ValueRange | null) => void;
  daysBack: string;
  onDaysBackChange: (value: string) => void;
  selectedStatuses: PermitStatus[];
  onStatusesChange: (statuses: PermitStatus[]) => void;
  sortBy: SortOption;
  onSortChange: (sort: SortOption) => void;
  resultCount: number;
}

const TRADE_COLORS: Record<string, string> = {
  HVAC: "bg-blue-100 text-blue-800 hover:bg-blue-200 dark:bg-blue-900/40 dark:text-blue-300 dark:hover:bg-blue-900/60",
  Electrical: "bg-amber-100 text-amber-800 hover:bg-amber-200 dark:bg-amber-900/40 dark:text-amber-300 dark:hover:bg-amber-900/60",
  Plumbing: "bg-cyan-100 text-cyan-800 hover:bg-cyan-200 dark:bg-cyan-900/40 dark:text-cyan-300 dark:hover:bg-cyan-900/60",
  Roofing: "bg-orange-100 text-orange-800 hover:bg-orange-200 dark:bg-orange-900/40 dark:text-orange-300 dark:hover:bg-orange-900/60",
  "Fire Suppression": "bg-red-100 text-red-800 hover:bg-red-200 dark:bg-red-900/40 dark:text-red-300 dark:hover:bg-red-900/60",
  "Glass & Glazing": "bg-sky-100 text-sky-800 hover:bg-sky-200 dark:bg-sky-900/40 dark:text-sky-300 dark:hover:bg-sky-900/60",
  Concrete: "bg-yellow-100 text-yellow-800 hover:bg-yellow-200 dark:bg-yellow-900/40 dark:text-yellow-300 dark:hover:bg-yellow-900/60",
  "Structural Steel": "bg-indigo-100 text-indigo-800 hover:bg-indigo-200 dark:bg-indigo-900/40 dark:text-indigo-300 dark:hover:bg-indigo-900/60",
  Demolition: "bg-rose-100 text-rose-800 hover:bg-rose-200 dark:bg-rose-900/40 dark:text-rose-300 dark:hover:bg-rose-900/60",
  "General Construction": "bg-gray-100 text-gray-800 hover:bg-gray-200 dark:bg-gray-900/40 dark:text-gray-300 dark:hover:bg-gray-900/60",
};

const STATUS_COLORS: Record<PermitStatus, string> = {
  Issued: "bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-900/40 dark:text-green-300 dark:hover:bg-green-900/60",
  "Under Review": "bg-amber-100 text-amber-800 hover:bg-amber-200 dark:bg-amber-900/40 dark:text-amber-300 dark:hover:bg-amber-900/60",
  Approved: "bg-blue-100 text-blue-800 hover:bg-blue-200 dark:bg-blue-900/40 dark:text-blue-300 dark:hover:bg-blue-900/60",
  Completed: "bg-gray-100 text-gray-500 hover:bg-gray-200 dark:bg-gray-900/40 dark:text-gray-400 dark:hover:bg-gray-900/60",
};

export function PermitFilters({
  search,
  onSearchChange,
  selectedTrades,
  onTradesChange,
  valueRange,
  onValueRangeChange,
  daysBack,
  onDaysBackChange,
  selectedStatuses,
  onStatusesChange,
  sortBy,
  onSortChange,
  resultCount,
}: PermitFiltersProps) {
  function toggleTrade(trade: Trade) {
    if (selectedTrades.includes(trade)) {
      onTradesChange(selectedTrades.filter((t) => t !== trade));
    } else {
      onTradesChange([...selectedTrades, trade]);
    }
  }

  function toggleStatus(status: PermitStatus) {
    if (selectedStatuses.includes(status)) {
      onStatusesChange(selectedStatuses.filter((s) => s !== status));
    } else {
      onStatusesChange([...selectedStatuses, status]);
    }
  }

  function clearAll() {
    onSearchChange("");
    onTradesChange([]);
    onValueRangeChange(null);
    onDaysBackChange("30");
    onStatusesChange([]);
    onSortChange("newest");
  }

  const hasFilters =
    search ||
    selectedTrades.length > 0 ||
    valueRange ||
    daysBack !== "30" ||
    selectedStatuses.length > 0 ||
    sortBy !== "newest";

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <span className="font-heading text-sm font-semibold tracking-tight">Filters</span>
        {hasFilters && (
          <button
            className="flex items-center gap-1 text-xs text-muted-foreground transition-colors duration-200 hover:text-foreground"
            onClick={clearAll}
          >
            <X className="h-3 w-3" />
            Clear
          </button>
        )}
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Keyword, address, or permit #"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9 text-sm"
        />
      </div>

      <div>
        <label className="mb-2 flex items-center gap-1 text-xs font-medium text-muted-foreground">
          <ArrowUpDown className="h-3 w-3" />
          Sort
        </label>
        <div className="grid grid-cols-2 gap-1.5">
          <Button
            variant={sortBy === "newest" ? "default" : "outline"}
            size="sm"
            className="h-7 rounded-full text-xs"
            onClick={() => onSortChange("newest")}
          >
            Newest
          </Button>
          <Button
            variant={sortBy === "highest-value" ? "default" : "outline"}
            size="sm"
            className="h-7 rounded-full text-xs"
            onClick={() => onSortChange("highest-value")}
          >
            Highest Value
          </Button>
        </div>
      </div>

      <div>
        <label className="mb-2 block text-xs font-medium text-muted-foreground">
          Time Range
        </label>
        <div className="grid grid-cols-4 gap-1.5">
          {[
            { value: "7", label: "7d" },
            { value: "14", label: "14d" },
            { value: "30", label: "30d" },
            { value: "90", label: "90d" },
          ].map((opt) => (
            <Button
              key={opt.value}
              variant={daysBack === opt.value ? "default" : "outline"}
              size="sm"
              className="h-7 rounded-full text-xs tabular-nums"
              onClick={() => onDaysBackChange(opt.value)}
            >
              {opt.label}
            </Button>
          ))}
        </div>
      </div>

      <div>
        <label className="mb-2 block text-xs font-medium text-muted-foreground">
          Status
        </label>
        <div className="flex flex-wrap gap-1.5">
          {PERMIT_STATUSES.map((status) => {
            const isSelected = selectedStatuses.includes(status);
            return (
              <button
                key={status}
                onClick={() => toggleStatus(status)}
                className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium transition-colors duration-200 ${
                  isSelected
                    ? `${STATUS_COLORS[status]} border-transparent`
                    : "border-border bg-background text-muted-foreground hover:bg-muted"
                }`}
              >
                {status}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <label className="mb-2 block text-xs font-medium text-muted-foreground">
          Trade
        </label>
        <div className="flex flex-wrap gap-1.5">
          {TRADES.map((trade) => {
            const isSelected = selectedTrades.includes(trade);
            return (
              <button
                key={trade}
                onClick={() => toggleTrade(trade)}
                className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium transition-colors duration-200 ${
                  isSelected
                    ? `${TRADE_COLORS[trade]} border-transparent`
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
          Project Value
        </label>
        <div className="grid grid-cols-3 gap-1.5">
          {VALUE_RANGES.map((range) => {
            const isSelected =
              valueRange?.min === range.min && valueRange?.max === range.max;
            return (
              <Button
                key={range.label}
                variant={isSelected ? "default" : "outline"}
                size="sm"
                className="h-7 rounded-full text-xs tabular-nums"
                onClick={() =>
                  onValueRangeChange(isSelected ? null : range)
                }
              >
                {range.label}
              </Button>
            );
          })}
        </div>
      </div>

      <div className="border-t border-border pt-3 text-xs tabular-nums text-muted-foreground">
        <span className="font-medium text-foreground">{resultCount}</span> permits
      </div>
    </div>
  );
}
