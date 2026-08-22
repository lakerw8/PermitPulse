"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowRight, Check, Mail, AlertCircle, Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth-context";

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1Z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23Z" fill="#34A853" />
      <path d="M5.84 14.09A6.97 6.97 0 0 1 5.47 12c0-.72.12-1.42.35-2.09V7.07H2.18A11.96 11.96 0 0 0 .96 12c0 1.94.46 3.77 1.22 5.33l3.66-3.24Z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53Z" fill="#EA4335" />
    </svg>
  );
}

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { user, signIn, signInWithGoogle } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (user) router.replace("/dashboard");
  }, [user, router]);

  // Derived, not assigned: this message is a function of the URL, so copying
  // it into state in an effect only bought a second render and a stale value
  // to clear.
  const linkError =
    searchParams.get("error") === "auth"
      ? "Sign-in link expired or was already used. Please try again."
      : null;
  // A failure from this session wins over the one the link arrived with.
  const shownError = error ?? linkError;

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

  async function handleGoogle() {
    setError(null);
    const { error: googleError } = await signInWithGoogle();
    if (googleError) {
      setError(googleError);
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
            Sign in to save leads and manage your account
          </p>
        </div>

        {shownError && (
          <div className="mb-4 flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{shownError}</span>
          </div>
        )}

        <Button
          type="button"
          variant="outline"
          className="w-full rounded-full"
          onClick={handleGoogle}
        >
          <GoogleIcon className="mr-2 h-4 w-4" />
          Continue with Google
        </Button>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="bg-background px-3 text-muted-foreground">or sign in with email</span>
          </div>
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
                Sign In with Email
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
              "Save up to 5 leads",
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
