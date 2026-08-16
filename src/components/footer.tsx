import Link from "next/link";
import { Zap } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t bg-muted/30">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <Link href="/" className="flex items-center gap-2 font-bold text-lg">
              <Zap className="h-5 w-5 text-amber-500" />
              <span>PermitPulse</span>
            </Link>
            <p className="mt-3 text-sm text-muted-foreground">
              Commercial building permits turned into actionable leads. Reach GCs before anyone else.
            </p>
          </div>

          <div>
            <h3 className="text-sm font-semibold">Product</h3>
            <ul className="mt-3 space-y-2">
              <li>
                <Link href="/permits" className="text-sm text-muted-foreground hover:text-foreground">
                  Browse Permits
                </Link>
              </li>
              <li>
                <Link href="/pricing" className="text-sm text-muted-foreground hover:text-foreground">
                  Pricing
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold">Coverage</h3>
            <ul className="mt-3 space-y-2">
              <li className="text-sm text-muted-foreground">Chicago, IL</li>
              <li className="text-sm text-muted-foreground opacity-50">
                More cities coming soon
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold">Legal</h3>
            <ul className="mt-3 space-y-2">
              <li>
                <span className="text-sm text-muted-foreground">
                  Privacy Policy
                </span>
              </li>
              <li>
                <span className="text-sm text-muted-foreground">
                  Terms of Service
                </span>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 border-t pt-8 text-center text-sm text-muted-foreground">
          &copy; {new Date().getFullYear()} PermitPulse. All rights reserved. Permit
          data sourced from official municipal open data portals.
        </div>
      </div>
    </footer>
  );
}
