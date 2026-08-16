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
import { MOCK_PERMITS } from "./mock-data";

interface PermitsContextValue {
  permits: Permit[];
  isLoading: boolean;
  error: string | null;
  dataSource: "mock" | "live";
  setDataSource: (source: "mock" | "live") => void;
  refresh: () => Promise<void>;
  lastUpdated: Date | null;
}

const PermitsContext = createContext<PermitsContextValue | null>(null);

export function PermitsProvider({ children }: { children: ReactNode }) {
  const [permits, setPermits] = useState<Permit[]>(MOCK_PERMITS);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dataSource, setDataSource] = useState<"mock" | "live">("mock");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(new Date());

  const fetchLivePermits = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/permits");
      if (!res.ok) throw new Error("Failed to fetch permits");
      const data: Permit[] = await res.json();
      setPermits(data.length > 0 ? data : MOCK_PERMITS);
      setLastUpdated(new Date());
      if (data.length === 0) {
        setError("No live data available, showing sample permits");
        setDataSource("mock");
      }
    } catch (e) {
      setError("Could not load live data, showing sample permits");
      setPermits(MOCK_PERMITS);
      setDataSource("mock");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refresh = useCallback(async () => {
    if (dataSource === "live") {
      await fetchLivePermits();
    } else {
      setPermits(MOCK_PERMITS);
      setLastUpdated(new Date());
    }
  }, [dataSource, fetchLivePermits]);

  useEffect(() => {
    if (dataSource === "live") {
      fetchLivePermits();
    } else {
      setPermits(MOCK_PERMITS);
      setLastUpdated(new Date());
      setError(null);
    }
  }, [dataSource, fetchLivePermits]);

  return (
    <PermitsContext.Provider
      value={{
        permits,
        isLoading,
        error,
        dataSource,
        setDataSource,
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
