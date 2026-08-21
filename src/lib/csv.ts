/* Hallmark · genre: modern-minimal · module: csv · design-system: design.md · designed-as-app */

/**
 * CSV serialization for the saved-lead export.
 *
 * Pure and free of Supabase imports so the escaping rules can be unit tested.
 * The previous in-browser version interpolated values straight into a string,
 * so a permit description containing a comma silently shifted every later
 * column, and one containing a newline split the row in two.
 */

import type { SavedLeadRecord } from "./saved-leads-server";

export const CSV_HEADERS = [
  "Permit Number",
  "Address",
  "City",
  "State",
  "ZIP",
  "Filing Date",
  "Description",
  "Estimated Value",
  "Permit Status",
  "Trades",
  "GC Company",
  "GC Contact",
  "GC Phone",
  "GC Email",
  "Contact Confidence",
  "Lead Status",
  "Notes",
  "Saved At",
] as const;

/**
 * Quotes a single field.
 *
 * Everything is quoted rather than only the values that need it: it is one
 * rule instead of three, and it removes any chance of a delimiter slipping
 * through unescaped. A leading `=`, `+`, `-` or `@` is prefixed with a single
 * quote so a spreadsheet treats the value as text — a permit description is
 * data, not a formula for Excel to execute.
 */
export function escapeField(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '""';

  let text = String(value);
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;

  return `"${text.replace(/"/g, '""')}"`;
}

export function buildLeadsCsv(leads: SavedLeadRecord[]): string {
  const rows = leads.map((lead) => {
    const permit = lead.permit;
    const contact = permit?.gcContact;

    return [
      permit?.permitNumber ?? "",
      permit?.address ?? "",
      permit?.city ?? "",
      permit?.state ?? "",
      permit?.zip ?? "",
      permit?.filingDate ?? "",
      permit?.description ?? "",
      permit?.estimatedValue ?? "",
      permit?.status ?? "",
      permit?.trades.join("; ") ?? "",
      // A locked contact carries empty values, so a redacted export simply has
      // blank contact columns rather than a leak or a placeholder.
      contact?.companyName ?? "",
      contact?.contactName ?? "",
      contact?.phone ?? "",
      contact?.email ?? "",
      contact?.confidence ?? "",
      lead.status,
      lead.notes,
      lead.savedAt,
    ].map(escapeField);
  });

  // CRLF per RFC 4180; Excel on Windows needs it to keep rows intact.
  return [CSV_HEADERS.map(escapeField).join(","), ...rows.map((r) => r.join(","))]
    .join("\r\n");
}
