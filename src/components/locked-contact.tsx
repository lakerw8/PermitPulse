import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Lock,
  Phone,
  Mail,
  Building2,
  User,
  ShieldCheck,
  ArrowRight,
} from "lucide-react";
import { GCContact } from "@/lib/types";
import {
  CONFIDENCE_DEFINITIONS,
  CONFIDENCE_DISCLAIMER,
} from "@/lib/contact-confidence";

interface LockedContactProps {
  contact: GCContact;
}

/**
 * Renders whichever state the server put in the payload.
 *
 * There is deliberately no `isUnlocked` prop any more. The API decides what a
 * viewer receives; if `locked` is set, the values are simply not here to show.
 * A component-level flag could only ever disagree with the data.
 */
export function LockedContact({ contact }: LockedContactProps) {
  if (!contact.locked) {
    return (
      <Card className="gap-0 border-green-200 bg-green-50/50 py-0 dark:border-green-800 dark:bg-green-950/20">
        <CardContent className="p-4 sm:p-5">
          <div className="mb-3 flex items-center gap-2">
            <Building2 className="h-4 w-4 text-green-600 dark:text-green-400" />
            <h3 className="text-sm font-semibold">General Contractor</h3>
            <Badge
              variant="outline"
              title={CONFIDENCE_DEFINITIONS[contact.confidence].detail}
              className="ml-auto border-green-300 text-green-700 dark:border-green-700 dark:text-green-400 text-xs"
            >
              <ShieldCheck className="mr-1 h-3 w-3" />
              {contact.confidence} confidence
            </Badge>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-sm font-medium">{contact.companyName}</span>
            </div>
            {contact.contactName && (
              <div className="flex items-center gap-2">
                <User className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-sm">{contact.contactName}</span>
              </div>
            )}
            {contact.phone && (
              <div className="flex items-center gap-2">
                <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-sm">{contact.phone}</span>
              </div>
            )}
            {contact.email && (
              <div className="flex items-center gap-2">
                <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-sm">{contact.email}</span>
              </div>
            )}
          </div>

          {/* Says what the badge means. A "High confidence" label with no
              explanation reads as "we checked this", and nothing in the
              pipeline checks anything. */}
          <p className="mt-3 border-t border-green-200 pt-2.5 text-xs leading-relaxed text-muted-foreground dark:border-green-900">
            {CONFIDENCE_DEFINITIONS[contact.confidence].detail}{" "}
            {CONFIDENCE_DISCLAIMER}
          </p>
        </CardContent>
      </Card>
    );
  }

  // The server sends no contact values to an unentitled viewer, only which
  // fields exist. Say that plainly instead of blurring an invented phone
  // number: a prospect deciding whether to pay should know whether this
  // permit actually carries a phone, and a permit with no GC on record should
  // not look like one that does.
  const available = contact.available;
  const present: string[] = [];
  if (available?.companyName) present.push("company name");
  if (available?.contactName) present.push("contact name");
  if (available?.phone) present.push("phone");
  if (available?.email) present.push("email");

  return (
    <Card className="gap-0 border-border bg-muted/30 py-0">
      <CardContent className="p-4 sm:p-5">
        <div className="mb-3 flex items-center gap-2">
          <Lock className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold">General Contractor Contact</h3>
          <Badge
            variant="outline"
            title={CONFIDENCE_DEFINITIONS[contact.confidence].detail}
            className="ml-auto text-xs"
          >
            {contact.confidence} confidence
          </Badge>
        </div>

        {present.length > 0 ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                {available?.companyName
                  ? "General contractor named on this permit"
                  : "No company name on this permit"}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Phone className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                {available?.phone
                  ? "Phone number on file"
                  : "No phone number on file"}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Mail className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                {available?.email
                  ? "Email address on file"
                  : "No email address on file"}
              </span>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            This permit record does not name a general contractor. Unlocking
            will not reveal contact details for it.
          </p>
        )}

        {present.length > 0 && (
          <div className="mt-4 rounded-lg border border-border bg-background p-3">
            <p className="text-sm font-medium">
              Unlock the {formatList(present)} for this permit
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Paid plans reveal every contact detail we hold, on every permit.
              {" "}
              {CONFIDENCE_DISCLAIMER}
            </p>
            <div className="mt-3 flex gap-2">
              <Button size="sm" nativeButton={false} render={<Link href="/pricing" />}>
                Start 7-Day Free Trial
                <ArrowRight className="ml-1 h-3.5 w-3.5" />
              </Button>
              <Button variant="outline" size="sm" nativeButton={false} render={<Link href="/pricing" />}>
                View Plans
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/** "company name, phone and email" */
function formatList(items: string[]): string {
  if (items.length === 1) return items[0];
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}
