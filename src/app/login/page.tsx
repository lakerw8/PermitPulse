"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowRight, Check, Mail, AlertCircle, Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth-context";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { user, signIn } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (user) router.replace("/dashboard");
  }, [user, router]);

  useEffect(() => {
    if (searchParams.get("error") === "auth") {
      setError("Sign-in link expired or was already used. Please try again.");
    }
  }, [searchParams]);

  if (user) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;

    setLoading(true);
    setError(null);
    const { error: signInError } = await signIn(email);
    setLoading(false);

    if (signInError) {
      setError(signInError);
    } else {
      setSent(true);
    }
  }

  if (sent) {
    return (
      <div className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Mail className="h-6 w-6 text-primary" />
          </div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight">Check your email</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            We sent a sign-in link to <strong className="text-foreground">{email}</strong>.
            Click the link in the email to sign in.
          </p>
          <button
            onClick={() => { setSent(false); setEmail(""); }}
            className="mt-6 text-sm text-primary transition-colors duration-200 hover:text-primary/80"
          >
            Use a different email
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="font-heading text-2xl font-semibold tracking-tight">Sign in to PermitPulse</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Enter your email to receive a sign-in link
          </p>
        </div>

        {error && (
          <div className="mb-4 flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

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
              disabled={loading}
            />
          </div>
          <Button type="submit" className="w-full rounded-full" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                Sending link...
              </>
            ) : (
              <>
                Sign In
                <ArrowRight className="ml-1 h-4 w-4" />
              </>
            )}
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
