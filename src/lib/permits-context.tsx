"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import type { Permit } from "./types";
import {
  EMPTY_QUERY,
  DEFAULT_PAGE_SIZE,
  queryToSearchParams,
  type PermitQuery,
  type PermitPage,
} from "./permit-query";
import {
  subscribeToCities,
  getCitiesSnapshot,
  getCitiesServerSnapshot,
  setCities,
} from "./city-selection-store";

const SEARCH_DEBOUNCE_MS = 300;

/** Everything in a query except the region, which is persisted separately. */
type Filters = Omit<PermitQuery, "metros">;

interface PermitsContextValue {
  /** The page of permits currently loaded, in display order. */
  permits: Permit[];
  /** Every permit matching the filters, not just the loaded page. */
  total: number;
  hasMore: boolean;
  isLoading: boolean;
  isLoadingMore: boolean;
  error: string | null;

  query: PermitQuery;
  setQuery: (patch: Partial<PermitQuery>) => void;
  resetFilters: () => void;

  /** Bound to the search field; `query.search` trails it by a debounce. */
  searchInput: string;
  setSearchInput: (value: string) => void;

  loadMore: () => void;
  refresh: () => void;
  lastUpdated: Date | null;
}

const PermitsContext = createContext<PermitsContextValue | null>(null);

export function PermitsProvider({ children }: { children: ReactNode }) {
  const metros = useSyncExternalStore(
    subscribeToCities,
    getCitiesSnapshot,
    getCitiesServerSnapshot
  );

  const [filters, setFilters] = useState<Filters>(EMPTY_QUERY);
  const [searchInput, setSearchInput] = useState("");

  const [permits, setPermits] = useState<Permit[]>([]);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  // Which query the data on hand belongs to, and any error from loading it.
  // Loading is derived from these rather than tracked as its own flag.
  const [loaded, setLoaded] = useState<{ key: string; error: string | null } | null>(
    null
  );

  const query = useMemo<PermitQuery>(
    () => ({ ...filters, metros }),
    [filters, metros]
  );

  const hasRegion = metros.length > 0;

  const setQuery = useCallback((patch: Partial<PermitQuery>) => {
    const { metros: nextMetros, ...rest } = patch;
    if (nextMetros) setCities(nextMetros);
    if (Object.keys(rest).length > 0) {
      setFilters((current) => ({ ...current, ...rest }));
    }
  }, []);

  const resetFilters = useCallback(() => {
    setSearchInput("");
    setFilters((current) => ({ ...EMPTY_QUERY, days: current.days }));
  }, []);

  // Debounce the search term so typing does not fire a request per keystroke.
  useEffect(() => {
    const timer = setTimeout(() => {
      setFilters((current) =>
        current.search === searchInput ? current : { ...current, search: searchInput }
      );
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const fetchPage = useCallback(
    async (target: PermitQuery, offset: number, signal: AbortSignal) => {
      const params = queryToSearchParams(target, {
        limit: DEFAULT_PAGE_SIZE,
        offset,
      });
      const res = await fetch(`/api/permits?${params}`, { signal });
      if (!res.ok) throw new Error(`Request failed (${res.status})`);
      return (await res.json()) as PermitPage;
    },
    []
  );

  // Any change to the filters or the region restarts pagination. Refresh bumps
  // the token so an otherwise identical query counts as a new request.
  const requestKey = useMemo(
    () =>
      `${queryToSearchParams(query, {
        limit: DEFAULT_PAGE_SIZE,
        offset: 0,
      })}|${reloadToken}`,
    [query, reloadToken]
  );

  const isLoading = hasRegion && loaded?.key !== requestKey;
  const error = loaded?.key === requestKey ? loaded.error : null;

  useEffect(() => {
    if (!hasRegion) return;

    const controller = new AbortController();

    fetchPage(query, 0, controller.signal)
      .then((data) => {
        setPermits(data.permits);
        setTotal(data.total);
        setHasMore(data.hasMore);
        setLastUpdated(new Date());
        setLoaded({ key: requestKey, error: null });
      })
      .catch(() => {
        if (controller.signal.aborted) return;
        setPermits([]);
        setTotal(0);
        setHasMore(false);
        setLastUpdated(new Date());
        setLoaded({
          key: requestKey,
          error: "Permit data is temporarily unavailable. Please try again later.",
        });
      });

    return () => controller.abort();
    // requestKey collapses the query and the refresh token into one string.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestKey, hasRegion, fetchPage]);

  const loadMore = useCallback(() => {
    if (isLoadingMore || !hasMore) return;
    const controller = new AbortController();
    setIsLoadingMore(true);
    fetchPage(query, permits.length, controller.signal)
      .then((data) => {
        setPermits((current) => [...current, ...data.permits]);
        setTotal(data.total);
        setHasMore(data.hasMore);
      })
      .catch(() => setHasMore(false))
      .finally(() => setIsLoadingMore(false));
  }, [fetchPage, hasMore, isLoadingMore, permits.length, query]);

  const refresh = useCallback(() => setReloadToken((t) => t + 1), []);

  // With no region selected there is nothing to report, so the results are
  // derived as empty rather than cleared through an extra state write.
  const value = useMemo<PermitsContextValue>(
    () => ({
      permits: hasRegion ? permits : [],
      total: hasRegion ? total : 0,
      hasMore: hasRegion ? hasMore : false,
      isLoading: hasRegion ? isLoading : false,
      isLoadingMore,
      error: hasRegion ? error : null,
      query,
      setQuery,
      resetFilters,
      searchInput,
      setSearchInput,
      loadMore,
      refresh,
      lastUpdated,
    }),
    [
      error,
      hasMore,
      hasRegion,
      isLoading,
      isLoadingMore,
      lastUpdated,
      loadMore,
      permits,
      query,
      refresh,
      resetFilters,
      searchInput,
      setQuery,
      total,
    ]
  );

  return (
    <PermitsContext.Provider value={value}>{children}</PermitsContext.Provider>
  );
}

export function usePermits() {
  const ctx = useContext(PermitsContext);
  if (!ctx) throw new Error("usePermits must be used within PermitsProvider");
  return ctx;
}
