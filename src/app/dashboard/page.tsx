"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import {
  Bookmark,
  ArrowRight,
  DollarSign,
  Calendar,
  Lock,
  Trash2,
  Building2,
  Settings,
  Bell,
  Download,
  Crown,
  Check,
  RefreshCw,
} from "lucide-react";
import { useAuth, type Plan } from "@/lib/auth-context";
import { useLeads } from "@/lib/leads-context";
import { usePermits } from "@/lib/permits-context";
import { formatCurrency } from "@/lib/mock-data";
import { TRADES, type LeadStatus, type Trade } from "@/lib/types";

const STATUS_OPTIONS: { value: LeadStatus; label: string; color: string }[] = [
  { value: "Saved", label: "Saved", color: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300" },
  { value: "Contacted", label: "Contacted", color: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300" },
  { value: "Not Relevant", label: "Not Relevant", color: "bg-gray-100 text-gray-800 dark:bg-gray-900/40 dark:text-gray-300" },
  { value: "Won", label: "Won", color: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300" },
];

const PLAN_LABELS: Record<Plan, string> = {
  free: "Free Account",
  starter: "Starter ($199/mo)",
  pro: "Pro ($349/mo)",
  growth: "Growth ($499/mo)",
};

export default function DashboardPage() {
  const router = useRouter();
  const { user, isPaid, updateUser, isLoading } = useAuth();
  const { leads, removeLead, updateLeadStatus, updateLeadNotes, exportCSV } = useLeads();
  const { permits } = usePermits();
  const [editingNotes, setEditingNotes] = useState<string | null>(null);
  const [notesDraft, setNotesDraft] = useState("");

  useEffect(() => {
    if (!isLoading && !user) router.replace("/login");
  }, [isLoading, user, router]);

  if (isLoading || !user) return null;

  const savedPermits = leads.map((lead) => ({
    lead,
    permit: permits.find((p) => p.id === lead.permitId),
  })).filter((item) => item.permit !== undefined);

  function startEditNotes(permitId: string, currentNotes: string) {
    setEditingNotes(permitId);
    setNotesDraft(currentNotes);
  }

  function saveNotes(permitId: string) {
    updateLeadNotes(permitId, notesDraft);
    setEditingNotes(null);
  }

  function handleStartTrial() {
    const trialEnd = new Date();
    trialEnd.setDate(trialEnd.getDate() + 7);
    updateUser({ plan: "starter", trialEndsAt: trialEnd.toISOString() });
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
          {/* Stats */}
          <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: "Saved", count: leads.filter((l) => l.status === "Saved").length },
              { label: "Contacted", count: leads.filter((l) => l.status === "Contacted").length },
              { label: "Won", count: leads.filter((l) => l.status === "Won").length },
              { label: "Total", count: leads.length },
            ].map((s) => (
              <Card key={s.label} className="gap-0 py-0">
                <CardContent className="p-3 text-center">
                  <div className="text-xl font-bold">{s.count}</div>
                  <div className="text-xs text-muted-foreground">{s.label}</div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Limit warning */}
          {!isPaid && (
            <div className="mb-4 flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 dark:border-amber-800 dark:bg-amber-950/30">
              <span className="text-sm text-amber-800 dark:text-amber-200">
                {leads.length}/15 leads saved (free account limit)
              </span>
              <Button size="sm" variant="outline" className="text-xs" onClick={handleStartTrial}>
                Start free trial
              </Button>
            </div>
          )}

          {/* Lead list */}
          {savedPermits.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16">
              <Bookmark className="mb-2 h-6 w-6 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">No saved leads yet</p>
              <Button variant="outline" size="sm" className="mt-3" nativeButton={false} render={<Link href="/permits" />}>
                Browse permits
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {savedPermits.map(({ lead, permit }) => (
                <Card key={lead.permitId} className="gap-0 py-0">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Link
                            href={`/permits/${permit!.id}`}
                            className="text-sm font-semibold hover:underline"
                          >
                            {permit!.address}
                          </Link>
                          <select
                            value={lead.status}
                            onChange={(e) =>
                              updateLeadStatus(lead.permitId, e.target.value as LeadStatus)
                            }
                            className={`rounded-full border-0 px-2 py-0.5 text-xs font-medium ${STATUS_OPTIONS.find((s) => s.value === lead.status)?.color}`}
                          >
                            {STATUS_OPTIONS.map((opt) => (
                              <option key={opt.value} value={opt.value}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                        </div>

                        <p className="mt-1 text-xs text-muted-foreground line-clamp-1">
                          {permit!.description}
                        </p>

                        <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <DollarSign className="h-3 w-3" />
                            {formatCurrency(permit!.estimatedValue)}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            Saved{" "}
                            {new Date(lead.savedAt).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                            })}
                          </span>
                          <span className="text-xs">
                            {permit!.trades.slice(0, 2).join(", ")}
                          </span>
                        </div>

                        {/* Notes */}
                        {editingNotes === lead.permitId ? (
                          <div className="mt-2 space-y-1.5">
                            <Textarea
                              value={notesDraft}
                              onChange={(e) => setNotesDraft(e.target.value)}
                              placeholder="Add notes about this lead..."
                              className="min-h-[60px] text-xs"
                              autoFocus
                            />
                            <div className="flex gap-1.5">
                              <Button
                                size="sm"
                                className="h-6 text-xs"
                                onClick={() => saveNotes(lead.permitId)}
                              >
                                Save
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 text-xs"
                                onClick={() => setEditingNotes(null)}
                              >
                                Cancel
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <button
                            onClick={() => startEditNotes(lead.permitId, lead.notes)}
                            className="mt-2 w-full text-left"
                          >
                            {lead.notes ? (
                              <p className="rounded bg-muted/50 px-2 py-1.5 text-xs italic text-muted-foreground hover:bg-muted transition-colors">
                                {lead.notes}
                              </p>
                            ) : (
                              <p className="rounded border border-dashed px-2 py-1.5 text-xs text-muted-foreground/50 hover:border-foreground/20 transition-colors">
                                Click to add notes...
                              </p>
                            )}
                          </button>
                        )}

                        {/* GC contact status */}
                        {isPaid ? (
                          <div className="mt-2 flex items-center gap-1.5 text-xs text-green-600 dark:text-green-400">
                            <Building2 className="h-3 w-3" />
                            <span>{permit!.gcContact.companyName}</span>
                            {permit!.gcContact.phone && (
                              <>
                                <span className="text-muted-foreground">&middot;</span>
                                <span>{permit!.gcContact.phone}</span>
                              </>
                            )}
                          </div>
                        ) : (
                          <div className="mt-2 flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400">
                            <Lock className="h-3 w-3" />
                            <span>GC contact locked</span>
                            <span className="text-muted-foreground">&middot;</span>
                            <button onClick={handleStartTrial} className="font-medium hover:underline">
                              Start trial to unlock
                            </button>
                          </div>
                        )}
                      </div>

                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 shrink-0"
                        onClick={() => removeLead(lead.permitId)}
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
                  ? `Export ${leads.length} saved leads with full GC contacts`
                  : "Available on paid plans"}
              </p>
            </div>
            {isPaid ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => exportCSV(permits)}
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
                        {new Date(user.trialEndsAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Plan simulator */}
            <Card className="gap-0 border-blue-200 bg-blue-50/50 py-0 dark:border-blue-800 dark:bg-blue-950/20">
              <CardContent className="p-5">
                <h3 className="text-sm font-semibold">Plan Simulator (Dev Mode)</h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  Switch plans to test the paywall experience
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {(["free", "starter", "pro", "growth"] as Plan[]).map((plan) => (
                    <Button
                      key={plan}
                      size="sm"
                      variant={user.plan === plan ? "default" : "outline"}
                      className="text-xs"
                      onClick={() => {
                        if (plan === "free") {
                          updateUser({ plan, trialEndsAt: null });
                        } else {
                          const trial = new Date();
                          trial.setDate(trial.getDate() + 7);
                          updateUser({ plan, trialEndsAt: trial.toISOString() });
                        }
                      }}
                    >
                      {plan === user.plan && <Check className="mr-1 h-3 w-3" />}
                      {plan.charAt(0).toUpperCase() + plan.slice(1)}
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="gap-0 py-0">
              <CardContent className="p-5">
                <h3 className="text-sm font-semibold">Preferences</h3>
                <div className="mt-3 space-y-3">
                  <div>
                    <label className="text-xs text-muted-foreground">Metro</label>
                    <p className="text-sm font-medium">{user.metro}</p>
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
                  <h3 className="text-sm font-semibold">Email Digest</h3>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Weekly digest for {user.metro}
                  {user.primaryTrade && ` · ${user.primaryTrade}`}
                </p>
                {!isPaid && (
                  <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">
                    GC contact details in digest require a paid plan
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
