"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowRight, Check } from "lucide-react";
import { useAuth } from "@/lib/auth-context";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const { user, login } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user) router.replace("/dashboard");
  }, [user, router]);

  if (user) return null;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (email) {
      login(email);
      router.push("/dashboard");
    }
  }

  return (
    <div className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="font-heading text-2xl font-semibold tracking-tight">Sign in to PermitPulse</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Enter your email to sign in instantly (local demo)
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="email">Email address</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="mt-1.5"
              autoFocus
            />
          </div>
          <Button type="submit" className="w-full rounded-full">
            Sign In
            <ArrowRight className="ml-1 h-4 w-4" />
          </Button>
        </form>

        <div className="mt-8 rounded-lg border bg-muted/30 p-4">
          <h3 className="text-xs font-semibold">Free account includes:</h3>
          <ul className="mt-2 space-y-1.5">
            {[
              "Browse 30 days of permits",
              "Save up to 15 leads",
              "Add notes to saved leads",
            ].map((f) => (
              <li key={f} className="flex items-center gap-2 text-xs text-muted-foreground">
                <Check className="h-3 w-3 text-primary" />
                {f}
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-muted-foreground">
            Want full GC contacts?{" "}
            <Link
              href="/pricing"
              className="font-medium text-primary transition-colors duration-200 hover:text-primary/80"
            >
              View paid plans
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
