import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { activeSubscriptionFor, periodEndOf } from "@/lib/stripe";
import { supabaseAdmin } from "@/lib/supabase";
import { ENTITLED_SUBSCRIPTION_STATUSES } from "@/lib/entitlements";

/**
 * Pulls the caller's own entitlement from Stripe and writes it to their
 * profile.
 *
 * Webhooks are the normal path; this covers the two cases they miss. Returning
 * from Checkout, the browser often lands on /dashboard before the webhook is
 * delivered, and the user sees "free" for a few seconds after paying. And
 * profiles written before the Stripe status columns existed carry no status at
 * all — one call here replaces the legacy `plan` fallback with a real answer.
 *
 * Self-service only: the user is taken from the session, never from the body,
 * so this cannot be pointed at another account.
 */
export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("stripe_customer_id")
    .eq("id", user.id)
    .single();

  if (!profile?.stripe_customer_id) {
    return NextResponse.json({ entitled: false, status: null });
  }

  let subscription;
  try {
    subscription = await activeSubscriptionFor(profile.stripe_customer_id);
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown error";
    console.error("[billing] reconcile lookup failed:", message);
    return NextResponse.json({ error: "Stripe unavailable" }, { status: 502 });
  }

  const status = subscription?.status ?? "canceled";
  const entitled = (ENTITLED_SUBSCRIPTION_STATUSES as readonly string[]).includes(
    status
  );

  const { error } = await supabaseAdmin
    .from("profiles")
    .update({
      plan: entitled ? "paid" : "free",
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
    .eq("id", user.id);

  if (error) {
    return NextResponse.json({ error: "Could not save" }, { status: 500 });
  }

  return NextResponse.json({ entitled, status });
}
