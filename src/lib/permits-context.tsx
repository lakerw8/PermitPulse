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
import { getMockPermitsForMetros } from "./mock-data";

interface PermitsContextValue {
  permits: Permit[];
  isLoading: boolean;
  error: string | null;
  metros: string[];
  setMetros: (metros: string[]) => void;
  daysBack: string;
  setDaysBack: (days: string) => void;
  refresh: () => Promise<void>;
  lastUpdated: Date | null;
  permitCount: number;
}

const PermitsContext = createContext<PermitsContextValue | null>(null);

export function PermitsProvider({ children }: { children: ReactNode }) {
  const [metros, setMetros] = useState<string[]>(["chicago"]);
  const [permits, setPermits] = useState<Permit[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [daysBack, setDaysBack] = useState("30");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchPermits = useCallback(async (targetMetros: string[], days: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const metrosParam = targetMetros.length > 0 ? targetMetros.join(",") : "";
      const res = await fetch(`/api/permits?metros=${metrosParam}&days=${days}`);
      if (!res.ok) throw new Error("Failed to fetch permits");
      const data: Permit[] = await res.json();
      if (data.length > 0) {
        setPermits(data);
      } else {
        setPermits(getMockPermitsForMetros(targetMetros));
      }
      setLastUpdated(new Date());
    } catch {
      setPermits(getMockPermitsForMetros(targetMetros));
      setLastUpdated(new Date());
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refresh = useCallback(async () => {
    await fetchPermits(metros, daysBack);
  }, [metros, daysBack, fetchPermits]);

  useEffect(() => {
    fetchPermits(metros, daysBack);
  }, [metros, daysBack, fetchPermits]);

  return (
    <PermitsContext.Provider
      value={{
        permits,
        isLoading,
        error,
        metros,
        setMetros,
        daysBack,
        setDaysBack,
        refresh,
        lastUpdated,
        permitCount: permits.length,
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
