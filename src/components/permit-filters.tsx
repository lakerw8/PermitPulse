/* Hallmark · genre: modern-minimal · component: permit-filters · design-system: design.md · designed-as-app */
"use client";

import { useMemo, type ReactNode } from "react";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Search, X, Check, ChevronDown } from "lucide-react";
import { TRADES, PERMIT_STATUSES } from "@/lib/types";
import {
  VALUE_RANGES,
  DAY_RANGES,
  type PermitQuery,
  type ValueRange,
  type SortOption,
} from "@/lib/permit-query";

const SORT_LABELS: Record<SortOption, string> = {
  newest: "Newest first",
  "highest-value": "Highest value",
};

interface PermitFiltersProps {
  query: PermitQuery;
  onQueryChange: (patch: Partial<PermitQuery>) => void;
  searchInput: string;
  onSearchInputChange: (value: string) => void;
  onReset: () => void;
}

export function PermitFilters({
  query,
  onQueryChange,
  searchInput,
  onSearchInputChange,
  onReset,
}: PermitFiltersProps) {
  const dayLabel =
    DAY_RANGES.find((d) => d.value === query.days)?.label ?? `${query.days} days`;

  const activeChips = useMemo(
    () => buildChips(query, onQueryChange),
    [query, onQueryChange]
  );

  return (
    <div className="space-y-2.5">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex min-w-[13rem] flex-1 items-center gap-2 rounded-full border border-input bg-card px-3 py-1.5 transition-colors duration-200 focus-within:border-ring">
          <Search className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <input
            type="search"
            value={searchInput}
            onChange={(e) => onSearchInputChange(e.target.value)}
            placeholder="Address, permit number, or keyword"
            aria-label="Search permits"
            className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground [&::-webkit-search-cancel-button]:hidden"
          />
          {searchInput && (
            <button
              type="button"
              onClick={() => onSearchInputChange("")}
              aria-label="Clear search"
              className="shrink-0 text-muted-foreground transition-colors duration-200 hover:text-foreground cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <FilterMenu label={dayLabel} active={query.days !== 30}>
            {DAY_RANGES.map((range) => (
              <OptionRow
                key={range.value}
                label={`Last ${range.label}`}
                selected={query.days === range.value}
                onSelect={() => onQueryChange({ days: range.value })}
              />
            ))}
          </FilterMenu>

          <FilterMenu label="Trade" count={query.trades.length}>
            {TRADES.map((trade) => (
              <CheckRow
                key={trade}
                label={trade}
                checked={query.trades.includes(trade)}
                onToggle={() =>
                  onQueryChange({ trades: toggle(query.trades, trade) })
                }
              />
            ))}
          </FilterMenu>

          <FilterMenu
            label={query.valueRange?.label ?? "Value"}
            active={!!query.valueRange}
          >
            {VALUE_RANGES.map((range) => (
              <OptionRow
                key={range.label}
                label={range.label}
                selected={query.valueRange?.min === range.min}
                onSelect={() =>
                  onQueryChange({
                    valueRange:
                      query.valueRange?.min === range.min ? null : range,
                  })
                }
              />
            ))}
          </FilterMenu>

          <FilterMenu label="Status" count={query.statuses.length}>
            {PERMIT_STATUSES.map((status) => (
              <CheckRow
                key={status}
                label={status}
                checked={query.statuses.includes(status)}
                onToggle={() =>
                  onQueryChange({ statuses: toggle(query.statuses, status) })
                }
              />
            ))}
          </FilterMenu>

          <FilterMenu
            label={SORT_LABELS[query.sort]}
            active={query.sort !== "newest"}
          >
            {(Object.keys(SORT_LABELS) as SortOption[]).map((sort) => (
              <OptionRow
                key={sort}
                label={SORT_LABELS[sort]}
                selected={query.sort === sort}
                onSelect={() => onQueryChange({ sort })}
              />
            ))}
          </FilterMenu>
        </div>
      </div>

      {activeChips.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          {activeChips.map((chip) => (
            <button
              key={chip.key}
              type="button"
              onClick={chip.onRemove}
              className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/8 py-1 pl-2.5 pr-2 text-xs font-medium text-primary transition-colors duration-200 hover:bg-primary/15 cursor-pointer"
            >
              {chip.label}
              <X className="h-3 w-3" aria-hidden />
              <span className="sr-only">Remove filter</span>
            </button>
          ))}
          <button
            type="button"
            onClick={onReset}
            className="ml-1 text-xs font-medium text-muted-foreground transition-colors duration-200 hover:text-foreground cursor-pointer"
          >
            Clear all
          </button>
        </div>
      )}
    </div>
  );
}

// ── pieces ────────────────────────────────────────────────────────────────────

function FilterMenu({
  label,
  count = 0,
  active = false,
  children,
}: {
  label: string;
  count?: number;
  active?: boolean;
  children: ReactNode;
}) {
  const isActive = active || count > 0;
  return (
    <Popover>
      <PopoverTrigger
        className={`inline-flex select-none items-center gap-1.5 rounded-full border py-1.5 pl-3 pr-2.5 text-sm transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring cursor-pointer ${
          isActive
            ? "border-primary/40 bg-primary/8 font-medium text-primary"
            : "border-border bg-card text-foreground hover:border-foreground/25"
        }`}
      >
        {label}
        {count > 0 && (
          <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold tabular-nums text-primary-foreground">
            {count}
          </span>
        )}
        <ChevronDown className="h-3.5 w-3.5 opacity-60" />
      </PopoverTrigger>
      <PopoverContent align="start" sideOffset={6} className="w-56 gap-0 p-1">
        {children}
      </PopoverContent>
    </Popover>
  );
}

function OptionRow({
  label,
  selected,
  onSelect,
}: {
  label: string;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className="flex w-full items-center justify-between gap-2 rounded-md px-2.5 py-1.5 text-left text-sm transition-colors duration-200 hover:bg-muted cursor-pointer"
    >
      <span className={selected ? "font-medium" : ""}>{label}</span>
      {selected && <Check className="h-3.5 w-3.5 shrink-0 text-primary" />}
    </button>
  );
}

function CheckRow({
  label,
  checked,
  onToggle,
}: {
  label: string;
  checked: boolean;
  onToggle: () => void;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm transition-colors duration-200 hover:bg-muted">
      <Checkbox checked={checked} onCheckedChange={onToggle} className="shrink-0" />
      <span className="truncate">{label}</span>
    </label>
  );
}

// ── helpers ───────────────────────────────────────────────────────────────────

function toggle<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

interface Chip {
  key: string;
  label: string;
  onRemove: () => void;
}

function buildChips(
  query: PermitQuery,
  onQueryChange: (patch: Partial<PermitQuery>) => void
): Chip[] {
  const chips: Chip[] = [];

  if (query.search.trim()) {
    chips.push({
      key: "search",
      label: `"${query.search.trim()}"`,
      onRemove: () => onQueryChange({ search: "" }),
    });
  }

  for (const trade of query.trades) {
    chips.push({
      key: `trade-${trade}`,
      label: trade,
      onRemove: () =>
        onQueryChange({ trades: query.trades.filter((t) => t !== trade) }),
    });
  }

  for (const status of query.statuses) {
    chips.push({
      key: `status-${status}`,
      label: status,
      onRemove: () =>
        onQueryChange({ statuses: query.statuses.filter((s) => s !== status) }),
    });
  }

  if (query.valueRange) {
    const range: ValueRange = query.valueRange;
    chips.push({
      key: "value",
      label: range.label || formatRange(range),
      onRemove: () => onQueryChange({ valueRange: null }),
    });
  }

  return chips;
}

function formatRange(range: ValueRange): string {
  const short = (n: number) =>
    n >= 1_000_000 ? `$${n / 1_000_000}M` : `$${n / 1_000}K`;
  return range.max === null
    ? `${short(range.min)}+`
    : `${short(range.min)}-${short(range.max)}`;
}
