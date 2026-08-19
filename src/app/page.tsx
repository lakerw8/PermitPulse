/* Hallmark · genre: modern-minimal · macrostructure: Stat-Led · design-system: design.md · designed-as-app */
"use client";

import Link from "next/link";
import { PermitCard } from "@/components/permit-card";
import { usePermits } from "@/lib/permits-context";
import { formatCurrency } from "@/lib/mock-data";
import { METROS } from "@/lib/types";
import { ArrowRight } from "lucide-react";

export default function HomePage() {
  const { permits } = usePermits();
  const recentPermits = permits.slice(0, 4);
  const totalValue = permits.reduce((sum, p) => sum + p.estimatedValue, 0);

  return (
    <div>
      {/* Stat-Led Hero — two-column: giant number left, qualifier right */}
      <section className="border-b border-border">
        <div className="mx-auto grid max-w-7xl gap-6 px-4 py-16 sm:px-6 sm:py-24 lg:grid-cols-[1fr_1fr] lg:items-end lg:gap-12 lg:px-8">
          <div>
            <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
              Live permit data
            </p>
            <div className="mt-3 font-heading text-[clamp(3.5rem,8vw,7rem)] font-bold leading-none tracking-tighter tabular-nums">
              {permits.length}
            </div>
            <p className="mt-2 font-heading text-xl font-medium tracking-tight text-foreground sm:text-2xl">
              commercial permits tracked across {METROS.length} metros.
            </p>
          </div>
          <div className="max-w-lg">
            <p className="text-base leading-relaxed text-muted-foreground">
              PermitPulse turns newly filed commercial building permits into
              trade-filtered leads with GC contact info. Reach decision-makers
              weeks before bid boards open.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/permits"
                className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-colors duration-200 hover:bg-primary/90"
              >
                Browse Permits
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
              <Link
                href="/pricing"
                className="inline-flex items-center rounded-full border border-border px-5 py-2.5 text-sm font-medium text-foreground transition-colors duration-200 hover:bg-muted"
              >
                Start Free Trial
              </Link>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              No credit card required to browse.
            </p>
          </div>
        </div>
      </section>

      {/* Supporting stat strip — tabular numerals, hairline dividers */}
      <section className="border-b border-border">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 divide-x divide-border sm:grid-cols-4">
            {[
              { value: `$${(totalValue / 1_000_000).toFixed(0)}M+`, label: "Total project value" },
              { value: String(METROS.length), label: "Metros covered" },
              { value: "10", label: "Trade categories" },
              { value: "Daily", label: "Data refresh" },
            ].map((stat) => (
              <div key={stat.label} className="px-4 py-5 sm:px-6">
                <div className="font-mono text-lg font-semibold tabular-nums">
                  {stat.value}
                </div>
                <div className="mt-0.5 text-xs text-muted-foreground">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Recent permits — asymmetric: label left, cards right */}
      <section className="py-14 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-8 lg:grid-cols-[240px_1fr] lg:gap-12">
            <div className="lg:pt-1">
              <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
                01 &mdash; Recent
              </p>
              <h2 className="mt-2 font-heading text-xl font-semibold tracking-tight">
                Latest filings
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Commercial permits from {METROS.length} metro areas including Chicago, LA, NYC, and more.
              </p>
              <Link
                href="/permits"
                className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary transition-colors duration-200 hover:text-primary/80"
              >
                View all permits
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {recentPermits.map((permit) => (
                <PermitCard key={permit.id} permit={permit} />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* How it works — step sequence (F4), not a 3-column grid */}
      <section className="border-t border-border py-14 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-8 lg:grid-cols-[240px_1fr] lg:gap-12">
            <div className="lg:pt-1">
              <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
                02 &mdash; Process
              </p>
              <h2 className="mt-2 font-heading text-xl font-semibold tracking-tight">
                How it works
              </h2>
            </div>
            <div className="grid gap-0 divide-y divide-border">
              {[
                {
                  step: "1.0",
                  title: "Browse & Filter",
                  description:
                    "See new commercial permits filed in your metro. Filter by trade, project value, status, and keywords to find the work that fits your crew.",
                },
                {
                  step: "2.0",
                  title: "Unlock GC Contacts",
                  description:
                    "Get the General Contractor's name, phone number, and email. Our enrichment engine finds the right decision-maker on every permit.",
                },
                {
                  step: "3.0",
                  title: "Win More Work",
                  description:
                    "Reach out to GCs weeks before projects hit public bid boards. Build relationships early and win more bids.",
                },
              ].map((item) => (
                <div key={item.step} className="grid gap-2 py-6 sm:grid-cols-[80px_1fr] sm:gap-6">
                  <span className="font-mono text-sm text-muted-foreground tabular-nums">
                    {item.step}
                  </span>
                  <div>
                    <h3 className="font-heading text-base font-semibold tracking-tight">
                      {item.title}
                    </h3>
                    <p className="mt-1 max-w-xl text-sm leading-relaxed text-muted-foreground">
                      {item.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA — single line, single button */}
      <section className="border-t border-border py-14 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-start gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-heading text-xl font-semibold tracking-tight sm:text-2xl">
                Stop missing commercial projects.
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                7-day free trial. No credit card required.
              </p>
            </div>
            <Link
              href="/pricing"
              className="inline-flex shrink-0 items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-colors duration-200 hover:bg-primary/90"
            >
              Start Free Trial
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
