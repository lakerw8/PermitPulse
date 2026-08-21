"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  type ReactNode,
} from "react";
import type { User as SupabaseUser, SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "./supabase-browser";
import { isEntitled } from "./entitlements";
import type { Trade } from "./types";

export type Plan = "free" | "paid";

export interface User {
  id: string;
  email: string;
  plan: Plan;
  metro: string;
  primaryTrade: Trade | null;
  trialEndsAt: string | null;
  subscriptionStatus: string | null;
  cancelAtPeriodEnd: boolean;
  currentPeriodEnd: string | null;
  /** Whether Checkout was ever reached. Distinguishes a real (if stale)
   *  customer from a row the removed Plan Simulator wrote. */
  hasStripeCustomer: boolean;
  createdAt: string;
}

/** The only profile fields a user may change. Billing is service-owned. */
export type UserPreferences = Pick<User, "metro" | "primaryTrade">;

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  signIn: (email: string) => Promise<{ error: string | null }>;
  signInWithGoogle: () => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  updateUser: (updates: Partial<UserPreferences>) => void;
  refreshProfile: () => Promise<void>;
  isTrialActive: boolean;
  isPaid: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

interface ProfileRow {
  plan: string;
  metro: string;
  primary_trade: string | null;
  trial_ends_at: string | null;
  stripe_customer_id: string | null;
  subscription_status: string | null;
  cancel_at_period_end: boolean | null;
  current_period_end: string | null;
}

const PROFILE_COLUMNS =
  "plan, metro, primary_trade, trial_ends_at, stripe_customer_id, subscription_status, cancel_at_period_end, current_period_end";

async function fetchProfile(supabase: SupabaseClient, userId: string): Promise<ProfileRow | null> {
  const { data } = await supabase
    .from("profiles")
    .select(PROFILE_COLUMNS)
    .eq("id", userId)
    .single();
  return data;
}

function normalizePlan(raw: string | undefined | null): Plan {
  if (!raw || raw === "free") return "free";
  return "paid";
}

function mapToUser(su: SupabaseUser, profile: ProfileRow | null): User {
  return {
    id: su.id,
    email: su.email || "",
    plan: normalizePlan(profile?.plan),
    metro: profile?.metro ?? "chicago",
    primaryTrade: (profile?.primary_trade as Trade) ?? null,
    trialEndsAt: profile?.trial_ends_at ?? null,
    subscriptionStatus: profile?.subscription_status ?? null,
    hasStripeCustomer: !!profile?.stripe_customer_id,
    cancelAtPeriodEnd: profile?.cancel_at_period_end ?? false,
    currentPeriodEnd: profile?.current_period_end ?? null,
    createdAt: su.created_at,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [supabase] = useState(() => createClient());
  const savingRef = useRef(false);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user: su } }) => {
      if (su) {
        const profile = await fetchProfile(supabase, su.id);
        setUser(mapToUser(su, profile));
      }
      setIsLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        const profile = await fetchProfile(supabase, session.user.id);
        setUser(mapToUser(session.user, profile));
      } else {
        setUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, [supabase]);

  const signIn = useCallback(
    async (email: string): Promise<{ error: string | null }> => {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/api/auth/callback`,
        },
      });
      return { error: error?.message ?? null };
    },
    [supabase]
  );

  const signInWithGoogle = useCallback(async (): Promise<{ error: string | null }> => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/api/auth/callback`,
      },
    });
    return { error: error?.message ?? null };
  }, [supabase]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
  }, [supabase]);

  /**
   * Writes the two preference columns.
   *
   * `plan`, `trial_ends_at` and the Stripe columns are intentionally absent:
   * the database revoked UPDATE on them for the `authenticated` role, so an
   * attempt would fail anyway. Entitlement changes only through the Stripe
   * webhook.
   */
  const updateUser = useCallback(
    (updates: Partial<UserPreferences>) => {
      setUser((prev) => {
        if (!prev) return null;
        const updated = { ...prev, ...updates };

        if (!savingRef.current) {
          savingRef.current = true;
          const dbUpdates: Record<string, unknown> = {};
          if ("metro" in updates) dbUpdates.metro = updates.metro;
          if ("primaryTrade" in updates) dbUpdates.primary_trade = updates.primaryTrade;

          if (Object.keys(dbUpdates).length > 0) {
            dbUpdates.updated_at = new Date().toISOString();
            supabase
              .from("profiles")
              .update(dbUpdates)
              .eq("id", prev.id)
              .then(() => {
                savingRef.current = false;
              });
          } else {
            savingRef.current = false;
          }
        }

        return updated;
      });
    },
    [supabase]
  );

  /** Re-reads billing state, e.g. when returning from Stripe Checkout. */
  const refreshProfile = useCallback(async () => {
    const {
      data: { user: su },
    } = await supabase.auth.getUser();
    if (!su) return;
    const profile = await fetchProfile(supabase, su.id);
    setUser(mapToUser(su, profile));
  }, [supabase]);

  const isTrialActive = user?.subscriptionStatus
    ? user.subscriptionStatus === "trialing"
    : !!user?.trialEndsAt && new Date(user.trialEndsAt) > new Date();

  /**
   * Mirrors the server's rule so the UI does not promise access the API will
   * refuse. It is a display hint only — every contact field is withheld or
   * released by `/api/permits`, never by this flag.
   */
  const isPaid = isEntitled(
    user
      ? {
          plan: user.plan,
          trial_ends_at: user.trialEndsAt,
          stripe_customer_id: user.hasStripeCustomer ? "present" : null,
          subscription_status: user.subscriptionStatus,
        }
      : null
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        signIn,
        signInWithGoogle,
        signOut,
        updateUser,
        refreshProfile,
        isTrialActive,
        isPaid,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
