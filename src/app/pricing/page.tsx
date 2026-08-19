/* Hallmark · genre: modern-minimal · macrostructure: Stat-Led · design-system: design.md · designed-as-app */
"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowRight, Loader2 } from "lucide-react";
import { PRICING_PLANS } from "@/lib/types";
import { useAuth } from "@/lib/auth-context";

const PLAN_DIFFERENCES: { label: string; values: (string | boolean)[] }[] = [
  { label: "Metro areas", values: ["1", "1", "2"] },
  { label: "Trade filters", values: ["1", "3", "4"] },
  { label: "Contact enrichment", values: [false, true, true] },
  { label: "Priority support", values: [false, false, true] },
];

const SHARED_FEATURES = [
  "Full GC name, phone & email",
  "Full permit history",
  "Weekly email digest",
  "CSV export",
  "Unlimited saved leads",
];

export default function PricingPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

  async function handleCheckout(planId: string) {
    if (!user) {
      router.push(`/login?redirect=/pricing&plan=${planId}`);
      return;
    }
    setLoadingPlan(planId);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } finally {
      setLoadingPlan(null);
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
      <div className="mx-auto max-w-xl text-center">
        <h1 className="font-heading text-3xl font-semibold tracking-tight sm:text-4xl">
          Pricing
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          7-day free trial on all plans. No credit card required.
        </p>
      </div>

      <div className="mx-auto mt-10 grid max-w-4xl gap-4 lg:grid-cols-3">
        {PRICING_PLANS.map((plan) => {
          const isCurrentPlan = user?.plan === plan.id;
          const isLoading = loadingPlan === plan.id;

          return (
            <div
              key={plan.id}
              className={`relative overflow-visible rounded-lg border p-6 ${
                plan.highlighted
                  ? "border-primary ring-1 ring-primary/20"
                  : "border-border"
              }`}
            >
              {plan.highlighted && (
                <span className="absolute -top-2.5 left-4 rounded-full bg-primary px-2.5 py-0.5 text-[11px] font-medium text-primary-foreground">
                  Popular
                </span>
              )}

              <h3 className="font-heading text-base font-semibold tracking-tight">
                {plan.name}
              </h3>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {plan.description}
              </p>

              <div className="mt-4 flex items-baseline gap-1">
                <span className="font-heading text-3xl font-bold tracking-tight tabular-nums">
                  ${plan.price}
                </span>
                <span className="text-sm text-muted-foreground">/mo</span>
              </div>

              <p className="mt-1.5 text-xs text-muted-foreground tabular-nums">
                {plan.metros} metro{plan.metros > 1 ? "s" : ""} &middot;{" "}
                {plan.trades} trade{plan.trades > 1 ? "s" : ""}
              </p>

              <Button
                className="mt-5 w-full rounded-full"
                variant={plan.highlighted ? "default" : "outline"}
                size="sm"
                disabled={isCurrentPlan || isLoading}
                onClick={() => handleCheckout(plan.id)}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                    Redirecting&hellip;
                  </>
                ) : isCurrentPlan ? (
                  "Current Plan"
                ) : (
                  <>
                    Start Free Trial
                    <ArrowRight className="ml-1 h-3.5 w-3.5" />
                  </>
                )}
              </Button>
            </div>
          );
        })}
      </div>

      <div className="mx-auto mt-14 max-w-4xl">
        <h2 className="font-heading text-base font-semibold tracking-tight">
          What&rsquo;s different
        </h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="pb-2.5 pr-6 text-left text-xs font-normal text-muted-foreground" />
                {PRICING_PLANS.map((plan) => (
                  <th
                    key={plan.id}
                    className="w-[100px] pb-2.5 text-center text-xs font-medium"
                  >
                    {plan.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {PLAN_DIFFERENCES.map((row) => (
                <tr key={row.label} className="border-b border-border/50">
                  <td className="py-2.5 pr-6">{row.label}</td>
                  {row.values.map((val, i) => (
                    <td key={i} className="py-2.5 text-center">
                      {val === true ? (
                        <span className="text-foreground">{"✓"}</span>
                      ) : val === false ? (
                        <span className="text-muted-foreground/40">{"—"}</span>
                      ) : (
                        <span className="font-medium tabular-nums">{val}</span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="mt-6 text-xs text-muted-foreground">
          <span className="font-medium text-foreground">
            Every plan includes
          </span>{" "}
          {SHARED_FEATURES.join(" · ")}
        </p>
      </div>

      <div className="mx-auto mt-12 max-w-4xl border-t border-border pt-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="font-heading text-base font-semibold tracking-tight">
              Free Account
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Browse 30 days of permits, save up to 15 leads. GC contacts
              locked.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="shrink-0 rounded-full"
            nativeButton={false}
            render={<Link href="/login" />}
          >
            Sign Up Free
          </Button>
        </div>
      </div>

      <div className="mx-auto mt-14 max-w-4xl">
        <h2 className="font-heading text-base font-semibold tracking-tight">
          FAQ
        </h2>
        <div className="mt-5 divide-y divide-border">
          {[
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
              a: "Chicago, Austin, San Francisco, Seattle, and New York City. More coming soon.",
            },
          ].map((item) => (
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
