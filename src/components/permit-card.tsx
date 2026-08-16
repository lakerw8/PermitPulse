import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  MapPin,
  Calendar,
  DollarSign,
  Lock,
  Building2,
} from "lucide-react";
import { Permit } from "@/lib/types";
import { formatCurrency } from "@/lib/mock-data";

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
  Concrete: "bg-stone-100 text-stone-800 dark:bg-stone-900/40 dark:text-stone-300",
  "Structural Steel": "bg-slate-100 text-slate-800 dark:bg-slate-900/40 dark:text-slate-300",
  Demolition: "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300",
  "General Construction": "bg-gray-100 text-gray-800 dark:bg-gray-900/40 dark:text-gray-300",
};

interface PermitCardProps {
  permit: Permit;
  showLockedContact?: boolean;
}

export function PermitCard({ permit, showLockedContact = true }: PermitCardProps) {
  return (
    <Link href={`/permits/${permit.id}`}>
      <Card className="gap-0 py-0 transition-all hover:shadow-md hover:border-foreground/20">
        <CardContent className="p-4 sm:p-5">
          <div className="flex flex-col gap-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{permit.address}, {permit.city}</span>
                </div>
                <p className="mt-1.5 text-sm leading-relaxed line-clamp-2">
                  {permit.description}
                </p>
              </div>
              <Badge variant={STATUS_VARIANT[permit.status] ?? "outline"} className="shrink-0 text-xs">
                {permit.status}
              </Badge>
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

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
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
              <span className="text-xs text-muted-foreground/70">
                #{permit.permitNumber}
              </span>
            </div>

            {showLockedContact && (
              <div className="flex items-center gap-2 rounded-md border border-dashed border-amber-300 bg-amber-50 px-3 py-2 dark:border-amber-700 dark:bg-amber-950/30">
                <Lock className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                <span className="text-xs font-medium text-amber-700 dark:text-amber-400">
                  <span className="blur-[4px] select-none" aria-hidden>
                    {permit.gcContact.companyName.slice(0, 8)}
                  </span>
                  {"... "}
                  <span className="text-amber-600 dark:text-amber-300">
                    Unlock GC contact
                  </span>
                </span>
                <Building2 className="ml-auto h-3.5 w-3.5 text-amber-500" />
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
