"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  Bookmark,
  ArrowRight,
  MapPin,
  DollarSign,
  Calendar,
  Lock,
  Trash2,
  Building2,
  Settings,
  Bell,
  Download,
} from "lucide-react";
import { MOCK_PERMITS, formatCurrency } from "@/lib/mock-data";
import type { LeadStatus } from "@/lib/types";

const STATUS_OPTIONS: { value: LeadStatus; label: string; color: string }[] = [
  { value: "Saved", label: "Saved", color: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300" },
  { value: "Contacted", label: "Contacted", color: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300" },
  { value: "Not Relevant", label: "Not Relevant", color: "bg-gray-100 text-gray-800 dark:bg-gray-900/40 dark:text-gray-300" },
  { value: "Won", label: "Won", color: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300" },
];

const DEMO_SAVED = MOCK_PERMITS.slice(0, 4).map((p, i) => ({
  permit: p,
  status: (["Saved", "Contacted", "Saved", "Won"] as LeadStatus[])[i],
  notes: [
    "Looks like a great fit for our team. Follow up Monday.",
    "Called Mike on 8/14 - said RFQ going out next week.",
    "",
    "Won the HVAC sub! PO coming.",
  ][i],
  savedAt: p.filingDate,
}));

export default function DashboardPage() {
  const [savedLeads] = useState(DEMO_SAVED);

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage your saved leads and account
          </p>
        </div>
        <Badge variant="secondary" className="text-sm">
          Free Account
        </Badge>
      </div>

      <Tabs defaultValue="leads">
        <TabsList>
          <TabsTrigger value="leads">
            <Bookmark className="mr-1.5 h-3.5 w-3.5" />
            Saved Leads
          </TabsTrigger>
          <TabsTrigger value="settings">
            <Settings className="mr-1.5 h-3.5 w-3.5" />
            Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="leads" className="mt-4">
          {/* Stats bar */}
          <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: "Saved", count: savedLeads.filter((l) => l.status === "Saved").length },
              { label: "Contacted", count: savedLeads.filter((l) => l.status === "Contacted").length },
              { label: "Won", count: savedLeads.filter((l) => l.status === "Won").length },
              { label: "Total", count: savedLeads.length },
            ].map((s) => (
              <Card key={s.label} className="gap-0 py-0">
                <CardContent className="p-3 text-center">
                  <div className="text-xl font-bold">{s.count}</div>
                  <div className="text-xs text-muted-foreground">{s.label}</div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Lead limit warning */}
          <div className="mb-4 flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 dark:border-amber-800 dark:bg-amber-950/30">
            <span className="text-sm text-amber-800 dark:text-amber-200">
              {savedLeads.length}/15 leads saved (free account limit)
            </span>
            <Button size="sm" variant="outline" className="text-xs" render={<Link href="/pricing" />}>
              Upgrade for unlimited
            </Button>
          </div>

          {/* Lead list */}
          <div className="space-y-3">
            {savedLeads.map((lead) => (
              <Card key={lead.permit.id} className="gap-0 py-0">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/permits/${lead.permit.id}`}
                          className="text-sm font-semibold hover:underline"
                        >
                          {lead.permit.address}
                        </Link>
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_OPTIONS.find((s) => s.value === lead.status)?.color}`}
                        >
                          {lead.status}
                        </span>
                      </div>

                      <p className="mt-1 text-xs text-muted-foreground line-clamp-1">
                        {lead.permit.description}
                      </p>

                      <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <DollarSign className="h-3 w-3" />
                          {formatCurrency(lead.permit.estimatedValue)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          Saved{" "}
                          {new Date(lead.savedAt).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                          })}
                        </span>
                      </div>

                      {lead.notes && (
                        <p className="mt-2 rounded bg-muted/50 px-2 py-1.5 text-xs italic text-muted-foreground">
                          {lead.notes}
                        </p>
                      )}

                      {/* Locked GC contact */}
                      <div className="mt-2 flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400">
                        <Lock className="h-3 w-3" />
                        <span>GC contact locked</span>
                        <span className="text-muted-foreground">&middot;</span>
                        <Link href="/pricing" className="font-medium hover:underline">
                          Upgrade to unlock
                        </Link>
                      </div>
                    </div>

                    <div className="flex flex-col gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7">
                        <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Export CTA */}
          <div className="mt-6 flex items-center justify-between rounded-lg border border-dashed p-4">
            <div>
              <div className="flex items-center gap-2 text-sm font-medium">
                <Download className="h-4 w-4" />
                Export to CSV
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Available on paid plans
              </p>
            </div>
            <Button variant="outline" size="sm" render={<Link href="/pricing" />}>
              Upgrade
            </Button>
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
                    <span>demo@company.com</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Plan</span>
                    <span>Free</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="gap-0 py-0">
              <CardContent className="p-5">
                <h3 className="text-sm font-semibold">Preferences</h3>
                <div className="mt-3 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Metro</span>
                    <span>Chicago, IL</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Primary Trade</span>
                    <span>HVAC</span>
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
                  Weekly digest for Chicago, IL &middot; HVAC
                </p>
                <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">
                  GC contact details in digest require a paid plan
                </p>
              </CardContent>
            </Card>

            <Card className="gap-0 border-amber-200 bg-gradient-to-b from-amber-50 to-orange-50 py-0 dark:border-amber-800 dark:from-amber-950/30 dark:to-orange-950/20">
              <CardContent className="p-5 text-center">
                <Building2 className="mx-auto mb-2 h-6 w-6 text-amber-600 dark:text-amber-400" />
                <h3 className="text-sm font-semibold">Upgrade Your Account</h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  Unlock GC contacts, unlimited saves, CSV export, and more
                </p>
                <Button size="sm" className="mt-3" render={<Link href="/pricing" />}>
                    View Plans
                    <ArrowRight className="ml-1 h-3.5 w-3.5" />
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
