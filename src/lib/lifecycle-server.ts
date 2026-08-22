/* Hallmark · genre: modern-minimal · module: lifecycle-server · design-system: design.md · designed-as-app */

/**
 * Writes lifecycle state and appends stage events during a refresh.
 *
 * Runs alongside the existing `permits.status` column rather than replacing
 * it, so the two can be compared over a few refreshes before any customer
 * query moves across.
 */

import { supabaseAdmin } from "./supabase";
import {
  isActionable,
  isValidTransition,
  signalFor,
  LIFECYCLE_RULE_VERSION,
  type LifecycleStage,
} from "./lifecycle";
import type { SourceObservation } from "./source-health";

export interface LifecycleWrite {
  permitId: string;
  sourceStatus: string | null;
  stage: LifecycleStage;
  signal: ReturnType<typeof signalFor>;
  previousStage: LifecycleStage | null;
  transitionValid: boolean;
  firstSeenAt: string;
  lastSeenAt: string;
  actionableAt: string | null;
}

interface PriorState {
  lifecycle_stage: string | null;
  first_seen_at: string | null;
  actionable_at: string | null;
}

const CHUNK = 200;

/**
 * Resolves each observation against what we already knew.
 *
 * `first_seen_at` and `actionable_at` are never moved once set: they are the
 * answer to "how long has this been available", and a later refresh must not
 * make a three-week-old opportunity look new.
 */
export async function computeLifecycleWrites(
  observations: SourceObservation[],
  now: string
): Promise<LifecycleWrite[]> {
  if (observations.length === 0) return [];

  const prior = new Map<string, PriorState>();

  for (let i = 0; i < observations.length; i += CHUNK) {
    const ids = observations.slice(i, i + CHUNK).map((o) => o.permitId);
    const { data, error } = await supabaseAdmin
      .from("permits")
      .select("id, lifecycle_stage, first_seen_at, actionable_at")
      .in("id", ids);

    if (error) throw new Error(`lifecycle read failed: ${error.code}`);

    for (const row of data ?? []) {
      prior.set(row.id as string, {
        lifecycle_stage: (row.lifecycle_stage as string) ?? null,
        first_seen_at: (row.first_seen_at as string) ?? null,
        actionable_at: (row.actionable_at as string) ?? null,
      });
    }
  }

  return observations.map((observation) => {
    const previous = prior.get(observation.permitId);
    const previousStage = (previous?.lifecycle_stage as LifecycleStage) ?? null;
    const stage = observation.stage;
    const signal = signalFor(stage);

    return {
      permitId: observation.permitId,
      sourceStatus: observation.sourceStatus,
      stage,
      signal,
      previousStage,
      transitionValid: isValidTransition(previousStage, stage),
      firstSeenAt: previous?.first_seen_at ?? now,
      lastSeenAt: now,
      actionableAt:
        previous?.actionable_at ?? (isActionable(stage) ? now : null),
    };
  });
}

/**
 * Appends one event per stage a permit reaches.
 *
 * The unique constraint on (permit_id, lifecycle_stage) makes a re-read of an
 * unchanged permit a no-op, so the weekday refresh does not append a row per
 * permit per run. `ignoreDuplicates` turns that collision into a skip rather
 * than an error.
 */
export async function recordLifecycleEvents(
  metro: string,
  adapterKey: string,
  observations: SourceObservation[],
  writes: LifecycleWrite[],
  sourceUpdatedAt: Map<string, string>
): Promise<void> {
  if (writes.length === 0) return;

  const rawById = new Map(observations.map((o) => [o.permitId, o.rawRecord]));

  const rows = writes.map((write) => ({
    permit_id: write.permitId,
    metro,
    adapter_key: adapterKey,
    source_status: write.sourceStatus,
    lifecycle_stage: write.stage,
    opportunity_signal: write.signal,
    previous_stage: write.previousStage,
    transition_valid: write.transitionValid,
    source_updated_at: sourceUpdatedAt.get(write.permitId) ?? null,
    observed_at: write.lastSeenAt,
    lifecycle_rule_version: LIFECYCLE_RULE_VERSION,
    // Kept for the rows that need explaining: an unreadable status, or a move
    // that should not have been possible.
    raw_record:
      write.transitionValid && write.stage !== "unknown"
        ? null
        : (rawById.get(write.permitId) ?? null),
  }));

  for (let i = 0; i < rows.length; i += CHUNK) {
    const { error } = await supabaseAdmin
      .from("permit_events")
      .upsert(rows.slice(i, i + CHUNK), {
        onConflict: "permit_id,lifecycle_stage",
        ignoreDuplicates: true,
      });

    if (error) {
      // History is valuable but not worth failing a refresh over: the permits
      // themselves are already stored by this point.
      console.error("[lifecycle] could not record events:", error.code);
      return;
    }
  }
}

/** The lifecycle columns to merge into a permit upsert row. */
export function lifecycleColumns(write: LifecycleWrite) {
  return {
    source_status: write.sourceStatus,
    lifecycle_stage: write.stage,
    opportunity_signal: write.signal,
    first_seen_at: write.firstSeenAt,
    last_seen_at: write.lastSeenAt,
    actionable_at: write.actionableAt,
    lifecycle_rule_version: LIFECYCLE_RULE_VERSION,
  };
}
