/* Hallmark · genre: modern-minimal · module: saved-leads-server · design-system: design.md · designed-as-app */

/**
 * Reads a user's saved leads together with their permit data.
 *
 * The dashboard used to build this join in the browser against whatever page
 * `PermitsContext` happened to be holding, so a lead saved in Chicago vanished
 * as soon as the user switched region, changed a filter, paginated, or
 * reloaded. Joining on the server against the whole table is the fix: the
 * result depends only on who is asking, never on what they were browsing.
 */

import { supabaseAdmin } from "./supabase";
import { mapRowToPermit, selectColumns } from "./permit-columns";
import type { LeadStatus, Permit } from "./types";

export interface SavedLeadRecord {
  permitId: string;
  status: LeadStatus;
  notes: string;
  savedAt: string;
  updatedAt: string;
  /**
   * The permit this lead points at, or null when the cached row is gone —
   * a permit can disappear if a source stops publishing it. The lead is still
   * returned so the user keeps their notes and status rather than silently
   * losing a row they saved.
   */
  permit: Permit | null;
}

/** PostgREST caps a single `in` list; chunk so a large pipeline still works. */
const PERMIT_LOOKUP_CHUNK = 200;

export async function fetchSavedLeads(
  userId: string,
  entitled: boolean
): Promise<SavedLeadRecord[]> {
  const { data: leads, error } = await supabaseAdmin
    .from("saved_leads")
    .select("permit_id, status, notes, saved_at, updated_at")
    .eq("user_id", userId)
    .order("saved_at", { ascending: false });

  if (error) throw new Error(`saved_leads read failed: ${error.code}`);
  if (!leads || leads.length === 0) return [];

  const permitIds = leads.map((l) => l.permit_id as string);
  const permits = new Map<string, Permit>();

  for (let i = 0; i < permitIds.length; i += PERMIT_LOOKUP_CHUNK) {
    const chunk = permitIds.slice(i, i + PERMIT_LOOKUP_CHUNK);
    const { data, error: permitError } = await supabaseAdmin
      .from("permits")
      .select(selectColumns(entitled))
      .in("id", chunk);

    if (permitError) {
      throw new Error(`permits read failed: ${permitError.code}`);
    }

    for (const row of (data ?? []) as unknown as Record<string, unknown>[]) {
      const permit = mapRowToPermit(row, entitled);
      permits.set(permit.id, permit);
    }
  }

  return leads.map((lead) => ({
    permitId: lead.permit_id as string,
    status: lead.status as LeadStatus,
    notes: (lead.notes as string) ?? "",
    savedAt: lead.saved_at as string,
    updatedAt: lead.updated_at as string,
    permit: permits.get(lead.permit_id as string) ?? null,
  }));
}
