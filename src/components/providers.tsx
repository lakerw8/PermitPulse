"use client";

import type { ReactNode } from "react";
import { AuthProvider } from "@/lib/auth-context";
import { LeadsProvider } from "@/lib/leads-context";
import { PermitsProvider } from "@/lib/permits-context";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <PermitsProvider>
        <LeadsProvider>{children}</LeadsProvider>
      </PermitsProvider>
    </AuthProvider>
  );
}
