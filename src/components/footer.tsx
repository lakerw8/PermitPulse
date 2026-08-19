/* Hallmark · genre: modern-minimal · footer: Ft2 · design-system: design.md · designed-as-app */

import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex max-w-7xl flex-col items-center gap-3 px-4 py-6 sm:flex-row sm:justify-between sm:px-6 lg:px-8">
        <Link
          href="/"
          className="font-heading text-sm font-semibold tracking-tight"
        >
          PermitPulse
        </Link>
        <div className="flex flex-col items-center gap-1.5 sm:items-end">
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <Link href="/privacy" className="transition-colors duration-200 hover:text-foreground">Privacy</Link>
            <Link href="/terms" className="transition-colors duration-200 hover:text-foreground">Terms</Link>
          </div>
          <p className="text-center text-xs text-muted-foreground sm:text-right">
            &copy; {new Date().getFullYear()} PermitPulse. Permit data from
            municipal open-data portals.
          </p>
        </div>
      </div>
    </footer>
  );
}
