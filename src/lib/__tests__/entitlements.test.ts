import { describe, expect, it } from "vitest";
import {
  applyEntitlement,
  isEntitled,
  redactContact,
  unlockContact,
  UNKNOWN_CONTRACTOR,
} from "../entitlements";
import type { GCContact, Permit } from "../types";

const NOW = new Date("2026-08-20T12:00:00Z");

function contact(overrides: Partial<GCContact> = {}): GCContact {
  return {
    companyName: "Ridgeline Mechanical",
    contactName: "Dana Okafor",
    phone: "(312) 555-0142",
    email: "dana@ridgeline.example",
    confidence: "High",
    ...overrides,
  };
}

function permit(gcContact: GCContact): Permit {
  return {
    id: "chi-1",
    permitNumber: "100-2026",
    address: "railroad row",
    city: "Chicago",
    state: "IL",
    zip: "60607",
    latitude: 41.87,
    longitude: -87.65,
    filingDate: "2026-08-01",
    description: "Tenant build-out",
    estimatedValue: 450000,
    status: "Issued",
    trades: ["HVAC"],
    gcContact,
    source: "Chicago Data Portal",
    sourceUpdatedAt: "2026-08-02",
  };
}

describe("isEntitled", () => {
  it("grants access for the two Stripe statuses that are paid up", () => {
    for (const status of ["trialing", "active"]) {
      expect(
        isEntitled({ subscription_status: status, stripe_customer_id: "cus_1" }, NOW)
      ).toBe(true);
    }
  });

  it("denies access for every other Stripe status", () => {
    const denied = [
      "past_due",
      "unpaid",
      "incomplete",
      "incomplete_expired",
      "paused",
      "canceled",
    ];
    for (const status of denied) {
      expect(
        isEntitled(
          // plan says paid, but Stripe disagrees — Stripe wins.
          { subscription_status: status, plan: "paid", stripe_customer_id: "cus_1" },
          NOW
        )
      ).toBe(false);
    }
  });

  it("denies access for an unrecognised status rather than falling back", () => {
    expect(
      isEntitled(
        { subscription_status: "totally_made_up", plan: "paid", stripe_customer_id: "cus_1" },
        NOW
      )
    ).toBe(false);
  });

  it("refuses a self-granted paid plan with no Stripe customer", () => {
    // Exactly what the removed client-side Plan Simulator used to write.
    expect(isEntitled({ plan: "paid", trial_ends_at: null }, NOW)).toBe(false);
    expect(
      isEntitled(
        { plan: "paid", trial_ends_at: "2026-09-01T00:00:00Z" },
        NOW
      )
    ).toBe(false);
  });

  it("honours a legacy paid profile that reached Checkout", () => {
    expect(
      isEntitled({ plan: "paid", stripe_customer_id: "cus_legacy" }, NOW)
    ).toBe(true);
  });

  it("honours a legacy trial only until it expires", () => {
    expect(
      isEntitled(
        {
          plan: "free",
          trial_ends_at: "2026-08-25T00:00:00Z",
          stripe_customer_id: "cus_legacy",
        },
        NOW
      )
    ).toBe(true);
    expect(
      isEntitled(
        {
          plan: "free",
          trial_ends_at: "2026-08-01T00:00:00Z",
          stripe_customer_id: "cus_legacy",
        },
        NOW
      )
    ).toBe(false);
  });

  it("denies anonymous and malformed profiles", () => {
    expect(isEntitled(null, NOW)).toBe(false);
    expect(isEntitled(undefined, NOW)).toBe(false);
    expect(isEntitled({}, NOW)).toBe(false);
    expect(
      isEntitled(
        { trial_ends_at: "not-a-date", stripe_customer_id: "cus_1", plan: "free" },
        NOW
      )
    ).toBe(false);
  });
});

describe("redactContact", () => {
  it("returns no real value in any field", () => {
    const redacted = redactContact(contact());
    expect(redacted.companyName).toBe("");
    expect(redacted.contactName).toBeNull();
    expect(redacted.phone).toBeNull();
    expect(redacted.email).toBeNull();
    expect(JSON.stringify(redacted)).not.toContain("Ridgeline");
    expect(JSON.stringify(redacted)).not.toContain("555-0142");
    expect(JSON.stringify(redacted)).not.toContain("ridgeline.example");
  });

  it("still reports what exists so the paywall can be honest", () => {
    expect(redactContact(contact()).available).toEqual({
      companyName: true,
      contactName: true,
      phone: true,
      email: true,
    });

    expect(
      redactContact(contact({ phone: null, email: null, contactName: null }))
        .available
    ).toEqual({
      companyName: true,
      contactName: false,
      phone: false,
      email: false,
    });
  });

  it("does not count the unknown-contractor placeholder as a named GC", () => {
    const redacted = redactContact(
      contact({ companyName: UNKNOWN_CONTRACTOR, contactName: null, phone: null, email: null })
    );
    expect(redacted.available?.companyName).toBe(false);
  });

  it("trusts availability supplied by the caller", () => {
    // The permits route reads the database's generated has_gc_* columns and
    // never sees the values, so the flags must survive untouched.
    const fromDatabase = contact({
      companyName: "Unknown Contractor",
      contactName: null,
      phone: null,
      email: null,
      available: { companyName: true, contactName: false, phone: true, email: false },
    });
    expect(redactContact(fromDatabase).available).toEqual({
      companyName: true,
      contactName: false,
      phone: true,
      email: false,
    });
  });

  it("marks the contact locked", () => {
    expect(redactContact(contact()).locked).toBe(true);
  });
});

describe("applyEntitlement", () => {
  it("withholds every contact value from an unentitled viewer", () => {
    const result = applyEntitlement(permit(contact()), false);
    expect(result.gcContact.locked).toBe(true);
    expect(result.gcContact.phone).toBeNull();
    // Non-contact fields are public record and stay visible.
    expect(result.address).toBe("railroad row");
    expect(result.estimatedValue).toBe(450000);
  });

  it("returns full contact details to an entitled viewer", () => {
    const result = applyEntitlement(permit(contact()), true);
    expect(result.gcContact.locked).toBe(false);
    expect(result.gcContact.phone).toBe("(312) 555-0142");
    expect(result.gcContact.email).toBe("dana@ridgeline.example");
  });

  it("leaves the input permit untouched", () => {
    const original = permit(contact());
    applyEntitlement(original, false);
    expect(original.gcContact.phone).toBe("(312) 555-0142");
  });
});

describe("unlockContact", () => {
  it("reports availability for a permit with no contractor on record", () => {
    const unlocked = unlockContact(
      contact({
        companyName: UNKNOWN_CONTRACTOR,
        contactName: null,
        phone: null,
        email: null,
        confidence: "Low",
      })
    );
    expect(unlocked.available).toEqual({
      companyName: false,
      contactName: false,
      phone: false,
      email: false,
    });
  });
});
