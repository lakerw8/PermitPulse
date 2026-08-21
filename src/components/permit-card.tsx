/* Hallmark · genre: modern-minimal · component: permit-card · design-system: design.md · designed-as-app */
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
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
import { formatCurrency } from "@/lib/format";
import { useAuth } from "@/lib/auth-context";
import { useLeads } from "@/lib/leads-context";

/**
 * Status is carried by weight and a hairline, not by fill. Cobalt stays
 * reserved for the controls the contractor acts on, per design.md.
 */
const STATUS_STYLES: Record<string, string> = {
  Issued: "border-foreground/25 text-foreground",
  "Under Review": "border-border text-muted-foreground",
  Approved: "border-foreground/25 text-foreground",
  Completed: "border-border text-muted-foreground/70",
};


interface PermitCardProps {
  permit: Permit;
  showLockedContact?: boolean;
}

export function PermitCard({ permit, showLockedContact = true }: PermitCardProps) {
  const { user, isPaid } = useAuth();
  const { isLeadSaved, saveLead, removeLead, canSaveMore } = useLeads();
  const router = useRouter();
  const saved = isLeadSaved(permit.id);

  function handleSaveToggle(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      router.push("/login");
      return;
    }
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
            <span
              className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${
                STATUS_STYLES[permit.status] ?? "border-border text-muted-foreground"
              }`}
            >
              {permit.status}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {permit.trades.map((trade) => (
            <span
              key={trade}
              className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground"
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
          <div className="flex items-center gap-2 rounded-md border border-primary/25 bg-primary/8 px-3 py-2">
            <Building2 className="h-3.5 w-3.5 text-primary" />
            <span className="text-xs font-medium text-primary">
              {permit.gcContact.companyName}
              {permit.gcContact.phone && ` · ${permit.gcContact.phone}`}
            </span>
          </div>
        )}
      </div>
    </Link>
  );
}
