/* Hallmark · genre: modern-minimal · nav: N5 · design-system: design.md · designed-as-app */
"use client";

import Link from "next/link";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Sheet, SheetTrigger, SheetContent } from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Menu, User, LogOut, LayoutDashboard } from "lucide-react";
import { useAuth } from "@/lib/auth-context";

const NAV_LINKS = [
  { href: "/permits", label: "Browse" },
  { href: "/pricing", label: "Pricing" },
  { href: "/blog", label: "Blog" },
];

export function Header() {
  const [open, setOpen] = useState(false);
  const { user, signOut } = useAuth();
  const pathname = usePathname();

  return (
    <header className="fixed inset-x-0 top-0 z-50 flex justify-center px-4 pt-3 sm:pt-4">
      <nav className="inline-flex items-center gap-3 rounded-full border border-border bg-background/78 px-3 py-1.5 shadow-[0_8px_24px_-12px_oklch(0%_0_0_/_0.15)] backdrop-blur-xl sm:gap-4 sm:px-4 sm:py-2">
        <Link
          href="/"
          className="font-heading text-sm font-semibold tracking-tight sm:text-base"
        >
          PermitPulse
        </Link>

        <div className="hidden items-center gap-3 md:flex">
          {NAV_LINKS.map((link) => {
            const isActive = pathname === link.href || pathname.startsWith(link.href + "/");
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={isActive ? "page" : undefined}
                className={`text-sm transition-colors duration-200 ${
                  isActive
                    ? "font-medium text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </div>

        <div className="hidden items-center gap-2 md:flex">
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger className="flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-xs font-medium transition-colors duration-200 hover:bg-muted">
                <User className="h-3.5 w-3.5" />
                <span className="max-w-[100px] truncate">{user.email}</span>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuItem>
                  <Link href="/dashboard" className="flex w-full items-center gap-2">
                    <LayoutDashboard className="h-3.5 w-3.5" />
                    Dashboard
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => signOut()} className="text-destructive">
                  <LogOut className="mr-2 h-3.5 w-3.5" />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <>
              <Link
                href="/login"
                className="text-sm text-muted-foreground transition-colors duration-200 hover:text-foreground"
              >
                Log in
              </Link>
              <Link
                href="/pricing"
                className="rounded-full bg-primary px-3.5 py-1.5 text-xs font-medium text-primary-foreground transition-colors duration-200 hover:bg-primary/90"
              >
                Start Trial
              </Link>
            </>
          )}
        </div>

        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger render={<button className="rounded-full p-1.5 text-muted-foreground transition-colors duration-200 hover:bg-muted hover:text-foreground md:hidden" />}>
            <Menu className="h-4 w-4" />
          </SheetTrigger>
          <SheetContent side="right" className="w-64">
            <nav className="mt-8 flex flex-col gap-4">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className="font-heading text-lg font-medium text-foreground"
                >
                  {link.label}
                </Link>
              ))}
              {user ? (
                <div className="mt-4 flex flex-col gap-2 border-t border-border pt-4">
                  <Link
                    href="/dashboard"
                    onClick={() => setOpen(false)}
                    className="text-sm text-muted-foreground hover:text-foreground"
                  >
                    Dashboard
                  </Link>
                  <button
                    onClick={() => { signOut(); setOpen(false); }}
                    className="text-left text-sm text-destructive hover:text-destructive/80"
                  >
                    Log out
                  </button>
                </div>
              ) : (
                <div className="mt-4 flex flex-col gap-2 border-t border-border pt-4">
                  <Link
                    href="/login"
                    onClick={() => setOpen(false)}
                    className="text-sm text-muted-foreground hover:text-foreground"
                  >
                    Log in
                  </Link>
                  <Link
                    href="/pricing"
                    onClick={() => setOpen(false)}
                    className="inline-flex w-full items-center justify-center rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
                  >
                    Start Trial
                  </Link>
                </div>
              )}
            </nav>
          </SheetContent>
        </Sheet>
      </nav>
    </header>
  );
}
