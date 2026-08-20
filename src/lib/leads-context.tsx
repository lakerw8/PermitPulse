"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { createClient } from "./supabase-browser";
import { useAuth } from "./auth-context";
import type { LeadStatus, Permit } from "./types";

export interface SavedLead {
  permitId: string;
  status: LeadStatus;
  notes: string;
  savedAt: string;
  updatedAt: string;
}

interface LeadsContextValue {
  leads: SavedLead[];
  saveLead: (permitId: string) => Promise<boolean>;
  removeLead: (permitId: string) => void;
  updateLeadStatus: (permitId: string, status: LeadStatus) => void;
  updateLeadNotes: (permitId: string, notes: string) => void;
  isLeadSaved: (permitId: string) => boolean;
  getLeadForPermit: (permitId: string) => SavedLead | undefined;
  canSaveMore: (isPaid: boolean) => boolean;
  exportCSV: (permits: Permit[]) => void;
}

const LeadsContext = createContext<LeadsContextValue | null>(null);

const FREE_LIMIT = 5;

interface DbLead {
  permit_id: string;
  status: string;
  notes: string;
  saved_at: string;
  updated_at: string;
}

function dbToLead(row: DbLead): SavedLead {
  return {
    permitId: row.permit_id,
    status: row.status as LeadStatus,
    notes: row.notes,
    savedAt: row.saved_at,
    updatedAt: row.updated_at,
  };
}

export function LeadsProvider({ children }: { children: ReactNode }) {
  const [leads, setLeads] = useState<SavedLead[]>([]);
  const [loaded, setLoaded] = useState(false);
  const { user } = useAuth();
  const [supabase] = useState(() => createClient());

  useEffect(() => {
    if (!user) {
      setLeads([]);
      setLoaded(true);
      return;
    }

    supabase
      .from("saved_leads")
      .select("permit_id, status, notes, saved_at, updated_at")
      .eq("user_id", user.id)
      .order("saved_at", { ascending: false })
      .then(({ data }) => {
        if (data) {
          setLeads(data.map(dbToLead));
        }
        setLoaded(true);
      });
  }, [user, supabase]);

  const saveLead = useCallback(
    async (permitId: string): Promise<boolean> => {
      if (leads.some((l) => l.permitId === permitId)) return false;
      if (!user) return false;

      const now = new Date().toISOString();
      const { error } = await supabase.from("saved_leads").insert({
        user_id: user.id,
        permit_id: permitId,
        status: "Saved",
        notes: "",
        saved_at: now,
        updated_at: now,
      });

      if (error) return false;

      setLeads((prev) => [
        { permitId, status: "Saved", notes: "", savedAt: now, updatedAt: now },
        ...prev,
      ]);
      return true;
    },
    [leads, user, supabase]
  );

  const removeLead = useCallback(
    (permitId: string) => {
      setLeads((prev) => prev.filter((l) => l.permitId !== permitId));
      if (user) {
        supabase
          .from("saved_leads")
          .delete()
          .eq("user_id", user.id)
          .eq("permit_id", permitId)
          .then(() => {});
      }
    },
    [user, supabase]
  );

  const updateLeadStatus = useCallback(
    (permitId: string, status: LeadStatus) => {
      const now = new Date().toISOString();
      setLeads((prev) =>
        prev.map((l) =>
          l.permitId === permitId ? { ...l, status, updatedAt: now } : l
        )
      );
      if (user) {
        supabase
          .from("saved_leads")
          .update({ status, updated_at: now })
          .eq("user_id", user.id)
          .eq("permit_id", permitId)
          .then(() => {});
      }
    },
    [user, supabase]
  );

  const updateLeadNotes = useCallback(
    (permitId: string, notes: string) => {
      const now = new Date().toISOString();
      setLeads((prev) =>
        prev.map((l) =>
          l.permitId === permitId ? { ...l, notes, updatedAt: now } : l
        )
      );
      if (user) {
        supabase
          .from("saved_leads")
          .update({ notes, updated_at: now })
          .eq("user_id", user.id)
          .eq("permit_id", permitId)
          .then(() => {});
      }
    },
    [user, supabase]
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

  const exportCSV = useCallback(
    (permits: Permit[]) => {
      const savedPermitIds = new Set(leads.map((l) => l.permitId));
      const savedPermits = permits.filter((p) => savedPermitIds.has(p.id));

      const headers = [
        "Permit Number",
        "Address",
        "City",
        "State",
        "Filing Date",
        "Description",
        "Estimated Value",
        "Status",
        "Trades",
        "GC Company",
        "GC Contact",
        "GC Phone",
        "GC Email",
        "Lead Status",
        "Notes",
        "Saved At",
      ];

      const rows = savedPermits.map((p) => {
        const lead = leads.find((l) => l.permitId === p.id);
        return [
          p.permitNumber,
          p.address,
          p.city,
          p.state,
          p.filingDate,
          `"${p.description.replace(/"/g, '""')}"`,
          p.estimatedValue.toString(),
          p.status,
          p.trades.join("; "),
          p.gcContact.companyName,
          p.gcContact.contactName ?? "",
          p.gcContact.phone ?? "",
          p.gcContact.email ?? "",
          lead?.status ?? "",
          `"${(lead?.notes ?? "").replace(/"/g, '""')}"`,
          lead?.savedAt ?? "",
        ];
      });

      const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join(
        "\n"
      );
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `permitpulse-leads-${new Date().toISOString().split("T")[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    },
    [leads]
  );

  return (
    <LeadsContext.Provider
      value={{
        leads,
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

export function useLeads() {
  const ctx = useContext(LeadsContext);
  if (!ctx) throw new Error("useLeads must be used within LeadsProvider");
  return ctx;
}
