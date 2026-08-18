/* Hallmark · genre: modern-minimal · component: permit-card · design-system: design.md · designed-as-app */
"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import {
  MapPin,
  Calendar,
  DollarSign,
  Lock,
  Building2,
  Bookmark,
  BookmarkCheck,
} from "lucide-react";
import { Permit } from "@/lib/types";
import { formatCurrency } from "@/lib/mock-data";
import { useAuth } from "@/lib/auth-context";
import { useLeads } from "@/lib/leads-context";

const STATUS_VARIANT: Record<string, "default" | "secondary" | "outline"> = {
  Issued: "default",
  "Under Review": "secondary",
  Approved: "default",
  Completed: "outline",
};

const TRADE_COLORS: Record<string, string> = {
  HVAC: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
  Electrical: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  Plumbing: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/40 dark:text-cyan-300",
  Roofing: "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300",
  "Fire Suppression": "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
  "Glass & Glazing": "bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300",
  Concrete: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300",
  "Structural Steel": "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300",
  Demolition: "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300",
  "General Construction": "bg-gray-100 text-gray-800 dark:bg-gray-900/40 dark:text-gray-300",
};

interface PermitCardProps {
  permit: Permit;
  showLockedContact?: boolean;
}

export function PermitCard({ permit, showLockedContact = true }: PermitCardProps) {
  const { isPaid } = useAuth();
  const { isLeadSaved, saveLead, removeLead, canSaveMore } = useLeads();
  const saved = isLeadSaved(permit.id);

  function handleSaveToggle(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (saved) {
      removeLead(permit.id);
    } else if (canSaveMore(isPaid)) {
      saveLead(permit.id);
    }
  }

  return (
    <Link
      href={`/permits/${permit.id}`}
      className="block rounded-lg border border-border p-4 transition-colors duration-200 hover:border-foreground/20 sm:p-5"
    >
      <div className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <MapPin className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate font-medium">{permit.address}, {permit.city}</span>
            </div>
            <p className="mt-1 text-sm leading-relaxed line-clamp-2">
              {permit.description}
            </p>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={handleSaveToggle}
              className="rounded-md p-1 text-muted-foreground transition-colors duration-200 hover:bg-muted hover:text-foreground"
              title={saved ? "Remove from saved" : "Save lead"}
            >
              {saved ? (
                <BookmarkCheck className="h-4 w-4 text-primary" />
              ) : (
                <Bookmark className="h-4 w-4" />
              )}
            </button>
            <Badge variant={STATUS_VARIANT[permit.status] ?? "outline"} className="text-xs">
              {permit.status}
            </Badge>
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {permit.trades.map((trade) => (
            <span
              key={trade}
              className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${TRADE_COLORS[trade] ?? "bg-gray-100 text-gray-800"}`}
            >
              {trade}
            </span>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground tabular-nums">
          <span className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {new Date(permit.filingDate).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </span>
          <span className="flex items-center gap-1">
            <DollarSign className="h-3 w-3" />
            {formatCurrency(permit.estimatedValue)}
          </span>
          <span className="text-muted-foreground/60">
            #{permit.permitNumber}
          </span>
        </div>

        {showLockedContact && !isPaid && (
          <div className="flex items-center gap-2 rounded-md border border-dashed border-border bg-muted/50 px-3 py-2">
            <Lock className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground">
              <span className="blur-[4px] select-none" aria-hidden>
                {permit.gcContact.companyName.slice(0, 8)}
              </span>
              {"... "}
              <span className="text-primary">
                Unlock GC contact
              </span>
            </span>
            <Building2 className="ml-auto h-3.5 w-3.5 text-muted-foreground/60" />
          </div>
        )}

        {showLockedContact && isPaid && (
          <div className="flex items-center gap-2 rounded-md border border-green-200 bg-green-50 px-3 py-2 dark:border-green-800 dark:bg-green-950/30">
            <Building2 className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
            <span className="text-xs font-medium text-green-700 dark:text-green-400">
              {permit.gcContact.companyName}
              {permit.gcContact.phone && ` · ${permit.gcContact.phone}`}
            </span>
          </div>
        )}
      </div>
    </Link>
  );
}
