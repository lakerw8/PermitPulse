import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { stripe, PAID_PRICE_ID } from "@/lib/stripe";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  if (!PAID_PRICE_ID) {
    return NextResponse.json({ error: "Stripe not configured" }, { status: 500 });
  }

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("stripe_customer_id")
    .eq("id", user.id)
    .single();

  let customerId = profile?.stripe_customer_id;

  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      metadata: { supabase_user_id: user.id },
    });
    customerId = customer.id;

    await supabaseAdmin
      .from("profiles")
      .update({ stripe_customer_id: customerId })
      .eq("id", user.id);
  }

  const origin = new URL(req.url).origin;

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    line_items: [{ price: PAID_PRICE_ID, quantity: 1 }],
    success_url: `${origin}/dashboard?checkout=success`,
    cancel_url: `${origin}/pricing?checkout=cancelled`,
    subscription_data: {
      trial_period_days: 7,
      metadata: { supabase_user_id: user.id, plan_id: "paid" },
    },
    metadata: { supabase_user_id: user.id, plan_id: "paid" },
  });

  return NextResponse.json({ url: session.url });
}
