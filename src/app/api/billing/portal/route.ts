import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { stripe } from "@/lib/stripe";
import { supabaseAdmin } from "@/lib/supabase";

/**
 * Opens the Stripe billing portal for the signed-in user.
 *
 * The pricing page has promised "cancel from your dashboard" since launch with
 * nothing behind it. The portal is Stripe-hosted, so cancellation, payment
 * method updates and invoices all work without us handling card data.
 */
export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // Read with the service role: the customer id is a billing column and the
  // user's own key can no longer write it.
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("stripe_customer_id")
    .eq("id", user.id)
    .single();

  if (!profile?.stripe_customer_id) {
    return NextResponse.json(
      { error: "No billing account yet" },
      { status: 404 }
    );
  }

  const origin = new URL(req.url).origin;

  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: profile.stripe_customer_id,
      return_url: `${origin}/dashboard`,
    });
    return NextResponse.json({ url: session.url });
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown error";
    console.error("[billing] portal session failed:", message);
    return NextResponse.json(
      { error: "Could not open billing portal" },
      { status: 502 }
    );
  }
}
