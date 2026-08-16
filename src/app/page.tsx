import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PermitCard } from "@/components/permit-card";
import { MOCK_PERMITS } from "@/lib/mock-data";
import {
  ArrowRight,
  Zap,
  Search,
  Phone,
  TrendingUp,
  Building2,
  Shield,
  Clock,
} from "lucide-react";

export default function HomePage() {
  const recentPermits = MOCK_PERMITS.slice(0, 6);
  const totalValue = MOCK_PERMITS.reduce((sum, p) => sum + p.estimatedValue, 0);

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden border-b bg-gradient-to-b from-amber-50/50 to-background dark:from-amber-950/20">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <Badge variant="secondary" className="mb-4 text-sm">
              <Zap className="mr-1 h-3 w-3 text-amber-500" />
              Now tracking Chicago, IL
            </Badge>

            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
              Find commercial work{" "}
              <span className="text-amber-600 dark:text-amber-400">
                before anyone else
              </span>
            </h1>

            <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
              PermitPulse turns newly filed commercial building permits into
              trade-filtered leads with GC contact info. Reach decision-makers
              weeks before bid boards open.
            </p>

            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <Button size="lg" render={<Link href="/permits" />}>
                  Browse Permits Free
                  <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Button size="lg" variant="outline" render={<Link href="/pricing" />}>
                Start 7-Day Free Trial
              </Button>
            </div>

            <p className="mt-4 text-xs text-muted-foreground">
              No credit card required to browse. Start a free trial to unlock GC contacts.
            </p>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="border-b">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[
              {
                label: "Active Permits",
                value: MOCK_PERMITS.length.toString(),
                icon: Building2,
              },
              {
                label: "Total Project Value",
                value: `$${(totalValue / 1_000_000).toFixed(0)}M+`,
                icon: TrendingUp,
              },
              { label: "Trade Categories", value: "10", icon: Search },
              { label: "Updated", value: "Daily", icon: Clock },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <stat.icon className="mx-auto mb-2 h-5 w-5 text-muted-foreground" />
                <div className="text-2xl font-bold">{stat.value}</div>
                <div className="text-xs text-muted-foreground">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Recent Permits */}
      <section className="py-12 sm:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-end justify-between">
            <div>
              <h2 className="text-2xl font-bold">Recent Commercial Permits</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Latest filings from Chicago, IL
              </p>
            </div>
            <Button variant="ghost" size="sm" render={<Link href="/permits" />}>
                View all
                <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {recentPermits.map((permit) => (
              <PermitCard key={permit.id} permit={permit} />
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="border-t bg-muted/30 py-12 sm:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-center text-2xl font-bold">
            How PermitPulse Works
          </h2>
          <p className="mx-auto mt-2 max-w-xl text-center text-sm text-muted-foreground">
            Get ahead of the competition in three simple steps
          </p>

          <div className="mt-10 grid gap-8 sm:grid-cols-3">
            {[
              {
                step: "1",
                icon: Search,
                title: "Browse & Filter",
                description:
                  "See new commercial permits filed in your city. Filter by trade, project value, and keywords to find relevant work.",
              },
              {
                step: "2",
                icon: Phone,
                title: "Unlock GC Contacts",
                description:
                  "Get the General Contractor's name, phone number, and email. Our enrichment engine finds the right decision-maker.",
              },
              {
                step: "3",
                icon: TrendingUp,
                title: "Win More Work",
                description:
                  "Reach out to GCs weeks before projects hit public bid boards. Build relationships early and win more bids.",
              },
            ].map((item) => (
              <div key={item.step} className="text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30">
                  <item.icon className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                </div>
                <h3 className="mt-4 text-base font-semibold">{item.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t py-12 sm:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-2xl bg-gradient-to-r from-amber-600 to-orange-600 px-6 py-10 text-center text-white sm:px-12 sm:py-14">
            <Shield className="mx-auto mb-4 h-8 w-8 opacity-80" />
            <h2 className="text-2xl font-bold sm:text-3xl">
              Stop missing commercial projects
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-amber-100">
              Join specialty contractors who are finding and winning work before
              it hits the bid boards. 7-day free trial, no credit card required.
            </p>
            <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
              <Button
                size="lg"
                variant="secondary"
                className="bg-white text-amber-700 hover:bg-amber-50"
                render={<Link href="/pricing" />}
              >
                  Start Free Trial
                  <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-white/30 text-white hover:bg-white/10"
                render={<Link href="/permits" />}
              >
                Browse Permits
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
