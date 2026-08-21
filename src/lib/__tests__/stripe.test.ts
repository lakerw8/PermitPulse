import { beforeAll, describe, expect, it, vi } from "vitest";
import type Stripe from "stripe";

// The module builds a Stripe client at import time, so the environment has to
// look configured before it is loaded. No network call is made by these tests.
vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_placeholder");
vi.stubEnv("STRIPE_PAID_PRICE_ID", "price_paid");

let subscriptionMatchesPaidPrice: typeof import("../stripe").subscriptionMatchesPaidPrice;
let periodEndOf: typeof import("../stripe").periodEndOf;

beforeAll(async () => {
  const mod = await import("../stripe");
  subscriptionMatchesPaidPrice = mod.subscriptionMatchesPaidPrice;
  periodEndOf = mod.periodEndOf;
});

function subscription(priceIds: string[], extra: Record<string, unknown> = {}) {
  return {
    id: "sub_1",
    status: "active",
    items: {
      data: priceIds.map((id) => ({ price: { id }, current_period_end: undefined })),
    },
    ...extra,
  } as unknown as Stripe.Subscription;
}

describe("subscriptionMatchesPaidPrice", () => {
  it("accepts a subscription for the configured price", () => {
    expect(subscriptionMatchesPaidPrice(subscription(["price_paid"]))).toBe(true);
  });

  it("rejects a subscription for some other price", () => {
    // A legacy plan, a test price, or one created by hand in the Stripe
    // dashboard must not unlock contacts.
    expect(subscriptionMatchesPaidPrice(subscription(["price_other"]))).toBe(false);
  });

  it("accepts a multi-item subscription that includes the paid price", () => {
    expect(
      subscriptionMatchesPaidPrice(subscription(["price_other", "price_paid"]))
    ).toBe(true);
  });

  it("rejects a subscription with no items", () => {
    expect(subscriptionMatchesPaidPrice(subscription([]))).toBe(false);
  });
});

describe("periodEndOf", () => {
  it("reads the period end from the subscription item", () => {
    const sub = {
      items: { data: [{ price: { id: "price_paid" }, current_period_end: 1787000000 }] },
    } as unknown as Stripe.Subscription;
    expect(periodEndOf(sub)).toBe(new Date(1787000000 * 1000).toISOString());
  });

  it("falls back to the subscription-level field used by older API versions", () => {
    const sub = {
      items: { data: [{ price: { id: "price_paid" } }] },
      current_period_end: 1787000000,
    } as unknown as Stripe.Subscription;
    expect(periodEndOf(sub)).toBe(new Date(1787000000 * 1000).toISOString());
  });

  it("returns null when neither field is present", () => {
    const sub = { items: { data: [] } } as unknown as Stripe.Subscription;
    expect(periodEndOf(sub)).toBeNull();
  });
});
