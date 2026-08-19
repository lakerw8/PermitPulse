import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "Simple, transparent pricing for PermitPulse. Get commercial building permit leads with GC contact details starting at $199/mo. 7-day free trial, no credit card required.",
  openGraph: {
    title: "Pricing | PermitPulse",
    description:
      "Simple, transparent pricing for PermitPulse. Get commercial building permit leads with GC contact details starting at $199/mo. 7-day free trial, no credit card required.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Pricing | PermitPulse",
    description:
      "Get commercial building permit leads with GC contacts starting at $199/mo. 7-day free trial.",
  },
};

export default function PricingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
