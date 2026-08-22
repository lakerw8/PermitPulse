import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "Browse commercial building permits for free. Unlock GC contacts for $79/mo. 7-day free trial, cancel any time.",
  openGraph: {
    title: "Pricing | PermitPulse",
    description:
      "Browse commercial building permits for free. Unlock GC contacts for $79/mo. 7-day free trial, cancel any time.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Pricing | PermitPulse",
    description:
      "Browse permits free. Unlock GC contacts for $79/mo. 7-day free trial.",
  },
};

export default function PricingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
