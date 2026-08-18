import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Browse Commercial Building Permits",
  description:
    "Search and filter newly filed commercial building permits by trade, city, and project value. Find HVAC, electrical, plumbing, and roofing leads before bid boards open.",
  openGraph: {
    title: "Browse Commercial Building Permits | PermitPulse",
    description:
      "Search and filter newly filed commercial building permits by trade, city, and project value. Find HVAC, electrical, plumbing, and roofing leads before bid boards open.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Browse Commercial Building Permits | PermitPulse",
    description:
      "Search and filter newly filed commercial building permits by trade, city, and project value.",
  },
};

export default function PermitsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
