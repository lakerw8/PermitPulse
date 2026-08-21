import Stripe from "stripe";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  typescript: true,
});

export const PAID_PRICE_ID = process.env.STRIPE_PAID_PRICE_ID!;

/**
 * Whether a subscription is for the price we actually sell.
 *
 * Checkout metadata is attacker-influenceable in the general case and stale in
 * the common case, so entitlement is granted on the configured price id rather
 * than on a `plan_id` string riding along with the event. A subscription for
 * some other price — a legacy plan, a test price, a manually created one —
 * does not unlock contacts.
 */
export function subscriptionMatchesPaidPrice(
  subscription: Stripe.Subscription
): boolean {
  if (!PAID_PRICE_ID) return false;
  return subscription.items.data.some((item) => item.price?.id === PAID_PRICE_ID);
}

/** The subscription for a customer that should drive entitlement, if any. */
export async function activeSubscriptionFor(
  customerId: string
): Promise<Stripe.Subscription | null> {
  const subscriptions = await stripe.subscriptions.list({
    customer: customerId,
    status: "all",
    limit: 10,
  });

  const relevant = subscriptions.data.filter(subscriptionMatchesPaidPrice);
  if (relevant.length === 0) return null;

  // Prefer a subscription that currently grants access; otherwise report the
  // most recently created one so its terminal status is recorded faithfully.
  return (
    relevant.find((s) => s.status === "active" || s.status === "trialing") ??
    relevant.sort((a, b) => b.created - a.created)[0]
  );
}

/**
 * The period end of a subscription.
 *
 * Stripe moved `current_period_end` onto subscription items; older API
 * versions kept it on the subscription. Read whichever is present so the
 * dashboard can say when access lapses regardless of API version.
 */
export function periodEndOf(subscription: Stripe.Subscription): string | null {
  const fromItem = subscription.items.data[0]?.current_period_end;
  const fromSubscription = (
    subscription as unknown as { current_period_end?: number }
  ).current_period_end;
  const seconds = fromItem ?? fromSubscription;
  return typeof seconds === "number"
    ? new Date(seconds * 1000).toISOString()
    : null;
}
