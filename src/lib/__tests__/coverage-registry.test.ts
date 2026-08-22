import { describe, expect, it } from "vitest";
import {
  COVERAGE_REGISTRY,
  EXCLUDED_ADAPTERS,
  reachableAdapterKeys,
  resolveSelection,
  SUPPORTED_CITY_COUNT,
} from "../coverage-registry";
import { METRO_ADAPTERS } from "../permit-adapters";
import { METROS } from "../types";
import { REGIONS } from "../regions";
import { adapterKey } from "../source-health";

/**
 * Structural guards on coverage.
 *
 * These are the checks that would have caught the state the product shipped
 * in: 130 selectable cities with no source behind them, and two adapters whose
 * data no selection could reach. They are cheap and they run on every commit,
 * which is the point — coverage drift is invisible until a customer selects a
 * city and is told there are no permits.
 */

describe("registry structure", () => {
  it("has exactly one entry per selectable city", () => {
    expect(COVERAGE_REGISTRY).toHaveLength(METROS.length);
    const ids = COVERAGE_REGISTRY.map((e) => e.cityId);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("contains no city that the picker cannot emit", () => {
    const selectable = new Set(METROS.map((m) => m.id));
    const strays = COVERAGE_REGISTRY.filter((e) => !selectable.has(e.cityId));
    expect(strays).toEqual([]);
  });

  it("maps every declared adapter key to a real adapter", () => {
    const dangling = COVERAGE_REGISTRY.flatMap((e) =>
      e.adapterKeys.filter((k) => !METRO_ADAPTERS[k])
    );
    expect(dangling).toEqual([]);
  });
});

describe("regions and the registry agree", () => {
  it("references no city the registry does not know", () => {
    const known = new Set(COVERAGE_REGISTRY.map((e) => e.cityId));
    const unknown = REGIONS.flatMap((r) =>
      r.cityIds.filter((id) => !known.has(id))
    );
    expect(unknown).toEqual([]);
  });

  it("places every city in exactly one region", () => {
    const seen = new Map<string, number>();
    for (const region of REGIONS) {
      for (const id of region.cityIds) {
        seen.set(id, (seen.get(id) ?? 0) + 1);
      }
    }
    const duplicated = [...seen].filter(([, count]) => count > 1);
    expect(duplicated).toEqual([]);

    const orphaned = COVERAGE_REGISTRY.filter((e) => !seen.has(e.cityId));
    expect(orphaned.map((e) => e.cityId)).toEqual([]);
  });
});

describe("every adapter is reachable or explicitly excluded", () => {
  it("leaves no adapter stranded", () => {
    // An unreachable adapter is refreshed, stored, and never served — the two
    // in EXCLUDED_ADAPTERS are that on purpose and say why.
    const reachable = reachableAdapterKeys();
    const stranded = Object.keys(METRO_ADAPTERS).filter(
      (key) => !reachable.has(key) && !(key in EXCLUDED_ADAPTERS)
    );
    expect(stranded).toEqual([]);
  });

  it("requires a written reason for each exclusion", () => {
    for (const [key, reason] of Object.entries(EXCLUDED_ADAPTERS)) {
      expect(METRO_ADAPTERS[key], `${key} is excluded but does not exist`).toBeDefined();
      expect(reason.length).toBeGreaterThan(30);
    }
  });

  it("does not exclude an adapter that the picker can still reach", () => {
    const reachable = reachableAdapterKeys();
    const contradictory = Object.keys(EXCLUDED_ADAPTERS).filter((k) =>
      reachable.has(k)
    );
    expect(contradictory).toEqual([]);
  });
});

describe("adapter identity", () => {
  it("gives every configured source a unique key", () => {
    // Health history is stored per adapter key. A collision would merge two
    // sources' failure counts and hide one of them.
    const keys = Object.entries(METRO_ADAPTERS).flatMap(([metro, adapters]) =>
      adapters.map((a) => adapterKey(metro, a.domain))
    );
    const duplicates = keys.filter((k, i) => keys.indexOf(k) !== i);
    expect(duplicates).toEqual([]);
  });
});

describe("resolveSelection", () => {
  const supportedCity = METROS.find((m) => METRO_ADAPTERS[m.id])!.id;
  const unsupportedCity = METROS.find((m) => !METRO_ADAPTERS[m.id])?.id;

  it("resolves a supported city to its adapter", () => {
    const result = resolveSelection([supportedCity]);
    expect(result.adapterKeys).toEqual([supportedCity]);
    expect(result.supported).toEqual([supportedCity]);
    expect(result.unsupported).toEqual([]);
  });

  it("reports an unsupported city instead of silently dropping it", () => {
    // This is the behaviour the product lacked: selecting Alexandria, VA
    // produced an empty permit list that looked like a quiet market.
    if (!unsupportedCity) return;
    const result = resolveSelection([unsupportedCity]);
    expect(result.adapterKeys).toEqual([]);
    expect(result.unsupported).toEqual([unsupportedCity]);
  });

  it("separates supported from unsupported in a mixed selection", () => {
    if (!unsupportedCity) return;
    const result = resolveSelection([supportedCity, unsupportedCity]);
    expect(result.supported).toEqual([supportedCity]);
    expect(result.unsupported).toEqual([unsupportedCity]);
    expect(result.adapterKeys).toEqual([supportedCity]);
  });

  it("flags an id that is not in the registry at all", () => {
    const result = resolveSelection(["atlantis"]);
    expect(result.unknown).toEqual(["atlantis"]);
    expect(result.adapterKeys).toEqual([]);
  });

  it("queries each source once when a region selects overlapping cities", () => {
    const result = resolveSelection([supportedCity, supportedCity]);
    expect(result.adapterKeys).toEqual([supportedCity]);
  });

  it("resolves an empty selection to nothing", () => {
    const result = resolveSelection([]);
    expect(result).toEqual({
      adapterKeys: [],
      supported: [],
      unsupported: [],
      unknown: [],
    });
  });
});

describe("advertised coverage", () => {
  it("counts only cities with a source behind them", () => {
    expect(SUPPORTED_CITY_COUNT).toBeLessThanOrEqual(METROS.length);
    expect(SUPPORTED_CITY_COUNT).toBe(
      METROS.filter((m) => METRO_ADAPTERS[m.id]).length
    );
  });

  it("never counts a city the registry left unsupported", () => {
    const supported = COVERAGE_REGISTRY.filter((e) => e.adapterKeys.length > 0);
    expect(supported).toHaveLength(SUPPORTED_CITY_COUNT);
  });
});
