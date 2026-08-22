"use client";

import { useEffect, useState } from "react";
import type { CoverageStatus } from "./coverage-status";

/**
 * Measured coverage for customer-facing copy.
 *
 * Returns null until it loads. Callers render a neutral placeholder in that
 * window rather than a listed count, because the listed count is the number
 * this hook exists to stop us from advertising.
 */
export function useCoverage(): CoverageStatus | null {
  const [status, setStatus] = useState<CoverageStatus | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    fetch("/api/coverage", { signal: controller.signal })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: CoverageStatus | null) => {
        if (data) setStatus(data);
      })
      .catch(() => {
        // Copy falls back to its unquantified form; nothing to recover.
      });

    return () => controller.abort();
  }, []);

  return status;
}

/** "145 markets" / "1 market" */
export function marketCountLabel(count: number): string {
  return `${count} ${count === 1 ? "market" : "markets"}`;
}

/**
 * "2 hours ago", "yesterday", "on 12 Aug".
 *
 * Deliberately coarse: the refresh runs once a weekday morning, so a precise
 * clock time implies a cadence we do not offer.
 */
export function freshnessLabel(iso: string | null, now: Date = new Date()): string {
  if (!iso) return "not yet refreshed";

  const then = new Date(iso);
  if (Number.isNaN(then.getTime())) return "unknown";

  const hours = Math.floor((now.getTime() - then.getTime()) / (60 * 60 * 1000));
  if (hours < 1) return "less than an hour ago";
  if (hours < 24) return `${hours} ${hours === 1 ? "hour" : "hours"} ago`;

  const days = Math.floor(hours / 24);
  if (days === 1) return "yesterday";
  if (days < 7) return `${days} days ago`;

  return `on ${then.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
}
