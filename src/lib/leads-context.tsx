"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
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
  saveLead: (permitId: string) => boolean;
  removeLead: (permitId: string) => void;
  updateLeadStatus: (permitId: string, status: LeadStatus) => void;
  updateLeadNotes: (permitId: string, notes: string) => void;
  isLeadSaved: (permitId: string) => boolean;
  getLeadForPermit: (permitId: string) => SavedLead | undefined;
  canSaveMore: (isPaid: boolean) => boolean;
  exportCSV: (permits: Permit[]) => void;
}

const LeadsContext = createContext<LeadsContextValue | null>(null);

const STORAGE_KEY = "permitpulse_leads";
const FREE_LIMIT = 15;

export function LeadsProvider({ children }: { children: ReactNode }) {
  const [leads, setLeads] = useState<SavedLead[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setLeads(JSON.parse(stored));
      }
    } catch {}
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (loaded) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(leads));
    }
  }, [leads, loaded]);

  const saveLead = useCallback(
    (permitId: string): boolean => {
      if (leads.some((l) => l.permitId === permitId)) return false;
      const now = new Date().toISOString();
      setLeads((prev) => [
        ...prev,
        {
          permitId,
          status: "Saved",
          notes: "",
          savedAt: now,
          updatedAt: now,
        },
      ]);
      return true;
    },
    [leads]
  );

  const removeLead = useCallback((permitId: string) => {
    setLeads((prev) => prev.filter((l) => l.permitId !== permitId));
  }, []);

  const updateLeadStatus = useCallback(
    (permitId: string, status: LeadStatus) => {
      setLeads((prev) =>
        prev.map((l) =>
          l.permitId === permitId
            ? { ...l, status, updatedAt: new Date().toISOString() }
            : l
        )
      );
    },
    []
  );

  const updateLeadNotes = useCallback(
    (permitId: string, notes: string) => {
      setLeads((prev) =>
        prev.map((l) =>
          l.permitId === permitId
            ? { ...l, notes, updatedAt: new Date().toISOString() }
            : l
        )
      );
    },
    []
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
