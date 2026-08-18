/* Hallmark · genre: modern-minimal · footer: Ft2 · design-system: design.md · designed-as-app */

import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex max-w-7xl flex-col items-center gap-2 px-4 py-6 sm:flex-row sm:justify-between sm:px-6 lg:px-8">
        <Link
          href="/"
          className="font-heading text-sm font-semibold tracking-tight"
        >
          PermitPulse
        </Link>
        <p className="text-center text-xs text-muted-foreground sm:text-right">
          &copy; {new Date().getFullYear()} PermitPulse. Permit data from
          municipal open-data portals.
        </p>
      </div>
    </footer>
  );
}
