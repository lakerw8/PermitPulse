/* Hallmark · genre: modern-minimal · module: entitlements · design-system: design.md · designed-as-app */

/**
 * Who may see General Contractor contact details.
 *
 * This module is pure and has no Next.js or Supabase imports so it can be unit
 * tested directly. It is the TypeScript half of a rule that also exists in SQL
 * as `public.profile_is_entitled` (see
 * `supabase/migrations/0001_phase0_entitlements.sql`). The two must agree:
 * the database enforces the free saved-lead limit with its copy, the API
 * redacts contact fields with this one. Change both together.
 */

import type { ContactAvailability, GCContact, Permit } from "./types";

/**
 * Stripe subscription statuses that grant access.
 *
 * `past_due` is deliberately excluded. Stripe keeps a subscription `past_due`
 * for the whole dunning window, which would otherwise hand out weeks of free
 * access after a card fails. If a grace period is wanted later it belongs
 * here, as an explicit policy with an end date — not as a side effect of
 * treating every non-cancelled status as paid.
 */
export const ENTITLED_SUBSCRIPTION_STATUSES = ["trialing", "active"] as const;

export type EntitledSubscriptionStatus =
  (typeof ENTITLED_SUBSCRIPTION_STATUSES)[number];

/** The billing columns of a `profiles` row. Preferences are irrelevant here. */
export interface BillingProfile {
  plan?: string | null;
  trial_ends_at?: string | null;
  stripe_customer_id?: string | null;
  subscription_status?: string | null;
}

/**
 * Whether a profile may read contact details.
 *
 * Stripe's status wins whenever we have one. A profile without a status is a
 * row written before this column existed, and is honoured only when it also
 * carries a Stripe customer id — the discriminator that separates a real
 * customer from a row the removed client-side Plan Simulator wrote. A
 * malformed or unknown status is treated as not entitled rather than ignored.
 */
export function isEntitled(
  profile: BillingProfile | null | undefined,
  now: Date = new Date()
): boolean {
  if (!profile) return false;

  const status = profile.subscription_status;
  if (typeof status === "string" && status.length > 0) {
    return (ENTITLED_SUBSCRIPTION_STATUSES as readonly string[]).includes(status);
  }

  // Legacy rows only, and only when Checkout was actually reached.
  if (!profile.stripe_customer_id) return false;

  if (profile.plan && profile.plan !== "free") return true;

  if (profile.trial_ends_at) {
    const endsAt = new Date(profile.trial_ends_at);
    if (!Number.isNaN(endsAt.getTime()) && endsAt > now) return true;
  }

  return false;
}

/**
 * The contact fields a locked viewer receives.
 *
 * No real value survives. What does survive is the shape of what is missing —
 * whether the source named a contractor, whether a phone exists — so the
 * paywall can say "this permit has a named GC and a phone number" instead of
 * blurring a fake one. Confidence is not personal data and is kept, since it
 * is the signal a prospect uses to judge whether the paid plan is worth it.
 */
export function redactContact(contact: GCContact): GCContact {
  return {
    companyName: "",
    contactName: null,
    phone: null,
    email: null,
    confidence: contact.confidence,
    locked: true,
    available: availabilityOf(contact),
  };
}

/** The placeholder the adapters write when a source names no contractor. */
export const UNKNOWN_CONTRACTOR = "Unknown Contractor";

function hasValue(value: string | null | undefined): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

/**
 * Availability of a contact's fields.
 *
 * A caller that already knows the answer — the permits route reads the
 * database's generated `has_gc_*` columns, which it can see even when the
 * values themselves are not selected — passes it in on `contact.available`
 * and it is trusted. Otherwise it is derived from the values at hand.
 */
export function availabilityOf(contact: GCContact): ContactAvailability {
  if (contact.available) return contact.available;
  return {
    companyName:
      hasValue(contact.companyName) && contact.companyName !== UNKNOWN_CONTRACTOR,
    contactName: hasValue(contact.contactName),
    phone: hasValue(contact.phone),
    email: hasValue(contact.email),
  };
}

/** Marks a contact as fully visible so the UI does not have to infer it. */
export function unlockContact(contact: GCContact): GCContact {
  return {
    ...contact,
    locked: false,
    available: availabilityOf(contact),
  };
}

/** Applies the viewer's entitlement to a single permit before serialization. */
export function applyEntitlement(permit: Permit, entitled: boolean): Permit {
  return {
    ...permit,
    gcContact: entitled
      ? unlockContact(permit.gcContact)
      : redactContact(permit.gcContact),
  };
}
