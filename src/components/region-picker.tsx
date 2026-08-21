/* Hallmark · genre: modern-minimal · component: region-picker · design-system: design.md · designed-as-app */
"use client";

import { useState, useMemo, useCallback } from "react";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import {
  REGIONS,
  MULTI_CITY_REGIONS,
  SINGLE_CITY_REGIONS,
  searchRegions,
  nearestRegions,
  summarizeSelection,
  regionStates,
  getCity,
  getRegion,
  type Region,
} from "@/lib/regions";
import {
  MapPin,
  ChevronDown,
  ChevronRight,
  Search,
  LocateFixed,
  Loader2,
  X,
} from "lucide-react";

const RECENTS_KEY = "permitpulse:recent-regions";
const MAX_RECENTS = 4;

interface RegionPickerProps {
  /** Selected city ids, the wire format the permits API expects. */
  selected: string[];
  onChange: (cityIds: string[]) => void;
}

type LocationState =
  | { status: "idle" }
  | { status: "locating" }
  | { status: "error"; message: string };

function readRecents(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(RECENTS_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : null;
    if (Array.isArray(parsed)) {
      return parsed.filter((v): v is string => typeof v === "string");
    }
  } catch {
    // Unreadable storage simply means no recents to show.
  }
  return [];
}

export function RegionPicker({ selected, onChange }: RegionPickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [location, setLocation] = useState<LocationState>({ status: "idle" });
  const [recents, setRecents] = useState<string[]>([]);
  // Manual expand/collapse, scoped to the query it was made against so a new
  // search starts from the auto-expanded set again.
  const [overrides, setOverrides] = useState<{
    term: string;
    map: Record<string, boolean>;
  }>({ term: "", map: {} });

  const handleOpenChange = useCallback((next: boolean) => {
    if (next) {
      setSearch("");
      setOverrides({ term: "", map: {} });
      setLocation({ status: "idle" });
      setRecents(readRecents());
    }
    setOpen(next);
  }, []);

  const selectedSet = useMemo(() => new Set(selected), [selected]);
  const summary = useMemo(() => summarizeSelection(selected), [selected]);

  const rememberRegion = useCallback((regionId: string) => {
    setRecents((current) => {
      const next = [regionId, ...current.filter((r) => r !== regionId)].slice(
        0,
        MAX_RECENTS
      );
      try {
        window.localStorage.setItem(RECENTS_KEY, JSON.stringify(next));
      } catch {
        // Selection still applies; only the shortcut list is lost.
      }
      return next;
    });
  }, []);

  /** Replace the whole selection with one market. The one-click common case. */
  const chooseRegion = useCallback(
    (region: Region) => {
      onChange(region.cityIds);
      rememberRegion(region.id);
      setOpen(false);
    },
    [onChange, rememberRegion]
  );

  /** Add or remove an entire market without disturbing the rest. */
  const toggleRegion = useCallback(
    (region: Region) => {
      const allSelected = region.cityIds.every((c) => selectedSet.has(c));
      if (allSelected) {
        onChange(selected.filter((c) => !region.cityIds.includes(c)));
      } else {
        onChange([...new Set([...selected, ...region.cityIds])]);
        rememberRegion(region.id);
      }
    },
    [onChange, rememberRegion, selected, selectedSet]
  );

  const toggleCity = useCallback(
    (cityId: string) => {
      onChange(
        selectedSet.has(cityId)
          ? selected.filter((c) => c !== cityId)
          : [...selected, cityId]
      );
    },
    [onChange, selected, selectedSet]
  );

  const useMyLocation = useCallback(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setLocation({
        status: "error",
        message: "This browser cannot share a location.",
      });
      return;
    }
    setLocation({ status: "locating" });
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const [nearest] = nearestRegions({
          lat: position.coords.latitude,
          lon: position.coords.longitude,
        });
        if (!nearest) {
          setLocation({
            status: "error",
            message: "No covered market near you yet.",
          });
          return;
        }
        setLocation({ status: "idle" });
        chooseRegion(nearest.region);
      },
      () => {
        setLocation({
          status: "error",
          message: "Location unavailable. Search for your market instead.",
        });
      },
      { timeout: 8000, maximumAge: 300_000 }
    );
  }, [chooseRegion]);

  const results = useMemo(() => searchRegions(search), [search]);

  // A search for "plano" should show Plano, not just the market containing it,
  // so regions matched only through a city open by default. A manual toggle
  // overrides that for as long as the query stays the same.
  const autoExpanded = useMemo(
    () =>
      new Set(
        search
          ? results
              .filter(
                (r) =>
                  !r.regionMatched &&
                  r.matchedCities.length > 0 &&
                  r.region.cityIds.length > 1
              )
              .map((r) => r.region.id)
          : []
      ),
    [search, results]
  );

  const activeOverrides = overrides.term === search ? overrides.map : {};

  const isExpanded = (regionId: string) =>
    activeOverrides[regionId] ?? autoExpanded.has(regionId);

  const toggleExpanded = (regionId: string) => {
    const next = !isExpanded(regionId);
    setOverrides((current) => ({
      term: search,
      map: { ...(current.term === search ? current.map : {}), [regionId]: next },
    }));
  };
  const recentRegions = useMemo(
    () => recents.map(getRegion).filter((r): r is Region => !!r),
    [recents]
  );

  const selectionState = (region: Region) => {
    const hits = region.cityIds.filter((c) => selectedSet.has(c)).length;
    if (hits === 0) return "none" as const;
    return hits === region.cityIds.length ? ("all" as const) : ("some" as const);
  };

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger className="group inline-flex max-w-full select-none items-center gap-2 rounded-full border border-border bg-card py-1.5 pl-3 pr-2.5 text-sm font-medium transition-colors duration-200 hover:border-foreground/25 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring cursor-pointer">
        <MapPin className="h-3.5 w-3.5 shrink-0 text-primary" />
        <span className="truncate">{summary.label}</span>
        {summary.cityCount > 1 && (
          <span className="shrink-0 text-xs font-normal tabular-nums text-muted-foreground">
            {summary.cityCount} cities
          </span>
        )}
        <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      </PopoverTrigger>

      <PopoverContent
        align="start"
        sideOffset={8}
        className="w-[min(26rem,calc(100vw-2rem))] gap-0 p-0"
      >
        <div className="border-b border-border p-2.5">
          <div className="flex items-center gap-2 rounded-md border border-input bg-background px-2.5 py-1.5 focus-within:border-ring">
            <Search className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <input
              autoFocus
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search a city, market, or state"
              aria-label="Search a city, market, or state"
              className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                aria-label="Clear search"
                className="shrink-0 text-muted-foreground transition-colors duration-200 hover:text-foreground cursor-pointer"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={useMyLocation}
            disabled={location.status === "locating"}
            className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-xs font-medium transition-colors duration-200 hover:bg-muted disabled:opacity-60 cursor-pointer"
          >
            {location.status === "locating" ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <LocateFixed className="h-3 w-3 text-primary" />
            )}
            {location.status === "locating" ? "Finding you" : "Use my location"}
          </button>
          {location.status === "error" && (
            <p className="mt-1.5 text-xs text-muted-foreground">
              {location.message}
            </p>
          )}
        </div>

        <div className="max-h-[min(24rem,60vh)] overflow-y-auto overscroll-contain py-1">
          {search ? (
            results.length === 0 ? (
              <p className="px-3 py-8 text-center text-sm text-muted-foreground">
                Nothing covered matches &ldquo;{search}&rdquo;
              </p>
            ) : (
              results.map(({ region, matchedCities }) => (
                <RegionRow
                  key={region.id}
                  region={region}
                  state={selectionState(region)}
                  expanded={isExpanded(region.id)}
                  onExpand={() => toggleExpanded(region.id)}
                  onChoose={() => chooseRegion(region)}
                  onToggle={() => toggleRegion(region)}
                  onToggleCity={toggleCity}
                  selectedSet={selectedSet}
                  highlightCities={matchedCities.map((c) => c.id)}
                />
              ))
            )
          ) : (
            <>
              {recentRegions.length > 0 && (
                <Group label="Recent">
                  <div className="flex flex-wrap gap-1.5 px-3 pb-2 pt-1">
                    {recentRegions.map((region) => (
                      <button
                        key={region.id}
                        type="button"
                        onClick={() => chooseRegion(region)}
                        className="rounded-full border border-border px-2.5 py-1 text-xs font-medium transition-colors duration-200 hover:bg-muted cursor-pointer"
                      >
                        {region.name}
                      </button>
                    ))}
                  </div>
                </Group>
              )}

              <Group label={`Metro markets · ${MULTI_CITY_REGIONS.length}`}>
                {MULTI_CITY_REGIONS.map((region) => (
                  <RegionRow
                    key={region.id}
                    region={region}
                    state={selectionState(region)}
                    expanded={isExpanded(region.id)}
                    onExpand={() => toggleExpanded(region.id)}
                    onChoose={() => chooseRegion(region)}
                    onToggle={() => toggleRegion(region)}
                    onToggleCity={toggleCity}
                    selectedSet={selectedSet}
                  />
                ))}
              </Group>

              <Group label={`Single cities · ${SINGLE_CITY_REGIONS.length}`}>
                {SINGLE_CITY_REGIONS.map((region) => (
                  <RegionRow
                    key={region.id}
                    region={region}
                    state={selectionState(region)}
                    expanded={false}
                    onChoose={() => chooseRegion(region)}
                    onToggle={() => toggleRegion(region)}
                    onToggleCity={toggleCity}
                    selectedSet={selectedSet}
                  />
                ))}
              </Group>
            </>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-border px-3 py-2">
          <span className="min-w-0 truncate text-xs tabular-nums text-muted-foreground">
            {summary.cityCount === 0
              ? "No cities selected"
              : `${summary.cityCount} ${
                  summary.cityCount === 1 ? "city" : "cities"
                } selected`}
          </span>
          <div className="flex shrink-0 items-center gap-3">
            {summary.cityCount > 0 && (
              <button
                type="button"
                onClick={() => onChange([])}
                className="text-xs font-medium text-muted-foreground transition-colors duration-200 hover:text-foreground cursor-pointer"
              >
                Clear
              </button>
            )}
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-full bg-primary px-3 py-1 text-xs font-medium text-primary-foreground transition-colors duration-200 hover:bg-primary/90 cursor-pointer"
            >
              Done
            </button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function Group({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="pb-1">
      <p className="px-3 pb-1 pt-2 text-xs font-medium text-muted-foreground">
        {label}
      </p>
      {children}
    </div>
  );
}

interface RegionRowProps {
  region: Region;
  state: "none" | "some" | "all";
  expanded: boolean;
  onExpand?: () => void;
  onChoose: () => void;
  onToggle: () => void;
  onToggleCity: (cityId: string) => void;
  selectedSet: Set<string>;
  highlightCities?: string[];
}

function RegionRow({
  region,
  state,
  expanded,
  onExpand,
  onChoose,
  onToggle,
  onToggleCity,
  selectedSet,
  highlightCities,
}: RegionRowProps) {
  const multiCity = region.cityIds.length > 1;

  return (
    <div>
      <div className="flex items-center gap-2 px-3 py-1.5 transition-colors duration-200 hover:bg-muted/60">
        <Checkbox
          checked={state === "all"}
          indeterminate={state === "some"}
          onCheckedChange={onToggle}
          aria-label={`Include ${region.name}`}
          className="shrink-0"
        />
        <button
          type="button"
          onClick={onChoose}
          className="flex min-w-0 flex-1 items-baseline gap-2 text-left cursor-pointer"
        >
          <span className="truncate text-sm">{region.name}</span>
          <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
            {regionStates(region)}
            {multiCity ? ` · ${region.cityIds.length}` : ""}
          </span>
        </button>
        {multiCity && onExpand && (
          <button
            type="button"
            onClick={onExpand}
            aria-expanded={expanded}
            aria-label={`${expanded ? "Hide" : "Show"} cities in ${region.name}`}
            className="shrink-0 rounded p-0.5 text-muted-foreground transition-colors duration-200 hover:text-foreground cursor-pointer"
          >
            {expanded ? (
              <ChevronDown className="h-3.5 w-3.5" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5" />
            )}
          </button>
        )}
      </div>

      {expanded && multiCity && (
        <div className="ml-[1.4rem] border-l border-border pb-1 pl-2">
          {region.cityIds.map((cityId) => {
            const city = getCity(cityId);
            if (!city) return null;
            const highlighted = highlightCities?.includes(cityId);
            return (
              <label
                key={cityId}
                className="flex cursor-pointer items-center gap-2 px-2 py-1 transition-colors duration-200 hover:bg-muted/60"
              >
                <Checkbox
                  checked={selectedSet.has(cityId)}
                  onCheckedChange={() => onToggleCity(cityId)}
                  className="shrink-0"
                />
                <span
                  className={`truncate text-sm ${
                    highlighted ? "font-medium text-foreground" : "text-muted-foreground"
                  }`}
                >
                  {city.name}
                </span>
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
}

/** Region count, surfaced for copy that quotes coverage. */
export const REGION_COUNT = REGIONS.length;
