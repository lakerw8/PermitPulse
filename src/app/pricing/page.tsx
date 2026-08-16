import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, ArrowRight, Zap } from "lucide-react";
import { PRICING_PLANS } from "@/lib/types";

export default function PricingPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
      <div className="mx-auto max-w-2xl text-center">
        <Badge variant="secondary" className="mb-4">
          <Zap className="mr-1 h-3 w-3 text-amber-500" />
          7-day free trial on all plans
        </Badge>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Simple, transparent pricing
        </h1>
        <p className="mt-4 text-muted-foreground">
          Choose the plan that matches your business. All plans include a 7-day
          full-access trial — no credit card required.
        </p>
      </div>

      {/* Plans */}
      <div className="mx-auto mt-12 grid max-w-5xl gap-6 lg:grid-cols-3">
        {PRICING_PLANS.map((plan) => (
          <Card
            key={plan.id}
            className={`relative gap-0 py-0 ${
              plan.highlighted
                ? "border-amber-400 shadow-lg ring-1 ring-amber-400/50 dark:border-amber-600 dark:ring-amber-600/30"
                : ""
            }`}
          >
            {plan.highlighted && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <Badge className="bg-amber-500 text-white hover:bg-amber-500">
                  Most Popular
                </Badge>
              </div>
            )}
            <CardContent className="flex flex-col p-6">
              <h3 className="text-lg font-semibold">{plan.name}</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {plan.description}
              </p>

              <div className="mt-4 flex items-baseline gap-1">
                <span className="text-4xl font-bold">${plan.price}</span>
                <span className="text-muted-foreground">/mo</span>
              </div>

              <div className="mt-1 text-xs text-muted-foreground">
                {plan.metros} metro{plan.metros > 1 ? "s" : ""} &middot;{" "}
                {plan.trades} trade{plan.trades > 1 ? "s" : ""}
              </div>

              <Button
                className={`mt-6 ${
                  plan.highlighted
                    ? "bg-amber-600 hover:bg-amber-700"
                    : ""
                }`}
                variant={plan.highlighted ? "default" : "outline"}
                nativeButton={false}
                render={<Link href="/login" />}
              >
                  Start Free Trial
                  <ArrowRight className="ml-1 h-4 w-4" />
              </Button>

              <ul className="mt-6 space-y-2.5">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2 text-sm">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-green-600 dark:text-green-400" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Free tier */}
      <div className="mx-auto mt-12 max-w-3xl rounded-xl border bg-muted/30 p-6 sm:p-8">
        <div className="flex flex-col items-center text-center sm:flex-row sm:items-start sm:text-left">
          <div className="flex-1">
            <h3 className="text-lg font-semibold">Free Account</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Create a free account to save up to 15 leads, add notes, and get a
              weekly digest. GC contact details are locked — upgrade anytime to
              unlock them.
            </p>
            <ul className="mt-4 grid gap-1.5 text-sm sm:grid-cols-2">
              {[
                "Browse last 14 days of permits",
                "Save up to 15 leads",
                "Add private notes",
                "Weekly email digest (1 metro + 1 trade)",
                "Basic filters",
                "Map view",
              ].map((f) => (
                <li key={f} className="flex items-center gap-2">
                  <Check className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
                  {f}
                </li>
              ))}
            </ul>
          </div>
          <div className="mt-6 sm:ml-8 sm:mt-0">
            <div className="text-3xl font-bold">$0</div>
            <div className="text-xs text-muted-foreground">Forever free</div>
            <Button variant="outline" size="sm" className="mt-3" nativeButton={false} render={<Link href="/login" />}>
              Create Free Account
            </Button>
          </div>
        </div>
      </div>

      {/* FAQ */}
      <div className="mx-auto mt-16 max-w-2xl">
        <h2 className="text-center text-xl font-bold">
          Frequently Asked Questions
        </h2>
        <div className="mt-8 space-y-6">
          {[
            {
              q: "What data sources do you use?",
              a: "We pull from official municipal open data portals (like data.cityofchicago.org) that publish building permits in machine-readable formats. These are public records updated daily.",
            },
            {
              q: "How accurate is the GC contact information?",
              a: "Each contact includes a confidence indicator (High, Medium, or Low). We extract names from permit records and enrich with public business data. We never invent contacts.",
            },
            {
              q: "Can I cancel anytime?",
              a: "Yes. There are no long-term contracts. Cancel from your account dashboard and you'll retain access through the end of your billing period.",
            },
            {
              q: "How fresh is the permit data?",
              a: "New permits appear in PermitPulse within 24-48 hours of being published on the city's open data portal. We check for updates daily.",
            },
            {
              q: "What cities do you cover?",
              a: "We currently cover Chicago, Austin, San Francisco, Seattle, and New York City — all sourced from official municipal open data portals. More cities coming soon.",
            },
          ].map((item) => (
            <div key={item.q}>
              <h3 className="text-sm font-semibold">{item.q}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{item.a}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
