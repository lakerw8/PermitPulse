/* Hallmark · genre: modern-minimal · module: permit-columns · design-system: design.md · designed-as-app */

/**
 * The single description of which `permits` columns a viewer may receive, and
 * how a database row becomes a `Permit`.
 *
 * Shared by every route that reads permits — the list, the by-id lookup, and
 * the CSV export — so a new sensitive column cannot be added to the table and
 * then quietly served by whichever route was not updated.
 */

import type { ContactConfidence, Permit, PermitStatus, Trade } from "./types";
import { applyEntitlement } from "./entitlements";

/** Columns every viewer may receive. */
export const PUBLIC_COLUMNS = [
  "id",
  "permit_number",
  "address",
  "city",
  "state",
  "zip",
  "latitude",
  "longitude",
  "filing_date",
  "description",
  "estimated_value",
  "status",
  "trades",
  "gc_confidence",
  "source",
  "source_updated_at",
  // Generated booleans, not values: they let a locked viewer be told what
  // exists behind the paywall without the values ever leaving the database.
  "has_gc_company",
  "has_gc_contact_name",
  "has_gc_phone",
  "has_gc_email",
  // Lifecycle. Public: these describe the permit's progress, not its contacts.
  "source_status",
  "opportunity_signal",
  "actionable_at",
] as const;

/** Added only for an entitled viewer. This is what the paid plan sells. */
export const CONTACT_COLUMNS = [
  "gc_company_name",
  "gc_contact_name",
  "gc_phone",
  "gc_email",
] as const;

export function selectColumns(entitled: boolean): string {
  return entitled
    ? [...PUBLIC_COLUMNS, ...CONTACT_COLUMNS].join(",")
    : PUBLIC_COLUMNS.join(",");
}

/**
 * Maps a row to a `Permit`, applying the viewer's entitlement.
 *
 * The entitlement is applied here rather than at the call site so that no
 * route can serialize a row without passing through redaction.
 */
export function mapRowToPermit(
  row: Record<string, unknown>,
  entitled: boolean
): Permit {
  const permit: Permit = {
    id: row.id as string,
    permitNumber: row.permit_number as string,
    address: row.address as string,
    city: row.city as string,
    state: row.state as string,
    zip: row.zip as string,
    latitude: row.latitude as number,
    longitude: row.longitude as number,
    filingDate: row.filing_date as string,
    description: row.description as string,
    estimatedValue: Number(row.estimated_value),
    status: (row.status as PermitStatus) || "Issued",
    trades: (row.trades as Trade[]) || [],
    gcContact: {
      companyName: (row.gc_company_name as string) || "Unknown Contractor",
      contactName: (row.gc_contact_name as string) || null,
      phone: (row.gc_phone as string) || null,
      email: (row.gc_email as string) || null,
      confidence: ((row.gc_confidence as string) || "Low") as ContactConfidence,
      available: {
        companyName: row.has_gc_company === true,
        contactName: row.has_gc_contact_name === true,
        phone: row.has_gc_phone === true,
        email: row.has_gc_email === true,
      },
    },
    source: row.source as string,
    sourceUpdatedAt: (row.source_updated_at as string) || "",
    sourceStatus: (row.source_status as string) ?? null,
    opportunitySignal:
      (row.opportunity_signal as Permit["opportunitySignal"]) ?? undefined,
    actionableAt: (row.actionable_at as string) ?? null,
  };

  return applyEntitlement(permit, entitled);
}
