import { NextResponse } from "next/server";
import type Stripe from "stripe";
import {
  stripe,
  activeSubscriptionFor,
  periodEndOf,
  subscriptionMatchesPaidPrice,
} from "@/lib/stripe";
import { supabaseAdmin } from "@/lib/supabase";
import { ENTITLED_SUBSCRIPTION_STATUSES } from "@/lib/entitlements";

/**
 * Stripe is the only writer of billing state.
 *
 * Three properties this handler is built around:
 *
 *  1. Idempotency. Every event id is claimed in `stripe_events` before it is
 *     processed; a replay collides on the primary key and is acknowledged
 *     without running the handler twice.
 *  2. Retryability. A failed database write returns 500 so Stripe retries.
 *     The previous version swallowed errors and returned 200, which meant a
 *     transient outage silently dropped a customer's upgrade forever.
 *  3. Honest status mapping. Only `trialing` and `active` grant access. The
 *     previous version wrote `plan: "paid"` on every `subscription.updated`
 *     event, so a `past_due` or `unpaid` subscription kept full access.
 */

const RELEVANT_EVENTS = new Set<Stripe.Event["type"]>([
  "checkout.session.completed",
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
]);

export async function POST(req: Request) {
  const body = await req.text();
  const signature = req.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    // Fail closed: without a secret every payload is unverifiable.
    console.error("[stripe] STRIPE_WEBHOOK_SECRET is not configured");
    return NextResponse.json({ error: "Not configured" }, { status: 500 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (!RELEVANT_EVENTS.has(event.type)) {
    return NextResponse.json({ received: true, skipped: event.type });
  }

  // Claim the event. A duplicate delivery loses the race and returns early.
  const { error: claimError } = await supabaseAdmin
    .from("stripe_events")
    .insert({ id: event.id, type: event.type });

  if (claimError) {
    if (claimError.code === "23505") {
      return NextResponse.json({ received: true, duplicate: true });
    }
    console.error("[stripe] could not record event", event.id, claimError.code);
    return NextResponse.json({ error: "Ledger unavailable" }, { status: 500 });
  }

  try {
    await handleEvent(event);
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown error";
    // Release the claim so Stripe's retry is processed rather than deduped.
    await supabaseAdmin.from("stripe_events").delete().eq("id", event.id);
    console.error("[stripe] handler failed for", event.type, message);
    return NextResponse.json({ error: "Processing failed" }, { status: 500 });
  }

  await supabaseAdmin
    .from("stripe_events")
    .update({ processed_at: new Date().toISOString() })
    .eq("id", event.id);

  return NextResponse.json({ received: true });
}

async function handleEvent(event: Stripe.Event): Promise<void> {
  const customerId = await customerIdFor(event);
  if (!customerId) return;

  const userId = await resolveUserId(event, customerId);
  if (!userId) {
    // Nothing to update. Not an error — the customer may belong to another
    // environment sharing this Stripe account.
    console.warn("[stripe] no profile for customer", customerId);
    return;
  }

  const subscription = await activeSubscriptionFor(customerId);
  await writeEntitlement(userId, customerId, subscription);
}

async function customerIdFor(event: Stripe.Event): Promise<string | null> {
  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    return typeof session.customer === "string" ? session.customer : null;
  }

  const subscription = event.data.object as Stripe.Subscription;
  if (!subscriptionMatchesPaidPrice(subscription)) return null;
  return typeof subscription.customer === "string" ? subscription.customer : null;
}

/**
 * Finds the PermitPulse user behind a Stripe customer.
 *
 * Metadata first because it is present on everything Checkout creates, then a
 * lookup by customer id so an event created outside our Checkout flow — a
 * subscription edited in the Stripe dashboard, say — still lands on the right
 * profile instead of being dropped.
 */
async function resolveUserId(
  event: Stripe.Event,
  customerId: string
): Promise<string | null> {
  const object = event.data.object as { metadata?: Stripe.Metadata | null };
  const fromMetadata = object.metadata?.supabase_user_id;
  if (fromMetadata) return fromMetadata;

  const { data } = await supabaseAdmin
    .from("profiles")
    .select("id")
    .eq("stripe_customer_id", customerId)
    .maybeSingle();

  return data?.id ?? null;
}

async function writeEntitlement(
  userId: string,
  customerId: string,
  subscription: Stripe.Subscription | null
): Promise<void> {
  const status = subscription?.status ?? "canceled";
  const entitled = (ENTITLED_SUBSCRIPTION_STATUSES as readonly string[]).includes(
    status
  );

  const { error } = await supabaseAdmin
    .from("profiles")
    .update({
      plan: entitled ? "paid" : "free",
      stripe_customer_id: customerId,
      stripe_subscription_id: subscription?.id ?? null,
      subscription_status: status,
      current_period_end: subscription ? periodEndOf(subscription) : null,
      cancel_at_period_end: subscription?.cancel_at_period_end ?? false,
      trial_ends_at:
        subscription?.trial_end != null
          ? new Date(subscription.trial_end * 1000).toISOString()
          : null,
      billing_updated_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId);

  // Thrown, not logged: the caller turns this into a 500 so Stripe retries.
  if (error) throw new Error(`profile update failed: ${error.code}`);
}
