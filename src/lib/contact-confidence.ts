/* Hallmark · genre: modern-minimal · module: contact-confidence · design-system: design.md · designed-as-app */

/**
 * What the confidence label on a GC contact actually means.
 *
 * It describes **which field of the permit record the name came from** — not
 * whether anyone has confirmed the contact is reachable, current, or the right
 * person to call. Nothing in the pipeline verifies a contact today, so no copy
 * anywhere may describe these as verified.
 *
 * The rule below is what the adapters implement:
 *
 *   High   — the source published a dedicated contractor or business-name
 *            field and it was populated.
 *   Medium — the source named someone, but through a general applicant or
 *            owner field that is often the property owner rather than the GC.
 *   Low    — the source named no one; the record falls back to
 *            "Unknown Contractor".
 *
 * If verification is ever added, it belongs in a separate field with its own
 * method and timestamp. Do not repurpose this one.
 */

import type { ContactConfidence } from "./types";

export interface ConfidenceDefinition {
  level: ContactConfidence;
  /** One line, safe to show next to a lead. */
  summary: string;
  /** Fuller explanation for pricing and help copy. */
  detail: string;
}

export const CONFIDENCE_DEFINITIONS: Record<
  ContactConfidence,
  ConfidenceDefinition
> = {
  High: {
    level: "High",
    summary: "Named in the permit's contractor field",
    detail:
      "The city published a dedicated contractor or business-name field for this permit and it was filled in. This is the most reliable signal a source gives us that the named company is the general contractor.",
  },
  Medium: {
    level: "Medium",
    summary: "Named in a general applicant field",
    detail:
      "The city named someone on this permit, but through a general applicant or owner field. That is often the property owner or an expediter rather than the general contractor, so check before you call.",
  },
  Low: {
    level: "Low",
    summary: "No contractor named on the record",
    detail:
      "The city published no contractor for this permit. The address, value, and scope are still accurate — there is simply no company name attached to it.",
  },
};

/**
 * The disclaimer that must accompany any display of these labels.
 *
 * Kept as one exported string so the promise cannot drift between the lead
 * card, the pricing page, and the docs.
 */
export const CONFIDENCE_DISCLAIMER =
  "Confidence describes which field of the city record the name came from. We do not call or verify contacts.";
