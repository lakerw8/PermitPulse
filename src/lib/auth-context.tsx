"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import type { User as SupabaseUser } from "@supabase/supabase-js";
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

const PREFS_KEY = "permitpulse_prefs";

function loadPrefs(): Partial<User> {
  try {
    const stored = localStorage.getItem(PREFS_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

function savePrefs(prefs: Partial<User>) {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  } catch {}
}

function mapSupabaseUser(su: SupabaseUser, prefs: Partial<User>): User {
  return {
    id: su.id,
    email: su.email || "",
    plan: prefs.plan ?? "free",
    metro: prefs.metro ?? "chicago",
    primaryTrade: prefs.primaryTrade ?? null,
    trialEndsAt: prefs.trialEndsAt ?? null,
    createdAt: su.created_at,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [supabase] = useState(() => createClient());

  useEffect(() => {
    const prefs = loadPrefs();

    supabase.auth.getUser().then(({ data: { user: su } }) => {
      if (su) {
        setUser(mapSupabaseUser(su, prefs));
      }
      setIsLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser(mapSupabaseUser(session.user, loadPrefs()));
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

  const updateUser = useCallback((updates: Partial<User>) => {
    setUser((prev) => {
      if (!prev) return null;
      const updated = { ...prev, ...updates };
      savePrefs({
        plan: updated.plan,
        metro: updated.metro,
        primaryTrade: updated.primaryTrade,
        trialEndsAt: updated.trialEndsAt,
      });
      return updated;
    });
  }, []);

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
