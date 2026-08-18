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
import type { Trade } from "./types";

export type Plan = "free" | "starter" | "pro" | "growth";

export interface User {
  id: string;
  email: string;
  plan: Plan;
  metro: string;
  primaryTrade: Trade | null;
  trialEndsAt: string | null;
  createdAt: string;
}

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  signIn: (email: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  updateUser: (updates: Partial<User>) => void;
  isTrialActive: boolean;
  isPaid: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

interface ProfileRow {
  plan: string;
  metro: string;
  primary_trade: string | null;
  trial_ends_at: string | null;
}

async function fetchProfile(supabase: SupabaseClient, userId: string): Promise<ProfileRow | null> {
  const { data } = await supabase
    .from("profiles")
    .select("plan, metro, primary_trade, trial_ends_at")
    .eq("id", userId)
    .single();
  return data;
}

function mapToUser(su: SupabaseUser, profile: ProfileRow | null): User {
  return {
    id: su.id,
    email: su.email || "",
    plan: (profile?.plan as Plan) ?? "free",
    metro: profile?.metro ?? "chicago",
    primaryTrade: (profile?.primary_trade as Trade) ?? null,
    trialEndsAt: profile?.trial_ends_at ?? null,
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

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
  }, [supabase]);

  const updateUser = useCallback(
    (updates: Partial<User>) => {
      setUser((prev) => {
        if (!prev) return null;
        const updated = { ...prev, ...updates };

        if (!savingRef.current) {
          savingRef.current = true;
          const dbUpdates: Record<string, unknown> = {};
          if ("plan" in updates) dbUpdates.plan = updates.plan;
          if ("metro" in updates) dbUpdates.metro = updates.metro;
          if ("primaryTrade" in updates) dbUpdates.primary_trade = updates.primaryTrade;
          if ("trialEndsAt" in updates) dbUpdates.trial_ends_at = updates.trialEndsAt;

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

  const isTrialActive =
    !!user?.trialEndsAt && new Date(user.trialEndsAt) > new Date();

  const isPaid =
    (user?.plan !== "free" && user?.plan !== undefined) || isTrialActive;

  return (
    <AuthContext.Provider
      value={{ user, isLoading, signIn, signOut, updateUser, isTrialActive, isPaid }}
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
