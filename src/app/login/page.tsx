"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Zap, Mail, ArrowRight, Check } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (email) {
      setSubmitted(true);
    }
  }

  return (
    <div className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30">
            <Zap className="h-6 w-6 text-amber-600 dark:text-amber-400" />
          </div>
          <h1 className="text-2xl font-bold">
            {submitted ? "Check your email" : "Sign in to PermitPulse"}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {submitted
              ? `We sent a magic link to ${email}`
              : "Enter your email for a passwordless magic link"}
          </p>
        </div>

        {submitted ? (
          <Card className="gap-0 py-0">
            <CardContent className="p-6 text-center">
              <Mail className="mx-auto mb-4 h-10 w-10 text-amber-500" />
              <p className="text-sm">
                Click the link in your email to sign in. The link expires in 10
                minutes.
              </p>
              <Button
                variant="ghost"
                size="sm"
                className="mt-4"
                onClick={() => setSubmitted(false)}
              >
                Try a different email
              </Button>
            </CardContent>
          </Card>
        ) : (
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
            <Button type="submit" className="w-full">
              Send Magic Link
              <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          </form>
        )}

        <div className="mt-8 rounded-lg border bg-muted/30 p-4">
          <h3 className="text-xs font-semibold">Free account includes:</h3>
          <ul className="mt-2 space-y-1.5">
            {[
              "Browse 14 days of permits",
              "Save up to 15 leads",
              "Weekly email digest",
            ].map((f) => (
              <li key={f} className="flex items-center gap-2 text-xs text-muted-foreground">
                <Check className="h-3 w-3 text-green-600 dark:text-green-400" />
                {f}
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-muted-foreground">
            Want full GC contacts?{" "}
            <Link
              href="/pricing"
              className="font-medium text-amber-600 hover:text-amber-700 dark:text-amber-400"
            >
              View paid plans
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
