/* Hallmark · genre: modern-minimal · module: city-selection-store · design-system: design.md · designed-as-app */

/**
 * The contractor's selected cities, persisted across visits.
 *
 * Region choice is durable preference rather than session state: a Denver
 * mechanical sub wants Denver every time they open the page, not Chicago. It
 * lives in an external store read through `useSyncExternalStore` so the value
 * is available on the first client render (no flash of the default region) and
 * stays consistent across tabs.
 */

import { REGIONS } from "./regions";

const STORAGE_KEY = "permitpulse:cities";

/** Region shown to a visitor who has never chosen one. */
export const DEFAULT_CITIES: string[] =
  REGIONS.find((r) => r.id === "chicago")?.cityIds ?? ["chicago"];

const listeners = new Set<() => void>();

// `useSyncExternalStore` requires a referentially stable snapshot. Parsing is
// cached against the raw string so repeat reads return the same array.
let cachedRaw: string | null = null;
let cachedValue: string[] = DEFAULT_CITIES;

function readRaw(): string | null {
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

const NO_CITIES: string[] = [];

function parse(raw: string | null): string[] {
  // No entry at all means a first-time visitor, who gets the default region.
  // An empty entry means they deliberately cleared their selection, which is
  // honoured so Clear does not silently undo itself on the next visit.
  if (raw === null) return DEFAULT_CITIES;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.every((v) => typeof v === "string")) {
      return parsed.length > 0 ? (parsed as string[]) : NO_CITIES;
    }
  } catch {
    // Corrupt entry falls back to the default region.
  }
  return DEFAULT_CITIES;
}

export function subscribeToCities(onChange: () => void): () => void {
  listeners.add(onChange);
  // Keep tabs in step when the contractor switches region in another one.
  window.addEventListener("storage", onChange);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onChange);
  };
}

export function getCitiesSnapshot(): string[] {
  const raw = readRaw();
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cachedValue = parse(raw);
  }
  return cachedValue;
}

/** The server has no storage, so it always renders the default region. */
export function getCitiesServerSnapshot(): string[] {
  return DEFAULT_CITIES;
}

export function setCities(cities: string[]): void {
  cachedRaw = JSON.stringify(cities);
  cachedValue = cities;
  try {
    window.localStorage.setItem(STORAGE_KEY, cachedRaw);
  } catch {
    // Storage denied (private mode); the choice still applies this session.
  }
  for (const listener of listeners) listener();
}
