/* Hallmark · genre: modern-minimal · module: coverage-registry · design-system: design.md · designed-as-app */

/**
 * The one place that says which source serves a selectable city.
 *
 * Before this existed, selection and fetching agreed only by coincidence: the
 * picker emitted city ids, `fetchLivePermits` looked those ids up in
 * `METRO_ADAPTERS`, and a city with no matching key returned an empty list
 * that was indistinguishable from a quiet market. 130 of 328 selectable cities
 * are in exactly that position.
 *
 * Two rules this module exists to enforce:
 *
 *  1. **Coverage is declared, never inferred.** A city is covered because an
 *     adapter is mapped to it here, not because it sits inside a region whose
 *     other members are covered, and not because a nearby county has a source.
 *  2. **Every adapter is reachable or explicitly excluded.** An adapter that
 *     no selection can reach is a bug — its data is paid for and unreachable —
 *     unless it appears in `EXCLUDED_ADAPTERS` with a reason.
 */

import { METROS } from "./types";
import { METRO_ADAPTERS } from "./permit-adapters";

/**
 * How a city relates to the data we hold.
 *
 * `operational` and `preview` are decided at runtime from measured health, not
 * declared here — see `coverage-status.ts`. Only `unsupported` is structural:
 * there is no source, so no amount of successful refreshing will help.
 */
export type CoverageState = "operational" | "preview" | "unsupported";

export interface CoverageEntry {
  /** A `METROS` id, i.e. something the picker can emit. */
  cityId: string;
  label: string;
  /** `METRO_ADAPTERS` keys serving this city. Empty means no source. */
  adapterKeys: string[];
}

/**
 * Adapters deliberately not reachable from the picker.
 *
 * Both are county-wide sources for areas whose individual cities already have
 * their own adapters in the picker (Rockville, Silver Spring, Bethesda and
 * Gaithersburg are all Montgomery County). Adding the counties as selectable
 * markets would return the same building twice under two permit ids, so they
 * stay out until the project-clustering work can merge them.
 *
 * They still refresh and are still health-checked; they are simply not sold.
 */
export const EXCLUDED_ADAPTERS: Record<string, string> = {
  "montgomery-county":
    "County-wide source overlapping the Rockville, Silver Spring, Bethesda and Gaithersburg adapters; would duplicate permits.",
  "prince-georges":
    "County-wide source with no city-level breakdown; would duplicate permits against neighbouring DC-area adapters.",
};

/**
 * The registry.
 *
 * Built by exact id match: a city is served by the adapter registered under
 * its own id, and by nothing else. Aggregate sources that cover several cities
 * would be added here as explicit extra entries — deliberately, one at a time,
 * with someone confirming the source really does carry that city.
 */
export const COVERAGE_REGISTRY: CoverageEntry[] = METROS.map((metro) => ({
  cityId: metro.id,
  label: metro.label,
  adapterKeys: METRO_ADAPTERS[metro.id] ? [metro.id] : [],
}));

const BY_CITY = new Map(COVERAGE_REGISTRY.map((entry) => [entry.cityId, entry]));

export function coverageFor(cityId: string): CoverageEntry | undefined {
  return BY_CITY.get(cityId);
}

/** True when a city has at least one source configured. */
export function isSupported(cityId: string): boolean {
  return (BY_CITY.get(cityId)?.adapterKeys.length ?? 0) > 0;
}

export interface Resolution {
  /** Adapter keys to query, deduplicated. */
  adapterKeys: string[];
  /** Selected cities that have a source. */
  supported: string[];
  /** Selected cities with no source. These return nothing, by construction. */
  unsupported: string[];
  /** Ids that are not in the registry at all — a stale link or a bad request. */
  unknown: string[];
}

/**
 * Turns a selection into the set of sources to query.
 *
 * The caller needs `unsupported` as much as `adapterKeys`: a request for three
 * cities where two have no source must not report "no permits found", which
 * is what the product did before.
 */
export function resolveSelection(cityIds: string[]): Resolution {
  const adapterKeys = new Set<string>();
  const supported: string[] = [];
  const unsupported: string[] = [];
  const unknown: string[] = [];

  for (const cityId of cityIds) {
    const entry = BY_CITY.get(cityId);
    if (!entry) {
      unknown.push(cityId);
      continue;
    }
    if (entry.adapterKeys.length === 0) {
      unsupported.push(cityId);
      continue;
    }
    supported.push(cityId);
    for (const key of entry.adapterKeys) adapterKeys.add(key);
  }

  return { adapterKeys: [...adapterKeys], supported, unsupported, unknown };
}

/** Every adapter key the registry can reach. */
export function reachableAdapterKeys(): Set<string> {
  const keys = new Set<string>();
  for (const entry of COVERAGE_REGISTRY) {
    for (const key of entry.adapterKeys) keys.add(key);
  }
  return keys;
}

/** Cities with a source configured, whatever its health. */
export const SUPPORTED_CITY_COUNT = COVERAGE_REGISTRY.filter(
  (e) => e.adapterKeys.length > 0
).length;
