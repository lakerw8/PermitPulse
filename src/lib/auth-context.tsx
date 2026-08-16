"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import type { Trade } from "./types";

export type Plan = "free" | "starter" | "pro" | "growth";

export interface User {
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
  login: (email: string) => void;
  logout: () => void;
  updateUser: (updates: Partial<User>) => void;
  isTrialActive: boolean;
  isPaid: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const STORAGE_KEY = "permitpulse_user";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setUser(JSON.parse(stored));
      }
    } catch {}
    setIsLoading(false);
  }, []);

  useEffect(() => {
    if (!isLoading) {
      if (user) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
    }
  }, [user, isLoading]);

  const login = useCallback((email: string) => {
    const newUser: User = {
      email,
      plan: "free",
      metro: "chicago",
      primaryTrade: null,
      trialEndsAt: null,
      createdAt: new Date().toISOString(),
    };
    setUser(newUser);
  }, []);

  const logout = useCallback(() => {
    setUser(null);
  }, []);

  const updateUser = useCallback((updates: Partial<User>) => {
    setUser((prev) => (prev ? { ...prev, ...updates } : null));
  }, []);

  const isTrialActive =
    !!user?.trialEndsAt && new Date(user.trialEndsAt) > new Date();

  const isPaid =
    (user?.plan !== "free" && user?.plan !== undefined) || isTrialActive;

  return (
    <AuthContext.Provider
      value={{ user, isLoading, login, logout, updateUser, isTrialActive, isPaid }}
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
