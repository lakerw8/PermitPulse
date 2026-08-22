/* Hallmark · genre: modern-minimal · module: lifecycle · design-system: design.md · designed-as-app */

/**
 * A permit's stage, and what the source actually said.
 *
 * This replaces a normalization that did not just lose meaning, it inverted
 * it. The previous `mapStatus` sent `denied`, `rejected` and `revoked` to
 * "Under Review" — a refused permit was presented to subcontractors as an
 * active project worth chasing — sent `expired`, `cancelled` and `withdrawn`
 * to "Completed", and defaulted every unrecognised or missing value to
 * "Issued", the strongest go-signal the product has.
 *
 * Two rules here:
 *
 *  1. **A stage never invents optimism.** Anything unrecognised is `unknown`,
 *     which carries no opportunity signal at all. Silence is not a green light.
 *  2. **The source's own words are preserved** alongside the normalized stage,
 *     so a disagreement can always be traced back to what the city published.
 */

import type { PermitStatus } from "./types";

/** Bump when the mapping below changes, so stored rows stay attributable. */
export const LIFECYCLE_RULE_VERSION = 1;

export type LifecycleStage =
  | "filed"
  | "under_review"
  | "approved"
  | "issued"
  | "completed"
  | "rejected"
  | "withdrawn"
  | "revoked"
  | "expired"
  | "canceled"
  | "unknown";

/**
 * What a stage is worth to a subcontractor.
 *
 * `early` is filed or under review: more time to build a relationship, less
 * certainty the job happens. `go` is approved or issued: the work is likely to
 * proceed. `closed` is over, one way or another. `none` means we do not know,
 * and must not pretend otherwise.
 */
export type OpportunitySignal = "early" | "go" | "closed" | "none";

const SIGNALS: Record<LifecycleStage, OpportunitySignal> = {
  filed: "early",
  under_review: "early",
  approved: "go",
  issued: "go",
  completed: "closed",
  rejected: "closed",
  withdrawn: "closed",
  revoked: "closed",
  expired: "closed",
  canceled: "closed",
  unknown: "none",
};

export function signalFor(stage: LifecycleStage): OpportunitySignal {
  return SIGNALS[stage];
}

/**
 * Stages that end a permit's life. Reaching one is not a defect; leaving one
 * is, and gets recorded as an invalid transition rather than smoothed over.
 */
export const TERMINAL_STAGES: LifecycleStage[] = [
  "completed",
  "rejected",
  "withdrawn",
  "revoked",
  "expired",
  "canceled",
];

/**
 * Matched in order. Negative outcomes are tested first: a source that writes
 * "Issued - Revoked" describes a revoked permit, and checking "issue" first
 * would call it live.
 */
const STAGE_PATTERNS: { stage: LifecycleStage; tokens: string[] }[] = [
  { stage: "revoked", tokens: ["revok"] },
  { stage: "rejected", tokens: ["reject", "denied", "denial", "refused", "disapprov"] },
  { stage: "withdrawn", tokens: ["withdraw"] },
  { stage: "expired", tokens: ["expire", "lapsed"] },
  { stage: "canceled", tokens: ["cancel", "void", "abandon"] },
  { stage: "completed", tokens: ["complete", "finaled", "final inspection", "certificate of occupancy", "closed"] },
  // Approved is tested before issued: "Ready to Issue" contains "issue", and
  // reading it as issued would promote a permit that has not been granted yet.
  // Where the two words appear together the earlier stage wins, because
  // understating a permit's progress costs a lead and overstating it costs a
  // wasted call.
  { stage: "approved", tokens: ["ready to issue", "approve"] },
  { stage: "issued", tokens: ["issue", "active", "in progress", "permitted"] },
  { stage: "under_review", tokens: ["review", "pending", "plan check", "in process", "processing", "routing", "hold"] },
  { stage: "filed", tokens: ["filed", "submitted", "application", "received", "intake", "applied"] },
];

export interface StageClassification {
  stage: LifecycleStage;
  /** False when nothing matched — the value is preserved but not interpreted. */
  matched: boolean;
  /** Exactly what the source said, trimmed. Never discarded. */
  sourceStatus: string | null;
}

export function classifyStage(
  sourceStatus: string | null | undefined
): StageClassification {
  const raw = (sourceStatus ?? "").trim();
  if (raw.length === 0) {
    return { stage: "unknown", matched: false, sourceStatus: null };
  }

  const haystack = raw.toLowerCase();
  for (const { stage, tokens } of STAGE_PATTERNS) {
    if (tokens.some((token) => haystack.includes(token))) {
      return { stage, matched: true, sourceStatus: raw };
    }
  }

  return { stage: "unknown", matched: false, sourceStatus: raw };
}

/**
 * Which record fields might hold the status.
 *
 * Derived from the field names the adapters actually read, so recovering the
 * source-native value needs no change to 107 call sites. Normalization strips
 * punctuation, so `B1_APPL_ST`, `APP STATUS` and `statuscurrent` all match.
 */
export function isStatusKey(key: string): boolean {
  const normalized = key.toLowerCase().replace(/[^a-z0-9]/g, "");
  return (
    normalized.includes("status") ||
    normalized.includes("stage") ||
    normalized === "stat" ||
    normalized === "permitstat" ||
    normalized === "b1applst"
  );
}

/**
 * Recovers the source-native status from a raw record.
 *
 * When several fields look like a status, the one that classifies to a real
 * stage wins; a field holding a code we cannot read should not mask a
 * neighbouring field that says "Withdrawn" in plain words.
 */
export function extractSourceStatus(
  record: Record<string, unknown>
): StageClassification {
  const candidates: string[] = [];

  for (const [key, value] of Object.entries(record)) {
    if (!isStatusKey(key)) continue;
    if (typeof value !== "string" && typeof value !== "number") continue;
    const text = String(value).trim();
    if (text.length > 0) candidates.push(text);
  }

  for (const candidate of candidates) {
    const classified = classifyStage(candidate);
    if (classified.matched) return classified;
  }

  return candidates.length > 0
    ? { stage: "unknown", matched: false, sourceStatus: candidates[0] }
    : { stage: "unknown", matched: false, sourceStatus: null };
}

/**
 * Legal progressions.
 *
 * ```text
 * filed -> under_review -> approved -> issued -> completed
 *    \          \             \          \
 *     rejected   withdrawn      revoked    expired/canceled
 * ```
 *
 * Anything else is recorded as an invalid transition rather than coerced.
 * Sources do backdate and correct themselves, and a permit that moves from
 * `issued` back to `under_review` is information, not noise to suppress.
 */
const ALLOWED: Record<LifecycleStage, LifecycleStage[]> = {
  filed: ["under_review", "approved", "issued", "rejected", "withdrawn", "canceled", "expired"],
  under_review: ["approved", "issued", "rejected", "withdrawn", "canceled", "expired"],
  approved: ["issued", "revoked", "expired", "canceled", "withdrawn"],
  issued: ["completed", "revoked", "expired", "canceled"],
  completed: [],
  rejected: [],
  withdrawn: [],
  revoked: [],
  expired: [],
  canceled: [],
  // An unknown stage tells us nothing, so any move away from it is legitimate.
  unknown: [
    "filed", "under_review", "approved", "issued", "completed",
    "rejected", "withdrawn", "revoked", "expired", "canceled",
  ],
};

export function isValidTransition(
  from: LifecycleStage | null,
  to: LifecycleStage
): boolean {
  // A permit seen for the first time can legitimately arrive at any stage.
  if (from === null) return true;
  if (from === to) return true;
  return ALLOWED[from].includes(to);
}

export function isTerminal(stage: LifecycleStage): boolean {
  return TERMINAL_STAGES.includes(stage);
}

/**
 * Whether this stage is one a subcontractor could act on.
 *
 * `actionable_at` is stamped the first time a permit reaches such a stage,
 * which is the question the single-row snapshot could never answer: not "what
 * is this permit now" but "when did it become worth calling about".
 */
export function isActionable(stage: LifecycleStage): boolean {
  const signal = signalFor(stage);
  return signal === "early" || signal === "go";
}

/**
 * Display label per stage.
 *
 * Typed as `PermitStatus` so the compiler enforces that every stage has a
 * display form and that the two vocabularies cannot drift apart.
 */
export const STAGE_LABELS: Record<LifecycleStage, PermitStatus> = {
  filed: "Filed",
  under_review: "Under Review",
  approved: "Approved",
  issued: "Issued",
  completed: "Completed",
  rejected: "Rejected",
  withdrawn: "Withdrawn",
  revoked: "Revoked",
  expired: "Expired",
  canceled: "Canceled",
  unknown: "Status Unknown",
};

/**
 * The stage a source's own query implies, when its records carry no status.
 *
 * Some datasets encode the status in what they select rather than in a field:
 * a query filtering `issue_date >= X` returns issued permits by construction,
 * and Chicago's does exactly that while publishing no status column. Reporting
 * those as "Status Unknown" would be less accurate than the truth we can prove
 * from the request we made.
 *
 * This is inference from our own query, never from the data, and it is only
 * consulted when the record itself says nothing. A record carrying "Void"
 * always wins over the query that fetched it.
 */
export function inferStageFromQuery(url: string): LifecycleStage | null {
  const haystack = url.toLowerCase();

  // Match a date filter, not a mere mention: an `issue_date` in the select
  // list says nothing about which rows came back.
  const filtersOn = (field: RegExp) => field.test(haystack);

  if (filtersOn(/issue[_a-z]*date\s*(>=|>|=|%3e)/)) return "issued";
  if (filtersOn(/(applied|application|filed|submit)[_a-z]*date\s*(>=|>|=|%3e)/)) {
    return "filed";
  }
  if (filtersOn(/final[_a-z]*date\s*(>=|>|=|%3e)/)) return "completed";

  return null;
}
