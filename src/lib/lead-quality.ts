/* Hallmark · genre: modern-minimal · module: lead-quality · design-system: design.md · designed-as-app */

/**
 * Detects contact and value data that is technically present and practically
 * worthless.
 *
 * Written after finding that one market — Peoria, AZ — carried a phone number
 * on 100% of its permits, marked "High confidence", which was the city's own
 * permit desk: a single line shared by 105 different companies. A subcontractor
 * paying for that market would have called 200 leads and reached the city
 * switchboard every time. Nothing in the pipeline noticed, because the field
 * was populated and populated fields were assumed good.
 *
 * The rules here are deliberately shape-based rather than a list of known-bad
 * numbers. The next source to publish a permit-desk line will be caught the
 * same way, without anyone having to notice it first.
 */

import type { Permit } from "./types";

/**
 * A contact shared by more than this many distinct companies is an office or
 * permit-desk line, not a contractor's.
 *
 * Checked against the whole cache: at every threshold from 2 to 6 this splits
 * the data identically — it catches the shared municipal line and leaves every
 * genuine repeat untouched, because a real GC pulling forty permits appears
 * under one company name. Two is used as the most conservative value that
 * still sits well clear of the noise.
 */
export const MAX_COMPANIES_PER_CONTACT = 2;

/**
 * Above this share of identical non-zero values, a source is publishing a
 * placeholder rather than a measured project cost.
 */
export const CONSTANT_VALUE_SHARE = 0.8;

/**
 * Digits only, ten of them, so formatting differences do not hide a match.
 *
 * Read from the front, not the back. Real records carry trailing text that
 * contains digits — "623-773-7225 Option1", "x204" — and taking the last ten
 * digits of those shifts the whole number by one, so two records holding the
 * same line stop matching each other.
 */
export function normalizePhone(phone: string | null | undefined): string | null {
  const digits = (phone ?? "").replace(/\D/g, "");
  if (digits.length < 10) return null;
  const body =
    digits.length > 10 && digits.startsWith("1") ? digits.slice(1) : digits;
  return body.slice(0, 10);
}

function normalizeEmail(email: string | null | undefined): string | null {
  const trimmed = (email ?? "").trim().toLowerCase();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeCompany(name: string | null | undefined): string {
  return (name ?? "").trim().toLowerCase();
}

export interface SharedContact {
  value: string;
  kind: "phone" | "email";
  companies: number;
}

/**
 * Contacts attached to too many distinct companies to be any of them.
 *
 * "Unknown Contractor" is excluded from the company count: it is a placeholder
 * rather than a name, so counting it would make any source with missing
 * contractors look like it shared a line.
 */
export function findSharedContacts(permits: Permit[]): SharedContact[] {
  const phones = new Map<string, Set<string>>();
  const emails = new Map<string, Set<string>>();

  for (const permit of permits) {
    const company = normalizeCompany(permit.gcContact.companyName);
    if (!company || company === "unknown contractor") continue;

    const phone = normalizePhone(permit.gcContact.phone);
    if (phone) {
      if (!phones.has(phone)) phones.set(phone, new Set());
      phones.get(phone)!.add(company);
    }

    const email = normalizeEmail(permit.gcContact.email);
    if (email) {
      if (!emails.has(email)) emails.set(email, new Set());
      emails.get(email)!.add(company);
    }
  }

  const shared: SharedContact[] = [];
  for (const [value, companies] of phones) {
    if (companies.size > MAX_COMPANIES_PER_CONTACT) {
      shared.push({ value, kind: "phone", companies: companies.size });
    }
  }
  for (const [value, companies] of emails) {
    if (companies.size > MAX_COMPANIES_PER_CONTACT) {
      shared.push({ value, kind: "email", companies: companies.size });
    }
  }

  return shared.sort((a, b) => b.companies - a.companies);
}

export interface SuppressionResult {
  permits: Permit[];
  suppressedPhones: number;
  suppressedEmails: number;
  sharedContacts: SharedContact[];
}

/**
 * Removes shared contacts before the permits are stored.
 *
 * The permit keeps its company name and everything else — only the misleading
 * contact goes. Confidence drops to Low, because a record whose only contact
 * was a switchboard is no better evidenced than one with no contact at all.
 */
export function suppressSharedContacts(permits: Permit[]): SuppressionResult {
  const shared = findSharedContacts(permits);
  if (shared.length === 0) {
    return {
      permits,
      suppressedPhones: 0,
      suppressedEmails: 0,
      sharedContacts: [],
    };
  }

  const badPhones = new Set(
    shared.filter((s) => s.kind === "phone").map((s) => s.value)
  );
  const badEmails = new Set(
    shared.filter((s) => s.kind === "email").map((s) => s.value)
  );

  let suppressedPhones = 0;
  let suppressedEmails = 0;

  const cleaned = permits.map((permit) => {
    const phone = normalizePhone(permit.gcContact.phone);
    const email = normalizeEmail(permit.gcContact.email);
    const dropPhone = phone !== null && badPhones.has(phone);
    const dropEmail = email !== null && badEmails.has(email);

    if (!dropPhone && !dropEmail) return permit;

    if (dropPhone) suppressedPhones++;
    if (dropEmail) suppressedEmails++;

    return {
      ...permit,
      gcContact: {
        ...permit.gcContact,
        phone: dropPhone ? null : permit.gcContact.phone,
        email: dropEmail ? null : permit.gcContact.email,
        confidence: "Low" as const,
      },
    };
  });

  return {
    permits: cleaned,
    suppressedPhones,
    suppressedEmails,
    sharedContacts: shared,
  };
}

/**
 * The share of permits carrying the single most common non-zero project value.
 *
 * Twenty of the adapters write a fixed number — thirteen of them exactly
 * $100,000 — where the source publishes no cost. That value is then filtered
 * and sorted on as though it were measured.
 */
export function constantValueShare(permits: Permit[]): {
  share: number;
  value: number | null;
} {
  const values = permits
    .map((p) => p.estimatedValue)
    .filter((v) => typeof v === "number" && v > 0);

  if (values.length === 0) return { share: 0, value: null };

  const counts = new Map<number, number>();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);

  let top = 0;
  let topValue: number | null = null;
  for (const [value, count] of counts) {
    if (count > top) {
      top = count;
      topValue = value;
    }
  }

  return { share: top / values.length, value: topValue };
}

export interface MarketQuality {
  market: string;
  permits: number;
  namedGcRate: number;
  phoneRate: number;
  emailRate: number;
  /** Permits with at least one usable contact method. */
  reachableRate: number;
  /** Distinct phone numbers over permits carrying a phone. Low means shared. */
  phoneDistinctness: number;
  sharedContacts: SharedContact[];
  syntheticValueShare: number;
  syntheticValue: number | null;
}

export function assessMarketQuality(
  market: string,
  permits: Permit[]
): MarketQuality {
  const total = permits.length;
  const safe = (n: number) => (total === 0 ? 0 : n / total);

  const named = permits.filter(
    (p) => normalizeCompany(p.gcContact.companyName) !== "unknown contractor" &&
      normalizeCompany(p.gcContact.companyName) !== ""
  ).length;

  const withPhone = permits.filter((p) => normalizePhone(p.gcContact.phone)).length;
  const withEmail = permits.filter((p) => normalizeEmail(p.gcContact.email)).length;
  const reachable = permits.filter(
    (p) => normalizePhone(p.gcContact.phone) || normalizeEmail(p.gcContact.email)
  ).length;

  const phones = new Set(
    permits.map((p) => normalizePhone(p.gcContact.phone)).filter(Boolean)
  );

  const constant = constantValueShare(permits);

  return {
    market,
    permits: total,
    namedGcRate: safe(named),
    phoneRate: safe(withPhone),
    emailRate: safe(withEmail),
    reachableRate: safe(reachable),
    phoneDistinctness: withPhone === 0 ? 0 : phones.size / withPhone,
    sharedContacts: findSharedContacts(permits),
    syntheticValueShare: constant.share,
    syntheticValue: constant.value,
  };
}

export interface GateThresholds {
  minPermits: number;
  minNamedGcRate: number;
  minReachableRate: number;
  minPhoneDistinctness: number;
  maxSyntheticValueShare: number;
}

/**
 * Starting thresholds.
 *
 * The handoff proposes 80% named GC and 60% with a verified contact method.
 * Those are the destination, not a description of anything we have — the best
 * market currently reaches 82%, and most reach zero. They are written here so
 * a market's distance from launchable is a number rather than an opinion.
 */
export const DEFAULT_GATE: GateThresholds = {
  minPermits: 50,
  minNamedGcRate: 0.8,
  minReachableRate: 0.6,
  // Below this, one number is standing in for many companies.
  minPhoneDistinctness: 0.25,
  maxSyntheticValueShare: 0.5,
};

export interface GateResult {
  market: string;
  passes: boolean;
  failures: string[];
}

export function evaluateGate(
  quality: MarketQuality,
  thresholds: GateThresholds = DEFAULT_GATE
): GateResult {
  const failures: string[] = [];
  const pct = (n: number) => `${Math.round(n * 100)}%`;

  if (quality.permits < thresholds.minPermits) {
    failures.push(
      `only ${quality.permits} permits cached (needs ${thresholds.minPermits})`
    );
  }
  if (quality.namedGcRate < thresholds.minNamedGcRate) {
    failures.push(
      `${pct(quality.namedGcRate)} name a contractor (needs ${pct(thresholds.minNamedGcRate)})`
    );
  }
  if (quality.reachableRate < thresholds.minReachableRate) {
    failures.push(
      `${pct(quality.reachableRate)} have a contact method (needs ${pct(thresholds.minReachableRate)})`
    );
  }
  if (
    quality.phoneRate > 0 &&
    quality.phoneDistinctness < thresholds.minPhoneDistinctness
  ) {
    failures.push(
      `phone numbers are ${pct(quality.phoneDistinctness)} distinct — one line is standing in for many companies`
    );
  }
  if (quality.sharedContacts.length > 0) {
    const worst = quality.sharedContacts[0];
    failures.push(
      `a ${worst.kind} is shared by ${worst.companies} different companies`
    );
  }
  if (quality.syntheticValueShare > thresholds.maxSyntheticValueShare) {
    failures.push(
      `${pct(quality.syntheticValueShare)} of permits report the same project value (${quality.syntheticValue}) — the source publishes no cost`
    );
  }

  return { market: quality.market, passes: failures.length === 0, failures };
}
