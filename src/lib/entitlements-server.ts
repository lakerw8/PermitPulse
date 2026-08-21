/* Hallmark · genre: modern-minimal · module: entitlements-server · design-system: design.md · designed-as-app */

/**
 * Server-side resolution of the current viewer's entitlement.
 *
 * Kept apart from `entitlements.ts` so the pure rules stay importable in unit
 * tests without pulling in `next/headers` and the Supabase clients.
 *
 * The identity comes from the request cookies via `supabase.auth.getUser()`,
 * which validates the JWT against Supabase rather than trusting its claims.
 * The billing state is then read with the service role, because the profile's
 * billing columns are no longer readable by the user's own key.
 *
 * Importing `next/headers` keeps this module server-only: a client component
 * that pulled it in would fail to compile.
 */

import { createClient } from "./supabase-server";
import { supabaseAdmin } from "./supabase";
import { isEntitled, type BillingProfile } from "./entitlements";

export interface Viewer {
  userId: string | null;
  entitled: boolean;
}

const ANONYMOUS: Viewer = { userId: null, entitled: false };

/**
 * Resolves the caller from the request cookies.
 *
 * Any failure — no session, an unreachable profile, a database error — falls
 * back to the anonymous, unentitled viewer. Failing closed here means an
 * outage degrades the product to the free experience instead of leaking the
 * thing the paid plan sells.
 */
export async function getViewer(): Promise<Viewer> {
  let userId: string;

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return ANONYMOUS;
    userId = user.id;
  } catch {
    return ANONYMOUS;
  }

  try {
    const { data, error } = await supabaseAdmin
      .from("profiles")
      .select("plan, trial_ends_at, stripe_customer_id, subscription_status")
      .eq("id", userId)
      .single();

    if (error || !data) return { userId, entitled: false };

    return { userId, entitled: isEntitled(data as BillingProfile) };
  } catch {
    return { userId, entitled: false };
  }
}
