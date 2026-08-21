"use client";

import { Suspense, useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  Bookmark,
  DollarSign,
  Calendar,
  Lock,
  Trash2,
  Building2,
  Settings,
  Bell,
  Download,
  Crown,
  MapPin,
  Search,
} from "lucide-react";
import { useAuth, type Plan } from "@/lib/auth-context";
import { Skeleton } from "@/components/ui/skeleton";
import { useLeads } from "@/lib/leads-context";
import { formatCurrency } from "@/lib/format";
import { TRADES, METROS, type LeadStatus, type Trade } from "@/lib/types";
import { cn } from "@/lib/utils";

const STATUS_OPTIONS: {
  value: LeadStatus;
  label: string;
  color: string;
  dot: string;
}[] = [
  {
    value: "Saved",
    label: "Saved",
    color:
      "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
    dot: "bg-blue-500",
  },
  {
    value: "Contacted",
    label: "Contacted",
    color:
      "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
    dot: "bg-green-500",
  },
  {
    value: "Won",
    label: "Won",
    color:
      "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
    dot: "bg-amber-500",
  },
  {
    value: "Not Relevant",
    label: "Not Relevant",
    color:
      "bg-gray-100 text-gray-800 dark:bg-gray-900/40 dark:text-gray-300",
    dot: "bg-gray-400",
  },
];

const TRADE_COLORS: Record<string, string> = {
  HVAC: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
  Electrical:
    "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  Plumbing:
    "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/40 dark:text-cyan-300",
  Roofing:
    "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300",
  "Fire Suppression":
    "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
  "Glass & Glazing":
    "bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300",
  Concrete:
    "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300",
  "Structural Steel":
    "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300",
  Demolition:
    "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300",
  "General Construction":
    "bg-gray-100 text-gray-800 dark:bg-gray-900/40 dark:text-gray-300",
};

const PLAN_LABELS: Record<Plan, string> = {
  free: "Free",
  paid: "Pro ($79/mo)",
};

export default function DashboardPage() {
  return (
    <Suspense>
      <DashboardContent />
    </Suspense>
  );
}

function DashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isPaid, updateUser, refreshProfile, isLoading } = useAuth();
  const {
    leads,
    isLoading: leadsLoading,
    error: leadsError,
    clearError,
    removeLead,
    updateLeadStatus,
    updateLeadNotes,
    exportCSV,
  } = useLeads();
  const [editingNotes, setEditingNotes] = useState<string | null>(null);
  const [notesDraft, setNotesDraft] = useState("");
  const [billingBusy, setBillingBusy] = useState(false);
  const [billingError, setBillingError] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading && !user) router.replace("/login");
  }, [isLoading, user, router]);

  // Stripe redirects back here the moment Checkout completes, which is usually
  // before the webhook lands. Reconcile once so the user is not shown "free"
  // seconds after paying.
  const checkoutStatus = searchParams.get("checkout");
  useEffect(() => {
    if (checkoutStatus !== "success") return;
    let cancelled = false;
    fetch("/api/billing/reconcile", { method: "POST" })
      .then(() => {
        if (!cancelled) return refreshProfile();
      })
      .catch(() => {
        // The webhook is the durable path; a failure here only delays the UI.
      });
    return () => {
      cancelled = true;
    };
  }, [checkoutStatus, refreshProfile]);

  if (isLoading || !user) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <div className="mb-6 flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-7 w-40" />
            <Skeleton className="h-4 w-56" />
          </div>
          <Skeleton className="h-6 w-28 rounded-full" />
        </div>
        <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className={cn(
                "rounded-lg border p-3 text-center",
                i === 4 && "col-span-2 sm:col-span-1"
              )}
            >
              <Skeleton className="mx-auto h-6 w-12" />
              <Skeleton className="mx-auto mt-1.5 h-3 w-16" />
            </div>
          ))}
        </div>
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-lg border p-4">
              <div className="space-y-2.5">
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-3 w-1/3" />
                <div className="flex gap-1.5">
                  <Skeleton className="h-5 w-14 rounded-full" />
                  <Skeleton className="h-5 w-16 rounded-full" />
                  <Skeleton className="h-5 w-14 rounded-full" />
                </div>
                <div className="flex gap-3">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-3 w-28" />
                  <Skeleton className="h-3 w-16" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Each lead arrives from /api/leads with its permit already attached, so the
  // list no longer depends on what the browse view happens to be holding.
  const savedPermits = leads.map((lead) => ({ lead, permit: lead.permit }));

  const totalValue = savedPermits.reduce(
    (sum, { permit }) => sum + (permit?.estimatedValue ?? 0),
    0
  );

  const statusCounts = STATUS_OPTIONS.map((opt) => ({
    ...opt,
    count: leads.filter((l) => l.status === opt.value).length,
  }));

  function startEditNotes(permitId: string, currentNotes: string) {
    setEditingNotes(permitId);
    setNotesDraft(currentNotes);
  }

  function handleNotesBlur(permitId: string) {
    void updateLeadNotes(permitId, notesDraft);
    setEditingNotes(null);
  }

  /**
   * Trials start in Stripe, never in the browser. The previous version wrote
   * `plan: "paid"` straight to the profile, which meant anyone could grant
   * themselves the paid tier from the client.
   */
  async function handleStartTrial() {
    setBillingBusy(true);
    try {
      const res = await fetch("/api/checkout", { method: "POST" });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
        return;
      }
      setBillingError(data.error ?? "Could not start checkout");
    } catch {
      setBillingError("Could not reach checkout. Please try again.");
    } finally {
      setBillingBusy(false);
    }
  }

  async function handleManageBilling() {
    setBillingBusy(true);
    try {
      const res = await fetch("/api/billing/portal", { method: "POST" });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
        return;
      }
      setBillingError(data.error ?? "Could not open the billing portal");
    } catch {
      setBillingError("Could not reach the billing portal. Please try again.");
    } finally {
      setBillingBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage your saved leads and account
          </p>
        </div>
        <Badge variant={isPaid ? "default" : "secondary"} className="text-sm">
          {isPaid && <Crown className="mr-1 h-3 w-3" />}
          {PLAN_LABELS[user.plan]}
        </Badge>
      </div>

      <Tabs defaultValue="leads">
        <TabsList>
          <TabsTrigger value="leads">
            <Bookmark className="mr-1.5 h-3.5 w-3.5" />
            Saved Leads ({leads.length})
          </TabsTrigger>
          <TabsTrigger value="settings">
            <Settings className="mr-1.5 h-3.5 w-3.5" />
            Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="leads" className="mt-4">
          {/* Stats row */}
          <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            <Card className="gap-0 py-0">
              <CardContent className="p-3 text-center">
                <div className="text-2xl font-bold tabular-nums">
                  {leads.length}
                </div>
                <div className="text-xs text-muted-foreground">Total Leads</div>
              </CardContent>
            </Card>
            {statusCounts
              .filter((s) => s.value !== "Not Relevant")
              .map((s) => (
                <Card key={s.value} className="gap-0 py-0">
                  <CardContent className="p-3 text-center">
                    <div className="text-xl font-bold tabular-nums">
                      {s.count}
                    </div>
                    <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
                      <span
                        className={cn("h-1.5 w-1.5 rounded-full", s.dot)}
                      />
                      {s.label}
                    </div>
                  </CardContent>
                </Card>
              ))}
            <Card className="col-span-2 gap-0 py-0 sm:col-span-1">
              <CardContent className="p-3 text-center">
                <div className="text-lg font-bold tabular-nums tracking-tight">
                  {formatCurrency(totalValue)}
                </div>
                <div className="text-xs text-muted-foreground">
                  Pipeline Value
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Free account limit warning */}
          {!isPaid && (
            <div className="mb-4 flex items-center justify-between rounded-lg border border-border bg-muted/50 px-4 py-2.5 dark:border-border">
              <span className="text-sm text-foreground">
                {leads.length}/5 leads saved (free account limit)
              </span>
              <Button
                size="sm"
                variant="outline"
                className="text-xs"
                onClick={handleStartTrial}
              >
                Start free trial
              </Button>
            </div>
          )}

          {/* Mutation and load failures. Silent failure is what this replaces:
              a rejected write used to leave the row looking saved. */}
          {leadsError && (
            <div className="mb-4 flex items-start justify-between gap-3 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-2.5">
              <span className="text-sm text-destructive">{leadsError}</span>
              <button
                onClick={clearError}
                className="shrink-0 text-xs font-medium text-destructive hover:underline"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* Lead list */}
          {leadsLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="rounded-lg border p-4">
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="mt-2 h-3 w-1/3" />
                  <Skeleton className="mt-3 h-5 w-40 rounded-full" />
                </div>
              ))}
            </div>
          ) : savedPermits.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed px-4 py-16 text-center">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                <Search className="h-5 w-5 text-muted-foreground" />
              </div>
              <h3 className="mt-3 text-sm font-semibold">
                No saved leads yet
              </h3>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                Browse active building permits and save the ones that match your
                trade to start building your pipeline.
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-4"
                nativeButton={false}
                render={<Link href="/permits" />}
              >
                Browse permits
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {savedPermits.map(({ lead, permit }) => (
                <Card key={lead.permitId} className="gap-0 py-0">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1 space-y-2.5">
                        {/* Address and city */}
                        {permit ? (
                          <div>
                            <Link
                              href={`/permits/${permit.id}`}
                              className="text-sm font-semibold hover:underline"
                            >
                              {permit.address}
                            </Link>
                            <div className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                              <MapPin className="h-3 w-3 shrink-0" />
                              <span>
                                {permit.city}, {permit.state}
                              </span>
                            </div>
                          </div>
                        ) : (
                          <div>
                            <p className="text-sm font-semibold">
                              Permit record unavailable
                            </p>
                            <p className="mt-0.5 text-xs text-muted-foreground">
                              The source stopped publishing this permit. Your
                              status and notes are kept.
                            </p>
                          </div>
                        )}

                        {/* Status buttons */}
                        <div className="flex flex-wrap items-center gap-1">
                          {STATUS_OPTIONS.map((opt) => (
                            <button
                              key={opt.value}
                              onClick={() =>
                                void updateLeadStatus(lead.permitId, opt.value)
                              }
                              className={cn(
                                "rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors",
                                lead.status === opt.value
                                  ? opt.color
                                  : "text-muted-foreground hover:bg-muted"
                              )}
                            >
                              {opt.label}
                            </button>
                          ))}
                        </div>

                        {/* Trades */}
                        {permit && (
                        <div className="flex flex-wrap gap-1">
                          {permit.trades.map((trade) => (
                            <span
                              key={trade}
                              className={cn(
                                "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                                TRADE_COLORS[trade] ??
                                  "bg-gray-100 text-gray-800 dark:bg-gray-900/40 dark:text-gray-300"
                              )}
                            >
                              {trade}
                            </span>
                          ))}
                        </div>
                        )}

                        {/* Metadata row */}
                        {permit && (
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground tabular-nums">
                          <span className="flex items-center gap-1">
                            <DollarSign className="h-3 w-3" />
                            {formatCurrency(permit.estimatedValue)}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            Filed{" "}
                            {new Date(permit.filingDate).toLocaleDateString(
                              "en-US",
                              {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              }
                            )}
                          </span>
                          <span className="text-muted-foreground/60">
                            #{permit.permitNumber}
                          </span>
                        </div>
                        )}

                        {/* Notes — auto-saves on blur */}
                        {editingNotes === lead.permitId ? (
                          <Textarea
                            value={notesDraft}
                            onChange={(e) => setNotesDraft(e.target.value)}
                            onBlur={() => handleNotesBlur(lead.permitId)}
                            placeholder="Add notes about this lead..."
                            className="min-h-[60px] text-xs"
                            autoFocus
                          />
                        ) : (
                          <button
                            onClick={() =>
                              startEditNotes(lead.permitId, lead.notes)
                            }
                            className="w-full text-left"
                          >
                            {lead.notes ? (
                              <p className="rounded bg-muted/50 px-2 py-1.5 text-xs italic text-muted-foreground transition-colors hover:bg-muted">
                                {lead.notes}
                              </p>
                            ) : (
                              <p className="rounded border border-dashed px-2 py-1.5 text-xs text-muted-foreground/50 transition-colors hover:border-foreground/20">
                                Click to add notes...
                              </p>
                            )}
                          </button>
                        )}

                        {/* GC contact */}
                        {permit &&
                          (permit.gcContact.locked ? (
                            <div className="flex items-center gap-1.5 text-xs text-primary">
                              <Lock className="h-3 w-3" />
                              <span>
                                {permit.gcContact.available?.companyName
                                  ? "GC contact locked"
                                  : "No GC named on this permit"}
                              </span>
                              {permit.gcContact.available?.companyName && (
                                <>
                                  <span className="text-muted-foreground">
                                    &middot;
                                  </span>
                                  <button
                                    onClick={handleStartTrial}
                                    className="font-medium hover:underline"
                                  >
                                    Start trial to unlock
                                  </button>
                                </>
                              )}
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5 text-xs text-green-600 dark:text-green-400">
                              <Building2 className="h-3 w-3" />
                              <span>{permit.gcContact.companyName}</span>
                              {permit.gcContact.phone && (
                                <>
                                  <span className="text-muted-foreground">
                                    &middot;
                                  </span>
                                  <span>{permit.gcContact.phone}</span>
                                </>
                              )}
                            </div>
                          ))}
                      </div>

                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 shrink-0"
                        onClick={() => void removeLead(lead.permitId)}
                      >
                        <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Export */}
          <div className="mt-6 flex items-center justify-between rounded-lg border border-dashed p-4">
            <div>
              <div className="flex items-center gap-2 text-sm font-medium">
                <Download className="h-4 w-4" />
                Export to CSV
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {isPaid
                  ? `Export all ${leads.length} saved leads with full GC contacts`
                  : "Available on paid plans"}
              </p>
            </div>
            {isPaid ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => void exportCSV()}
                disabled={leads.length === 0}
              >
                <Download className="mr-1 h-3.5 w-3.5" />
                Export
              </Button>
            ) : (
              <Button variant="outline" size="sm" onClick={handleStartTrial}>
                Start Trial
              </Button>
            )}
          </div>
        </TabsContent>

        <TabsContent value="settings" className="mt-4">
          <div className="max-w-xl space-y-6">
            <Card className="gap-0 py-0">
              <CardContent className="p-5">
                <h3 className="text-sm font-semibold">Account</h3>
                <div className="mt-3 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Email</span>
                    <span>{user.email}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Plan</span>
                    <span>{PLAN_LABELS[user.plan]}</span>
                  </div>
                  {user.trialEndsAt && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Trial ends</span>
                      <span>
                        {new Date(user.trialEndsAt).toLocaleDateString(
                          "en-US",
                          {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          }
                        )}
                      </span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="gap-0 py-0">
              <CardContent className="p-5">
                <h3 className="text-sm font-semibold">Billing</h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  {isPaid
                    ? "Update your payment method, download invoices, or cancel."
                    : "Start a 7-day free trial through Stripe. Cancel any time."}
                </p>
                {user.cancelAtPeriodEnd && user.currentPeriodEnd && (
                  <p className="mt-2 text-xs text-amber-700 dark:text-amber-400">
                    Access ends{" "}
                    {new Date(user.currentPeriodEnd).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                    .
                  </p>
                )}
                {billingError && (
                  <p className="mt-2 text-xs text-destructive">{billingError}</p>
                )}
                <div className="mt-3">
                  <Button
                    size="sm"
                    variant={isPaid ? "outline" : "default"}
                    className="text-xs"
                    disabled={billingBusy}
                    onClick={isPaid ? handleManageBilling : handleStartTrial}
                  >
                    {billingBusy
                      ? "Opening Stripe\u2026"
                      : isPaid
                        ? "Manage billing"
                        : "Start 7-day free trial"}
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="gap-0 py-0">
              <CardContent className="p-5">
                <h3 className="text-sm font-semibold">Preferences</h3>
                <div className="mt-3 space-y-3">
                  <div>
                    <label className="mb-1 block text-xs text-muted-foreground">
                      Metro
                    </label>
                    <select
                      value={user.metro}
                      onChange={(e) => updateUser({ metro: e.target.value })}
                      className="w-full rounded-md border bg-background px-3 py-1.5 text-sm"
                    >
                      {METROS.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-muted-foreground">
                      Primary Trade
                    </label>
                    <select
                      value={user.primaryTrade ?? ""}
                      onChange={(e) =>
                        updateUser({
                          primaryTrade: (e.target.value || null) as Trade | null,
                        })
                      }
                      className="w-full rounded-md border bg-background px-3 py-1.5 text-sm"
                    >
                      <option value="">Select a trade</option>
                      {TRADES.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="gap-0 py-0">
              <CardContent className="p-5">
                <div className="flex items-center gap-2">
                  <Bell className="h-4 w-4" />
                  <h3 className="text-sm font-semibold">Alerts</h3>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Email alerts for{" "}
                  {METROS.find((m) => m.id === user.metro)?.label || user.metro}
                  {user.primaryTrade && ` · ${user.primaryTrade}`} are not
                  available yet. The preferences above are saved and will be used
                  when they launch.
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
