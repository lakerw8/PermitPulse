/* Hallmark · genre: modern-minimal · module: coverage · design-system: design.md · designed-as-app */

/**
 * What the picker *lists*.
 *
 * These are counts of configured entries, not of markets returning data. They
 * are the right number for "how many places can I select" and the wrong number
 * for "how many places do you cover" — as of writing, 328 cities are listed
 * while 145 sources actually return permits.
 *
 * For any claim about coverage, use `coverage-status.ts`, which measures
 * `refresh_log`. This module deliberately no longer exports a "cities covered"
 * label, because there was no way to use one honestly.
 */

import { METROS, TRADES } from "./types";
import { REGIONS, MULTI_CITY_REGIONS } from "./regions";

export const CITY_COUNT = METROS.length;
export const REGION_COUNT = REGIONS.length;
export const METRO_MARKET_COUNT = MULTI_CITY_REGIONS.length;
export const TRADE_COUNT = TRADES.length;

/**
 * Rounds down to the nearest ten so a "+" claim is always true. 241 cities
 * advertises as "240+", never "250+".
 */
export function coverageFloor(value: number): number {
  return Math.floor(value / 10) * 10;
}

/** "240+ cities in the picker". Selectable entries, not verified coverage. */
export const CITY_LISTED_LABEL = `${coverageFloor(CITY_COUNT)}+ cities`;

/**
 * "60+ metro markets". Counts every market in the picker, both the multi-city
 * metros and the standalone cities, since each is one place a contractor works.
 */
export const MARKET_COUNT_LABEL = `${coverageFloor(REGION_COUNT)}+ metro markets`;

/** "10 trade categories" */
export const TRADE_COUNT_LABEL = `${TRADE_COUNT} trade categories`;
