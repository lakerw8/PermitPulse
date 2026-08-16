import Link from "next/link";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { LockedContact } from "@/components/locked-contact";
import { MOCK_PERMITS, formatFullCurrency } from "@/lib/mock-data";
import {
  ArrowLeft,
  MapPin,
  Calendar,
  DollarSign,
  Hash,
  FileText,
  ExternalLink,
  Bookmark,
} from "lucide-react";

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

export default async function PermitDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const permit = MOCK_PERMITS.find((p) => p.id === id);

  if (!permit) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <div className="mb-6">
        <Button variant="ghost" size="sm" className="mb-4" render={<Link href="/permits" />}>
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back to permits
        </Button>

        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold sm:text-2xl">{permit.address}</h1>
              <Badge variant={STATUS_VARIANT[permit.status] ?? "outline"}>
                {permit.status}
              </Badge>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {permit.city}, {permit.state} {permit.zip}
            </p>
          </div>
          <Button variant="outline" size="sm">
            <Bookmark className="mr-1 h-3.5 w-3.5" />
            Save Lead
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          {/* Description */}
          <Card className="gap-0 py-0">
            <CardContent className="p-5">
              <div className="mb-3 flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <h2 className="text-sm font-semibold">Project Description</h2>
              </div>
              <p className="text-sm leading-relaxed">{permit.description}</p>
            </CardContent>
          </Card>

          {/* Details */}
          <Card className="gap-0 py-0">
            <CardContent className="p-5">
              <h2 className="mb-4 text-sm font-semibold">Permit Details</h2>
              <dl className="grid gap-3 sm:grid-cols-2">
                <div className="flex items-start gap-2">
                  <Hash className="mt-0.5 h-3.5 w-3.5 text-muted-foreground" />
                  <div>
                    <dt className="text-xs text-muted-foreground">Permit Number</dt>
                    <dd className="text-sm font-medium">{permit.permitNumber}</dd>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Calendar className="mt-0.5 h-3.5 w-3.5 text-muted-foreground" />
                  <div>
                    <dt className="text-xs text-muted-foreground">Filing Date</dt>
                    <dd className="text-sm font-medium">
                      {new Date(permit.filingDate).toLocaleDateString("en-US", {
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </dd>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <DollarSign className="mt-0.5 h-3.5 w-3.5 text-muted-foreground" />
                  <div>
                    <dt className="text-xs text-muted-foreground">Estimated Value</dt>
                    <dd className="text-sm font-medium">
                      {formatFullCurrency(permit.estimatedValue)}
                    </dd>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <MapPin className="mt-0.5 h-3.5 w-3.5 text-muted-foreground" />
                  <div>
                    <dt className="text-xs text-muted-foreground">Full Address</dt>
                    <dd className="text-sm font-medium">
                      {permit.address}, {permit.city}, {permit.state} {permit.zip}
                    </dd>
                  </div>
                </div>
              </dl>
            </CardContent>
          </Card>

          {/* GC Contact (locked) */}
          <LockedContact contact={permit.gcContact} />
        </div>

        <div className="space-y-4">
          {/* Trades */}
          <Card className="gap-0 py-0">
            <CardContent className="p-4">
              <h3 className="mb-3 text-sm font-semibold">Relevant Trades</h3>
              <div className="flex flex-wrap gap-1.5">
                {permit.trades.map((trade) => (
                  <span
                    key={trade}
                    className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${TRADE_COLORS[trade] ?? "bg-gray-100 text-gray-800"}`}
                  >
                    {trade}
                  </span>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Source */}
          <Card className="gap-0 py-0">
            <CardContent className="p-4">
              <h3 className="mb-3 text-sm font-semibold">Data Source</h3>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-xs text-muted-foreground">Source</span>
                  <p className="flex items-center gap-1 font-medium">
                    {permit.source}
                    <ExternalLink className="h-3 w-3 text-muted-foreground" />
                  </p>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">
                    Last Updated
                  </span>
                  <p className="font-medium">
                    {new Date(permit.sourceUpdatedAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Upgrade CTA */}
          <Card className="gap-0 border-amber-200 bg-gradient-to-b from-amber-50 to-orange-50 py-0 dark:border-amber-800 dark:from-amber-950/30 dark:to-orange-950/20">
            <CardContent className="p-4 text-center">
              <h3 className="text-sm font-semibold">
                Want to reach this GC?
              </h3>
              <p className="mt-1 text-xs text-muted-foreground">
                Unlock full contact details with a paid plan
              </p>
              <Button size="sm" className="mt-3 w-full" render={<Link href="/pricing" />}>
                Start 7-Day Free Trial
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
