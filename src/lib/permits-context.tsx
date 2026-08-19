"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import type { Permit } from "./types";
import { MOCK_PERMITS, refreshMockPermitDates } from "./mock-data";

interface PermitsContextValue {
  permits: Permit[];
  isLoading: boolean;
  error: string | null;
  dataSource: "mock" | "live";
  setDataSource: (source: "mock" | "live") => void;
  metros: string[];
  setMetros: (metros: string[]) => void;
  daysBack: string;
  setDaysBack: (days: string) => void;
  refresh: () => Promise<void>;
  lastUpdated: Date | null;
}

const PermitsContext = createContext<PermitsContextValue | null>(null);

export function PermitsProvider({ children }: { children: ReactNode }) {
  const [permits, setPermits] = useState<Permit[]>(MOCK_PERMITS);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dataSource, setDataSource] = useState<"mock" | "live">("mock");
  const [metros, setMetros] = useState<string[]>(["chicago"]);
  const [daysBack, setDaysBack] = useState("30");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  useEffect(() => {
    setPermits(refreshMockPermitDates());
    setLastUpdated(new Date());
  }, []);

  const fetchLivePermits = useCallback(async (targetMetros: string[], days: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const metrosParam = targetMetros.length > 0 ? targetMetros.join(",") : "";
      const res = await fetch(`/api/permits?metros=${metrosParam}&days=${days}`);
      if (!res.ok) throw new Error("Failed to fetch permits");
      const data: Permit[] = await res.json();
      setPermits(data.length > 0 ? data : refreshMockPermitDates());
      setLastUpdated(new Date());
      if (data.length === 0) {
        setError("No live data available, showing sample permits");
        setDataSource("mock");
      }
    } catch {
      setError("Could not load live data, showing sample permits");
      setPermits(refreshMockPermitDates());
      setDataSource("mock");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refresh = useCallback(async () => {
    if (dataSource === "live") {
      await fetchLivePermits(metros, daysBack);
    } else {
      setPermits(refreshMockPermitDates());
      setLastUpdated(new Date());
    }
  }, [dataSource, metros, daysBack, fetchLivePermits]);

  useEffect(() => {
    if (dataSource === "live") {
      fetchLivePermits(metros, daysBack);
    } else {
      setPermits(refreshMockPermitDates());
      setLastUpdated(new Date());
      setError(null);
    }
  }, [dataSource, metros, daysBack, fetchLivePermits]);

  return (
    <PermitsContext.Provider
      value={{
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
      }}
    >
      {children}
    </PermitsContext.Provider>
  );
}

export function usePermits() {
  const ctx = useContext(PermitsContext);
  if (!ctx) throw new Error("usePermits must be used within PermitsProvider");
  return ctx;
}
