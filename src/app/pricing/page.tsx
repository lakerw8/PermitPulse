"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowRight, Check, Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import {
  CITY_COUNT_LABEL,
  MARKET_COUNT_LABEL,
  TRADE_COUNT_LABEL,
} from "@/lib/coverage";

const FREE_FEATURES = [
  `Browse all permits across ${CITY_COUNT_LABEL}`,
  "Filter by trade, value & status",
  "Save up to 5 leads",
];

const PAID_FEATURES = [
  "Full GC name, phone & email",
  "Unlimited saved leads",
  "All cities & trade filters",
  "Weekly email digest with GC details",
  "CSV export",
];

const FAQS = [
  {
    q: "What data sources do you use?",
    a: "Official municipal open data portals that publish building permits daily in machine-readable formats.",
  },
  {
    q: "How accurate is the GC contact info?",
    a: "Each contact includes a confidence score (High, Medium, or Low). We extract names from permit records and enrich with public business data.",
  },
  {
    q: "Can I cancel anytime?",
    a: "Yes. No contracts. Cancel from your dashboard and keep access through the end of your billing period.",
  },
  {
    q: "How fresh is the data?",
    a: "New permits appear within 24–48 hours of being published on the city portal.",
  },
  {
    q: "What cities do you cover?",
    a: `${CITY_COUNT_LABEL} across ${MARKET_COUNT_LABEL} in the US, including Chicago, Austin, San Francisco, Seattle, New York, and many more.`,
  },
];

export default function PricingPage() {
  const { user, isPaid } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleCheckout() {
    if (!user) {
      router.push("/login?redirect=/pricing");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
      <div className="mx-auto max-w-xl text-center">
        <h1 className="font-heading text-3xl font-semibold tracking-tight sm:text-4xl">
          Pricing
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Find the lead for free. Pay to reach them.
        </p>
      </div>

      <div className="mx-auto mt-10 grid max-w-3xl gap-4 sm:grid-cols-2">
        {/* Free tier */}
        <div className="rounded-lg border border-border p-6">
          <h3 className="font-heading text-base font-semibold tracking-tight">
            Free
          </h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Browse permits, find opportunities
          </p>

          <div className="mt-4 flex items-baseline gap-1">
            <span className="font-heading text-3xl font-bold tracking-tight">
              $0
            </span>
            <span className="text-sm text-muted-foreground">/forever</span>
          </div>

          <ul className="mt-5 space-y-2.5">
            {FREE_FEATURES.map((feature) => (
              <li key={feature} className="flex items-start gap-2 text-sm">
                <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <span>{feature}</span>
              </li>
            ))}
          </ul>

          <Button
            className="mt-6 w-full rounded-full"
            variant="outline"
            size="sm"
            nativeButton={false}
            render={<Link href="/login" />}
          >
            Get Started
          </Button>
        </div>

        {/* Paid tier */}
        <div className="relative overflow-visible rounded-lg border border-primary p-6 ring-1 ring-primary/20">
          <span className="absolute -top-2.5 left-4 rounded-full bg-primary px-2.5 py-0.5 text-[11px] font-medium text-primary-foreground">
            Full Access
          </span>

          <h3 className="font-heading text-base font-semibold tracking-tight">
            Pro
          </h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Unlock GC contacts and win more work
          </p>

          <div className="mt-4 flex items-baseline gap-1">
            <span className="font-heading text-3xl font-bold tracking-tight tabular-nums">
              $79
            </span>
            <span className="text-sm text-muted-foreground">/mo</span>
          </div>

          <p className="mt-1.5 text-xs text-muted-foreground">
            7-day free trial &middot; cancel anytime
          </p>

          <ul className="mt-5 space-y-2.5">
            {PAID_FEATURES.map((feature) => (
              <li key={feature} className="flex items-start gap-2 text-sm">
                <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                <span>{feature}</span>
              </li>
            ))}
          </ul>

          <Button
            className="mt-6 w-full rounded-full"
            variant="default"
            size="sm"
            disabled={isPaid || loading}
            onClick={handleCheckout}
          >
            {loading ? (
              <>
                <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                Redirecting&hellip;
              </>
            ) : isPaid ? (
              "Current Plan"
            ) : (
              <>
                Start Free Trial
                <ArrowRight className="ml-1 h-3.5 w-3.5" />
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Comparison */}
      <div className="mx-auto mt-14 max-w-3xl">
        <h2 className="font-heading text-base font-semibold tracking-tight">
          What&rsquo;s included
        </h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="pb-2.5 pr-6 text-left text-xs font-normal text-muted-foreground" />
                <th className="w-[100px] pb-2.5 text-center text-xs font-medium">
                  Free
                </th>
                <th className="w-[100px] pb-2.5 text-center text-xs font-medium">
                  Pro
                </th>
              </tr>
            </thead>
            <tbody>
              {[
                { label: "Browse all permits", free: true, paid: true },
                { label: "Search & filter", free: true, paid: true },
                { label: "Saved leads", free: "5", paid: "Unlimited" },
                { label: "GC contact info", free: false, paid: true },
                { label: "CSV export", free: false, paid: true },
                { label: "Weekly email digest", free: false, paid: true },
              ].map((row) => (
                <tr key={row.label} className="border-b border-border/50">
                  <td className="py-2.5 pr-6">{row.label}</td>
                  <td className="py-2.5 text-center">
                    {row.free === true ? (
                      <span className="text-foreground">{"✓"}</span>
                    ) : row.free === false ? (
                      <span className="text-muted-foreground/40">{"—"}</span>
                    ) : (
                      <span className="font-medium tabular-nums">
                        {row.free}
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 text-center">
                    {row.paid === true ? (
                      <span className="text-foreground">{"✓"}</span>
                    ) : (
                      <span className="font-medium tabular-nums">
                        {row.paid}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="mt-6 text-xs text-muted-foreground">
          <span className="font-medium text-foreground">
            Every account includes
          </span>{" "}
          Full permit history &middot; {CITY_COUNT_LABEL} &middot;{" "}
          {TRADE_COUNT_LABEL} &middot; Daily data refresh
        </p>
      </div>

      {/* FAQ */}
      <div className="mx-auto mt-14 max-w-3xl">
        <h2 className="font-heading text-base font-semibold tracking-tight">
          FAQ
        </h2>
        <div className="mt-5 divide-y divide-border">
          {FAQS.map((item) => (
            <div key={item.q} className="py-4">
              <h3 className="font-heading text-sm font-semibold tracking-tight">
                {item.q}
              </h3>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                {item.a}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
