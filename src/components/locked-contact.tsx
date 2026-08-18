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

interface LockedContactProps {
  contact: GCContact;
  isUnlocked?: boolean;
}

export function LockedContact({ contact, isUnlocked = false }: LockedContactProps) {
  if (isUnlocked) {
    return (
      <Card className="gap-0 border-green-200 bg-green-50/50 py-0 dark:border-green-800 dark:bg-green-950/20">
        <CardContent className="p-4 sm:p-5">
          <div className="mb-3 flex items-center gap-2">
            <Building2 className="h-4 w-4 text-green-600 dark:text-green-400" />
            <h3 className="text-sm font-semibold">General Contractor</h3>
            <Badge
              variant="outline"
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
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="gap-0 border-border bg-muted/30 py-0">
      <CardContent className="p-4 sm:p-5">
        <div className="mb-3 flex items-center gap-2">
          <Lock className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold">General Contractor Contact</h3>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-sm">
              <span className="blur-[5px] select-none" aria-hidden>
                {contact.companyName}
              </span>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <User className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-sm blur-[5px] select-none" aria-hidden>
              John Smith
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Phone className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-sm blur-[5px] select-none" aria-hidden>
              (312) 555-0000
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Mail className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-sm blur-[5px] select-none" aria-hidden>
              contact@company.com
            </span>
          </div>
        </div>

        <div className="mt-4 rounded-lg border border-border bg-background p-3">
          <p className="text-sm font-medium">
            Unlock GC contact details to reach out before your competitors
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Get the company name, contact person, phone, and email with a paid plan.
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
      </CardContent>
    </Card>
  );
}
