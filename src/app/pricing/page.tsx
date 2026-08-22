"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowRight, Check, Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { MARKET_COUNT_LABEL, TRADE_COUNT_LABEL } from "@/lib/coverage";
import { useCoverage, marketCountLabel } from "@/lib/use-coverage";
import { CONFIDENCE_DEFINITIONS, CONFIDENCE_DISCLAIMER } from "@/lib/contact-confidence";

const FREE_FEATURES = [
  "Browse every permit we hold",
  "Filter by trade, value & status",
  "Save up to 5 leads",
];

/**
 * Each line has to describe something that ships today.
 *
 * "Full GC name, phone & email" became "where the city publishes them"
 * because most records do not: at the last measurement 48% of cached permits
 * named no contractor at all and 5% carried a phone number. "Weekly email
 * digest" was removed outright — no digest exists, and nothing sends email.
 */
const PAID_FEATURES = [
  "GC name, phone & email where the city publishes them",
  "Unlimited saved leads",
  "CSV export of every saved lead",
  "Cancel any time from your dashboard",
];

const FAQS = [
  {
    q: "What data sources do you use?",
    a: "Official municipal open data portals that publish building permits in machine-readable formats. We do not scrape private sites or buy third-party lists.",
  },
  {
    q: "How often will a permit actually have a phone number?",
    a: "Less often than you would like, and we would rather tell you up front. Most city portals publish a contractor name but no contact details. At our last measurement about half of cached permits named a contractor and roughly one in twenty carried a phone number. Every permit shows you what it holds before you spend time on it.",
  },
  {
    q: "What does the confidence label mean?",
    a: `It tells you which field of the city record the name came from. High: ${CONFIDENCE_DEFINITIONS.High.summary.toLowerCase()}. Medium: ${CONFIDENCE_DEFINITIONS.Medium.summary.toLowerCase()}, which is often the property owner rather than the GC. Low: ${CONFIDENCE_DEFINITIONS.Low.summary.toLowerCase()}. ${CONFIDENCE_DISCLAIMER}`,
  },
  {
    q: "Can I cancel anytime?",
    a: "Yes. No contracts. Open the billing portal from your dashboard to cancel, and you keep access through the end of the period you have paid for.",
  },
  {
    q: "How fresh is the data?",
    a: "Sources refresh on weekday mornings, so a permit generally appears within one to three business days of the city publishing it. The permits page shows when sources were last refreshed, so you are never guessing.",
  },
  {
    q: "How much history do you keep?",
    a: "Up to 90 days of filings, filterable down to the last 7, 14, or 30 days.",
  },
  {
    q: "What cities do you cover?",
    a: `The picker lists ${MARKET_COUNT_LABEL} across the US, including Chicago, Austin, San Francisco, Seattle, and New York. Not every listed city is returning data yet — the live count of markets currently returning permits is shown at the top of this page, and a market with no data shows as empty rather than pretending otherwise.`,
  },
];

export default function PricingPage() {
  const { user, isPaid } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const coverage = useCoverage();

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
        {/* Measured, not listed. This counts sources that returned permits at
            their last refresh, which is a smaller number than the picker
            shows — and the only one we are entitled to advertise. */}
        {coverage && (
          <p className="mt-2 text-xs text-muted-foreground">
            {marketCountLabel(coverage.operationalMarkets)} currently returning
            permits &middot; {coverage.cachedPermits.toLocaleString()} permits
            available now
          </p>
        )}
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
            7-day free trial &middot; card required &middot; cancel anytime
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
                { label: "Permit history", free: "90 days", paid: "90 days" },
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
          90 days of permit history &middot; {TRADE_COUNT_LABEL} &middot;{" "}
          Weekday source refresh
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
