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
import { createClient } from "./supabase-browser";
import { useAuth } from "./auth-context";
import type { LeadStatus, Permit } from "./types";

/**
 * Saved leads, joined with their permits on the server.
 *
 * Two rules this module now follows:
 *
 *  1. The lead list is loaded from `/api/leads`, never assembled from whatever
 *     permits the browse view happens to hold. A saved lead survives region
 *     changes, filters, pagination and reloads because none of those things
 *     take part in producing it.
 *  2. Every mutation awaits the database and rolls back its optimistic update
 *     on failure. Previously a rejected write left the UI showing state that
 *     was never persisted, and the user found out on their next reload.
 */

export interface SavedLead {
  permitId: string;
  status: LeadStatus;
  notes: string;
  savedAt: string;
  updatedAt: string;
  /** Null when the cached permit is gone; the lead itself is still kept. */
  permit: Permit | null;
}

interface LeadsContextValue {
  leads: SavedLead[];
  isLoading: boolean;
  /** Last failure, or null. Cleared by the next successful mutation. */
  error: string | null;
  clearError: () => void;
  refresh: () => Promise<void>;
  saveLead: (permitId: string) => Promise<boolean>;
  removeLead: (permitId: string) => Promise<boolean>;
  updateLeadStatus: (permitId: string, status: LeadStatus) => Promise<boolean>;
  updateLeadNotes: (permitId: string, notes: string) => Promise<boolean>;
  isLeadSaved: (permitId: string) => boolean;
  getLeadForPermit: (permitId: string) => SavedLead | undefined;
  canSaveMore: (isPaid: boolean) => boolean;
  exportCSV: () => Promise<boolean>;
}

const LeadsContext = createContext<LeadsContextValue | null>(null);

/**
 * Mirrors the `saved_leads_free_limit` trigger. The client check only decides
 * whether to show the upgrade prompt before trying; the database is what
 * actually enforces the limit, including against direct API calls.
 */
const FREE_LIMIT = 5;

/** Notes bound, matching the `saved_leads_notes_length_check` constraint. */
export const NOTES_MAX_LENGTH = 2000;

interface PostgrestErrorish {
  message?: string;
  hint?: string | null;
}

function isFreeLimitError(error: PostgrestErrorish): boolean {
  return (
    error.hint === "FREE_LEAD_LIMIT" ||
    (error.message ?? "").includes("saved leads")
  );
}

const NO_LEADS: SavedLead[] = [];

const LOAD_ERROR = "Could not load your saved leads. Please refresh the page.";

async function loadLeads(): Promise<SavedLead[]> {
  const res = await fetch("/api/leads");
  if (!res.ok) throw new Error(`Request failed (${res.status})`);
  const data = (await res.json()) as { leads: SavedLead[] };
  return data.leads;
}

export function LeadsProvider({ children }: { children: ReactNode }) {
  const [loadedLeads, setLoadedLeads] = useState<SavedLead[]>([]);
  const [isFetching, setIsFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const [supabase] = useState(() => createClient());

  // Guards against a slow in-flight load overwriting a newer one.
  const loadToken = useRef(0);

  /**
   * The signed-out state is derived rather than assigned. Clearing it with a
   * setState in the effect body would be a synchronous cascade render, and it
   * would also leave a stale list on screen for one frame after sign-out.
   */
  const leads = user ? loadedLeads : NO_LEADS;
  const isLoading = user ? isFetching : false;

  /** Manual reload, used after a write that needs the server-side join. */
  const refresh = useCallback(async () => {
    const token = ++loadToken.current;
    try {
      const fresh = await loadLeads();
      if (token !== loadToken.current) return;
      setLoadedLeads(fresh);
      setError(null);
    } catch {
      if (token !== loadToken.current) return;
      setError(LOAD_ERROR);
    } finally {
      if (token === loadToken.current) setIsFetching(false);
    }
  }, []);

  useEffect(() => {
    if (!user) return;

    const token = ++loadToken.current;

    // The fetch chain is written out here rather than delegating to `refresh`
    // so that every setState sits inside a promise callback — the shape
    // react-hooks/set-state-in-effect asks for — instead of looking like a
    // synchronous cascade to the linter.
    loadLeads()
      .then((fresh) => {
        if (token !== loadToken.current) return;
        setLoadedLeads(fresh);
        setError(null);
      })
      .catch(() => {
        if (token !== loadToken.current) return;
        setError(LOAD_ERROR);
      })
      .finally(() => {
        if (token === loadToken.current) setIsFetching(false);
      });
  }, [user]);

  const saveLead = useCallback(
    async (permitId: string): Promise<boolean> => {
      if (!user) return false;
      if (leads.some((l) => l.permitId === permitId)) return false;

      const now = new Date().toISOString();
      const { error: insertError } = await supabase.from("saved_leads").insert({
        user_id: user.id,
        permit_id: permitId,
        status: "Saved",
        notes: "",
        saved_at: now,
        updated_at: now,
      });

      if (insertError) {
        setError(
          isFreeLimitError(insertError)
            ? `Free accounts can save ${FREE_LIMIT} leads. Upgrade to save more.`
            : "Could not save this lead. Please try again."
        );
        return false;
      }

      // Re-read rather than guess: the new row needs its permit joined on, and
      // that join only exists on the server.
      setError(null);
      await refresh();
      return true;
    },
    [leads, user, supabase, refresh]
  );

  /**
   * Applies an optimistic change, awaits the write, and restores the previous
   * list if it fails.
   */
  const mutate = useCallback(
    async (
      optimistic: (current: SavedLead[]) => SavedLead[],
      // PromiseLike, not Promise: a Supabase query builder is a thenable that
      // only issues the request when awaited.
      write: () => PromiseLike<{ error: PostgrestErrorish | null }>,
      failureMessage: string
    ): Promise<boolean> => {
      if (!user) return false;

      let previous: SavedLead[] = [];
      setLoadedLeads((current) => {
        previous = current;
        return optimistic(current);
      });

      const { error: writeError } = await write();

      if (writeError) {
        setLoadedLeads(previous);
        setError(failureMessage);
        return false;
      }

      setError(null);
      return true;
    },
    [user]
  );

  const removeLead = useCallback(
    (permitId: string) =>
      mutate(
        (current) => current.filter((l) => l.permitId !== permitId),
        () =>
          supabase
            .from("saved_leads")
            .delete()
            .eq("user_id", user!.id)
            .eq("permit_id", permitId),
        "Could not remove this lead. Please try again."
      ),
    [mutate, supabase, user]
  );

  const updateLeadStatus = useCallback(
    (permitId: string, status: LeadStatus) => {
      const now = new Date().toISOString();
      return mutate(
        (current) =>
          current.map((l) =>
            l.permitId === permitId ? { ...l, status, updatedAt: now } : l
          ),
        () =>
          supabase
            .from("saved_leads")
            .update({ status, updated_at: now })
            .eq("user_id", user!.id)
            .eq("permit_id", permitId),
        "Could not update the lead status. Please try again."
      );
    },
    [mutate, supabase, user]
  );

  const updateLeadNotes = useCallback(
    (permitId: string, notes: string) => {
      if (notes.length > NOTES_MAX_LENGTH) {
        setError(`Notes are limited to ${NOTES_MAX_LENGTH} characters.`);
        return Promise.resolve(false);
      }

      const now = new Date().toISOString();
      return mutate(
        (current) =>
          current.map((l) =>
            l.permitId === permitId ? { ...l, notes, updatedAt: now } : l
          ),
        () =>
          supabase
            .from("saved_leads")
            .update({ notes, updated_at: now })
            .eq("user_id", user!.id)
            .eq("permit_id", permitId),
        "Could not save your note. Please try again."
      );
    },
    [mutate, supabase, user]
  );

  const isLeadSaved = useCallback(
    (permitId: string) => leads.some((l) => l.permitId === permitId),
    [leads]
  );

  const getLeadForPermit = useCallback(
    (permitId: string) => leads.find((l) => l.permitId === permitId),
    [leads]
  );

  const canSaveMore = useCallback(
    (isPaid: boolean) => isPaid || leads.length < FREE_LIMIT,
    [leads]
  );

  /**
   * Downloads every saved lead, not just the ones on screen. The file is built
   * by the server so it covers the full list and applies contact entitlements.
   */
  const exportCSV = useCallback(async (): Promise<boolean> => {
    try {
      const res = await fetch("/api/leads/export");

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error ?? "Could not build your export. Please try again.");
        return false;
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = filenameFrom(res.headers.get("Content-Disposition"));
      anchor.click();
      URL.revokeObjectURL(url);
      setError(null);
      return true;
    } catch {
      setError("Could not reach the export service. Please try again.");
      return false;
    }
  }, []);

  const clearError = useCallback(() => setError(null), []);

  return (
    <LeadsContext.Provider
      value={{
        leads,
        isLoading,
        error,
        clearError,
        refresh,
        saveLead,
        removeLead,
        updateLeadStatus,
        updateLeadNotes,
        isLeadSaved,
        getLeadForPermit,
        canSaveMore,
        exportCSV,
      }}
    >
      {children}
    </LeadsContext.Provider>
  );
}

function filenameFrom(header: string | null): string {
  const match = header?.match(/filename="([^"]+)"/);
  return match?.[1] ?? "permitpulse-leads.csv";
}

export function useLeads() {
  const ctx = useContext(LeadsContext);
  if (!ctx) throw new Error("useLeads must be used within LeadsProvider");
  return ctx;
}
