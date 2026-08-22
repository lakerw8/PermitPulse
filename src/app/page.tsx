/* Hallmark · genre: modern-minimal · macrostructure: Stat-Led · design-system: design.md · designed-as-app */
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { PermitCard } from "@/components/permit-card";
import { type Permit } from "@/lib/types";
import { useCoverage, freshnessLabel } from "@/lib/use-coverage";
import { ArrowRight } from "lucide-react";

export default function HomePage() {
  const [recentPermits, setRecentPermits] = useState<Permit[]>([]);
  // Every number below comes from measured data. The hero used to print
  // METROS.length — the size of the picker — as "cities with live tracking",
  // which counted hundreds of cities that return nothing.
  const coverage = useCoverage();

  useEffect(() => {
    const params = new URLSearchParams({
      metros: "chicago,new-york,los-angeles,san-francisco",
      days: "30",
      limit: "4",
    });
    fetch(`/api/permits?${params}`)
      .then((r) => r.json())
      .then((data) => {
        setRecentPermits(data.permits ?? []);
      })
      .catch(() => {});
  }, []);

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
              {coverage ? coverage.operationalMarkets : "\u2014"}
            </div>
            <p className="mt-2 font-heading text-xl font-medium tracking-tight text-foreground sm:text-2xl">
              markets returning commercial permits right now.
            </p>
          </div>
          <div className="max-w-lg">
            <p className="text-base leading-relaxed text-muted-foreground">
              PermitPulse turns newly filed commercial building permits into
              trade-filtered leads, with whatever contractor contact details the
              city published. Reach GCs weeks before bid boards open.
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

      {/* Supporting stat strip */}
      <section className="border-b border-border">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 divide-x divide-border sm:grid-cols-4">
            {[
              {
                value: coverage ? coverage.cachedPermits.toLocaleString() : "\u2014",
                label: "Permits available now",
              },
              {
                value: coverage
                  ? `${coverage.operationalMarkets}/${coverage.configuredMarkets}`
                  : "\u2014",
                label: "Sources returning data",
              },
              {
                value: coverage
                  ? freshnessLabel(coverage.lastSuccessfulRefresh)
                  : "\u2014",
                label: "Sources last refreshed",
              },
              { value: "Free", label: "To browse" },
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
                Commercial permits from Chicago, LA, NYC and every other market
                currently returning data.
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
              {recentPermits.length > 0 ? (
                recentPermits.map((permit) => (
                  <PermitCard key={permit.id} permit={permit} />
                ))
              ) : (
                Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-40 animate-pulse rounded-lg bg-muted" />
                ))
              )}
            </div>
          </div>
        </div>
      </section>

      {/* How it works — step sequence */}
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
                    "See the contractor name, phone, and email the city published \u2014 and, before you pay, exactly which of those a permit holds. Many records name a contractor but no phone; we show you which is which instead of pretending every permit has one.",
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

      {/* Final CTA */}
      <section className="border-t border-border py-14 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-start gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-heading text-xl font-semibold tracking-tight sm:text-2xl">
                Stop missing commercial projects.
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                7-day free trial. Card required, cancel any time.
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
