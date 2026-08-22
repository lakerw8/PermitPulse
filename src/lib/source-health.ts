/* Hallmark · genre: modern-minimal · module: source-health · design-system: design.md · designed-as-app */

/**
 * What happened when we asked a municipal source for permits.
 *
 * The old `fetchAdapter` returned `[]` for every failure — a 500, a 429, a
 * timeout, a schema change, and a genuinely empty market were all the same
 * value. That is what let the refresh log record 200 successes and zero
 * failures while a third of sources returned nothing.
 *
 * Nothing here decides policy. It is the vocabulary the refresh route and the
 * permits API both use to describe a run.
 */

import type { Permit } from "./types";
import type { LifecycleStage } from "./lifecycle";

export type SourceOutcome =
  /** Records came back and at least one became a permit. */
  | "success"
  /** The source answered normally and had nothing for this window. */
  | "success_with_zero_records"
  /** Non-2xx, network failure, or timeout. */
  | "upstream_error"
  /** Answered, but the body was not the shape we can read. */
  | "parse_error"
  /** Parsed, but no record survived normalization — usually a schema change. */
  | "normalization_error"
  /** We read the source fine and failed to store the result. */
  | "database_error";

export const FAILURE_OUTCOMES: readonly SourceOutcome[] = [
  "upstream_error",
  "parse_error",
  "normalization_error",
  "database_error",
];

export function isFailure(outcome: SourceOutcome): boolean {
  return FAILURE_OUTCOMES.includes(outcome);
}

/**
 * Why a raw record did not become a permit.
 *
 * Counted rather than logged individually: the useful signal is "this source
 * started rejecting 90% of its records", not any single row.
 */
export type RejectionReason =
  | "residential"
  | "missing_required_field"
  | "invalid_date"
  | "invalid_value"
  | "adapter_returned_null";

export interface ContactCompleteness {
  withCompany: number;
  withPhone: number;
  withEmail: number;
}

export interface AdapterResult {
  /** "<metro key>#<domain>" — see `adapterKey`. */
  adapterKey: string;
  metro: string;
  city: string;
  state: string;
  domain: string;

  outcome: SourceOutcome;
  httpStatus: number | null;
  /** "AbortError", "TypeError", "HttpError", … — the class, not the text. */
  errorClass: string | null;
  errorMessage: string | null;
  durationMs: number;

  rawRecordCount: number;
  acceptedCount: number;
  rejectedCount: number;
  rejectionReasons: Partial<Record<RejectionReason, number>>;

  contacts: ContactCompleteness;

  /** Contacts removed because they belonged to many companies at once. */
  suppressedPhones: number;
  suppressedEmails: number;
  sharedContacts: { value: string; kind: "phone" | "email"; companies: number }[];

  /** What the source said about each permit's stage, before normalization. */
  observations: SourceObservation[];

  /** The query window, so a suspicious zero can be reproduced exactly. */
  windowDays: number;
  windowStart: string;

  permits: Permit[];
}

/**
 * A source's stable identity.
 *
 * Deliberately not the array index: reordering `METRO_ADAPTERS` would silently
 * re-key every health row and reset its failure history. Only one metro
 * configures multiple adapters today and those differ by host, so metro plus
 * domain is unique — `coverage-registry.test.ts` asserts it stays that way.
 */
export function adapterKey(metro: string, domain: string): string {
  return `${metro}#${domain}`;
}

/** Counts how many permits carry each contact field. */
export function measureContacts(permits: Permit[]): ContactCompleteness {
  let withCompany = 0;
  let withPhone = 0;
  let withEmail = 0;

  for (const permit of permits) {
    const contact = permit.gcContact;
    if (contact.companyName && contact.companyName !== "Unknown Contractor") {
      withCompany++;
    }
    if (contact.phone) withPhone++;
    if (contact.email) withEmail++;
  }

  return { withCompany, withPhone, withEmail };
}

/**
 * Classifies a thrown value into an outcome and an error class.
 *
 * `AbortError` is a timeout rather than a bug on our side, so it is reported
 * as an upstream problem — the source did not answer in time.
 */
export function classifyError(err: unknown): {
  outcome: SourceOutcome;
  errorClass: string;
  errorMessage: string;
} {
  if (err instanceof HttpError) {
    return {
      outcome: "upstream_error",
      errorClass: "HttpError",
      errorMessage: `HTTP ${err.status}`,
    };
  }

  if (err instanceof SyntaxError) {
    return {
      outcome: "parse_error",
      errorClass: "SyntaxError",
      errorMessage: truncate(err.message),
    };
  }

  if (err instanceof Error) {
    const isTimeout = err.name === "AbortError" || err.name === "TimeoutError";
    return {
      outcome: "upstream_error",
      errorClass: isTimeout ? "TimeoutError" : err.name || "Error",
      errorMessage: truncate(err.message),
    };
  }

  return {
    outcome: "upstream_error",
    errorClass: "Unknown",
    errorMessage: truncate(String(err)),
  };
}

export class HttpError extends Error {
  constructor(readonly status: number) {
    super(`HTTP ${status}`);
    this.name = "HttpError";
  }
}

/**
 * Error text is stored and shown to operators, and municipal URLs can carry
 * app tokens in query parameters. Cap the length and never store a full URL.
 */
function truncate(message: string, max = 300): string {
  const withoutUrls = message.replace(/https?:\/\/\S+/g, "[url]");
  return withoutUrls.length > max
    ? `${withoutUrls.slice(0, max)}…`
    : withoutUrls;
}

/**
 * A single permit as the source described it on this run.
 *
 * Separate from `Permit` because it is provenance rather than product data:
 * it records what the city published and how we read it, so a disagreement
 * can be traced without re-fetching.
 */
export interface SourceObservation {
  permitId: string;
  /** Verbatim from the source, or null when it published no status. */
  sourceStatus: string | null;
  stage: LifecycleStage;
  /** False when the status was present but unrecognised. */
  matched: boolean;
  /** True when the stage came from our query rather than the record. */
  stageInferredFromQuery: boolean;
  /** Held only for unreadable records, so debugging has something to read. */
  rawRecord: Record<string, unknown> | null;
}
