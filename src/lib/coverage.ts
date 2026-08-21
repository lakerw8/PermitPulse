/* Hallmark · genre: modern-minimal · module: coverage · design-system: design.md · designed-as-app */

/**
 * Coverage figures for customer-facing copy.
 *
 * These are derived from the city and trade lists rather than written by hand,
 * so adding adapters to `METROS` updates every page that quotes coverage. The
 * pricing page previously said "50+ metros" long after coverage passed 200,
 * which is the failure mode this module exists to prevent.
 *
 * Import the labels below instead of typing a number into copy.
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

/** "240+ cities" */
export const CITY_COUNT_LABEL = `${coverageFloor(CITY_COUNT)}+ cities`;

/** "240+" for use beside a separate "cities" noun. */
export const CITY_COUNT_SHORT = `${coverageFloor(CITY_COUNT)}+`;

/**
 * "60+ metro markets". Counts every market in the picker, both the multi-city
 * metros and the standalone cities, since each is one place a contractor works.
 */
export const MARKET_COUNT_LABEL = `${coverageFloor(REGION_COUNT)}+ metro markets`;

/** "10 trade categories" */
export const TRADE_COUNT_LABEL = `${TRADE_COUNT} trade categories`;
